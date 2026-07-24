/**
 * Video processing utilities that apply edits to video/frames
 * This bridges the gap between editing tools and actual video manipulation
 */

import type { Frame } from '../types';

export interface ProcessedVideo {
  frames?: Frame[];
  videoUrl?: string;
  metadata: {
    duration: number;
    startTime: number;
    endTime: number;
    appliedEdits: string[];
  };
}

/**
 * Apply text overlay to KEY FRAMES ONLY using Gemini's editFrame
 */
export async function applyTextOverlay(
  frames: Frame[],
  text: string,
  position: { x: number; y: number },
  startTime: number,
  duration: number,
  fps: number = 10,
  editFrameFn: (frame: Frame, prompt: string, prev?: Frame | null, next?: Frame | null) => Promise<string>
): Promise<Frame[]> {
  const startFrame = Math.floor(startTime * fps);
  const endFrame = Math.floor((startTime + duration) * fps);
  
  const editedFrames = [...frames];
  
  // ONLY edit key frames - first, middle, and last frame of the range
  const keyFrames = [
    startFrame, // First frame
    Math.floor((startFrame + endFrame) / 2), // Middle frame
    Math.min(endFrame, frames.length - 1) // Last frame
  ].filter((f, i, arr) => arr.indexOf(f) === i && f < frames.length); // Remove duplicates and out of bounds
  
  console.log(`Text overlay: Editing ${keyFrames.length} key frames instead of ${endFrame - startFrame + 1} frames`);
  
  for (const frameIndex of keyFrames) {
    try {
      const prompt = `Add text overlay "${text}" at position ${position.x}%, ${position.y}% from top-left. Make it clearly visible with good contrast.`;
      const prevFrame = frameIndex > 0 ? frames[frameIndex - 1] : null;
      const nextFrame = frameIndex < frames.length - 1 ? frames[frameIndex + 1] : null;
      
      console.log(`Editing frame ${frameIndex} with text overlay...`);
      const editedData = await editFrameFn(frames[frameIndex], prompt, prevFrame, nextFrame);
      editedFrames[frameIndex] = {
        ...frames[frameIndex],
        data: editedData
      };
    } catch (error) {
      console.error(`Error editing frame ${frameIndex}:`, error);
    }
  }
  
  return editedFrames;
}

/**
 * Apply speed change to video segment
 */
export async function applySpeedChange(
  frames: Frame[],
  startTime: number,
  endTime: number,
  speedMultiplier: number,
  fps: number = 10
): Promise<Frame[]> {
  const startFrame = Math.floor(startTime * fps);
  const endFrame = Math.floor(endTime * fps);
  
  if (speedMultiplier === 1) return frames;
  
  const result: Frame[] = [];
  
  for (let i = 0; i < frames.length; i++) {
    if (i >= startFrame && i <= endFrame) {
      // Speed up: skip frames
      if (speedMultiplier > 1) {
        if (i % Math.floor(speedMultiplier) === 0) {
          result.push(frames[i]);
        }
      }
      // Slow down: duplicate frames
      else {
        result.push(frames[i]);
        const duplicates = Math.floor(1 / speedMultiplier) - 1;
        for (let j = 0; j < duplicates; j++) {
          result.push({ ...frames[i], id: frames[i].id + (j + 1) * 0.1 });
        }
      }
    } else {
      result.push(frames[i]);
    }
  }
  
  // Re-index frames
  return result.map((frame, index) => ({ ...frame, id: index }));
}

/**
 * Apply trim to frames with bounds validation
 */
export async function applyTrim(
  frames: Frame[],
  startTime: number,
  endTime: number,
  fps: number = 10
): Promise<Frame[]> {
  // Validate inputs
  if (!startTime && startTime !== 0) {
    console.warn('Trim: Invalid startTime, using 0');
    startTime = 0;
  }
  
  const maxTime = frames.length / fps;
  if (!endTime || endTime > maxTime) {
    console.warn(`Trim: Invalid endTime (${endTime}), using max duration (${maxTime})`);
    endTime = maxTime;
  }
  
  if (startTime >= endTime) {
    console.warn(`Trim: startTime (${startTime}) >= endTime (${endTime}), returning original frames`);
    return frames;
  }
  
  const startFrame = Math.max(0, Math.floor(startTime * fps));
  const endFrame = Math.min(frames.length - 1, Math.floor(endTime * fps));
  
  console.log(`Trimming: ${startTime}s-${endTime}s (frames ${startFrame}-${endFrame} of ${frames.length})`);
  
  return frames
    .filter((_, index) => index >= startFrame && index <= endFrame)
    .map((frame, index) => ({ ...frame, id: index }));
}

/**
 * Main processor that applies all edits using Nano Banana
 */
export async function processVideoWithEdits(
  frames: Frame[],
  actions: Array<{ tool: string; params: any }>,
  fps: number = 10,
  editFrameFn: (frame: Frame, prompt: string, prev?: Frame | null, next?: Frame | null) => Promise<string>
): Promise<ProcessedVideo> {
  let processedFrames = [...frames];
  const appliedEdits: string[] = [];
  const videoDuration = frames.length / fps;
  
  console.log(`Processing video with ${frames.length} frames (${videoDuration}s) at ${fps}fps`);
  
  for (const action of actions) {
    try {
      // Skip if we have no frames left to process
      if (processedFrames.length === 0) {
        console.warn(`Skipping ${action.tool} - no frames to process`);
        continue;
      }
      
      switch (action.tool) {
        case 'trim':
          const trimResult = await applyTrim(
            processedFrames,
            action.params.startTime,
            action.params.endTime,
            fps
          );
          if (trimResult.length > 0) {
            processedFrames = trimResult;
            appliedEdits.push(`Trimmed to ${action.params.startTime?.toFixed(1)}-${action.params.endTime?.toFixed(1)}s`);
          } else {
            console.warn('Trim resulted in 0 frames, keeping original');
          }
          break;
          
        case 'textOverlay':
          // Adjust times relative to current frames
          const overlayStartTime = Math.min(action.params.startTime || 0, processedFrames.length / fps - 0.1);
          const overlayDuration = Math.min(action.params.duration || 2, processedFrames.length / fps - overlayStartTime);
          
          processedFrames = await applyTextOverlay(
            processedFrames,
            action.params.text,
            action.params.position || { x: 50, y: 50 },
            overlayStartTime,
            overlayDuration,
            fps,
            editFrameFn
          );
          appliedEdits.push(`Added text: "${action.params.text}"`);
          break;
          
        case 'speed':
          // Validate speed change times
          const speedStartTime = Math.min(action.params.startTime || 0, processedFrames.length / fps - 0.1);
          const speedEndTime = Math.min(action.params.endTime || processedFrames.length / fps, processedFrames.length / fps);
          
          if (speedStartTime < speedEndTime) {
            processedFrames = await applySpeedChange(
              processedFrames,
              speedStartTime,
              speedEndTime,
              action.params.speedMultiplier,
              fps
            );
            appliedEdits.push(`Speed ${action.params.speedMultiplier}x at ${speedStartTime.toFixed(1)}-${speedEndTime.toFixed(1)}s`);
          }
          break;
          
        case 'effects':
        case 'colorGrading':
          // Use Nano Banana for visual effects ON KEY FRAMES ONLY
          const effectPrompt = action.tool === 'effects' 
            ? `Apply ${action.params.effect} effect`
            : `Apply ${action.params.preset} color grading with ${action.params.intensity} intensity`;
          
          // Only apply to key frames: first, 1/4, middle, 3/4, and last
          const totalFrames = processedFrames.length;
          const keyFrameIndices = [
            0,
            Math.floor(totalFrames * 0.25),
            Math.floor(totalFrames * 0.5),
            Math.floor(totalFrames * 0.75),
            totalFrames - 1
          ].filter((f, i, arr) => arr.indexOf(f) === i && f >= 0 && f < totalFrames);
          
          console.log(`${action.tool}: Editing ${keyFrameIndices.length} key frames instead of ${totalFrames} frames`);
          
          for (const i of keyFrameIndices) {
            console.log(`Applying ${action.tool} to frame ${i}...`);
            const prevFrame = i > 0 ? processedFrames[i - 1] : null;
            const nextFrame = i < processedFrames.length - 1 ? processedFrames[i + 1] : null;
            const editedData = await editFrameFn(processedFrames[i], effectPrompt, prevFrame, nextFrame);
            processedFrames[i] = { ...processedFrames[i], data: editedData };
          }
          appliedEdits.push(`Applied ${action.tool} to ${keyFrameIndices.length} key frames: ${effectPrompt}`);
          break;
          
        case 'audio':
        case 'cropZoom':
        case 'transition':
          // These require video-level processing, not frame editing
          appliedEdits.push(`Noted for video export: ${action.tool}`);
          console.log(`Note: ${action.tool} will be applied during final video export`, action.params);
          break;
      }
    } catch (error) {
      console.error(`Error applying ${action.tool}:`, error);
    }
  }
  
  const duration = processedFrames.length / fps;
  
  return {
    frames: processedFrames,
    metadata: {
      duration,
      startTime: 0,
      endTime: duration,
      appliedEdits,
    },
  };
}