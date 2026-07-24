import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/VideoImport/FileUpload';
import { FrameGallery } from './components/FrameGallery';
import { AIControlPanel } from './components/AIControlPanel';
import { Header } from './components/Header';
import { LoadingOverlay } from './components/LoadingOverlay';
import { analyzeVideoFile, analyzeVideoForClips, editFrame } from './services/geminiService';
import type { Frame, AISuggestion, ClipSuggestion, EditingAction } from './types';
import { executeEditingPipeline } from './utils/videoEditingTools';
import { processVideoWithEdits } from './utils/videoProcessor';
import { VideoTrimmer } from './components/VideoTrimming/VideoTrimmer';
import { VideoPreview } from './components/VideoPreview';
import { VideoProvider, useVideo } from './contexts/VideoContext';
import { calculatePixelSimilarity } from './utils/imageSimilarity';

const AppContent: React.FC = () => {
  const [selectedFileForTrimming, setSelectedFileForTrimming] = useState<File | null>(null);
  const [trimmedVideoFile, setTrimmedVideoFile] = useState<File | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [clipSuggestion, setClipSuggestion] = useState<ClipSuggestion | null>(null);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState<number | null>(null);
  const [selectedFrameIndices, setSelectedFrameIndices] = useState<number[]>([]);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    videoUrl,
    frames,
    isProcessing,
    loadAndProcessVideo,
    updateEditedFrame,
    clearVideoData,
    editedFrames,
    trimRange,
  } = useVideo();

  useEffect(() => {
    if (isProcessing) {
      setLoadingMessage('Extracting frames from video...');
    } else if (loadingMessage === 'Extracting frames from video...') {
      setLoadingMessage(null);
    }
  }, [isProcessing, loadingMessage]);

  const handleFileSelect = useCallback((file: File) => {
    clearVideoData();
    setAiSuggestions([]);
    setClipSuggestion(null);
    setSelectedFrameIndex(null);
    setSelectedFrameIndices([]);
    setErrorMessage(null);
    setOriginalFile(file);
    setSelectedFileForTrimming(file);
    setTrimmedVideoFile(null);
  }, [clearVideoData]);

  const handleTrimConfirm = useCallback(async (file: File, startTime: number, endTime: number) => {
    setSelectedFileForTrimming(null);
    setAiSuggestions([]);
    setClipSuggestion(null);
    setSelectedFrameIndex(null);
    setSelectedFrameIndices([]);
    setTrimmedVideoFile(file); // Keep the (potentially trimmed) file for upload
    await loadAndProcessVideo(file, 10, { startTime, endTime }); // High frame rate for smooth preview
  }, [loadAndProcessVideo]);

  const handleTrimCancel = useCallback(() => {
    setSelectedFileForTrimming(null);
  }, []);

  const handleAnalyzeVideo = useCallback(async () => {
    if (!trimmedVideoFile) {
      setErrorMessage("No video file available to analyze.");
      return;
    }
    if (!trimRange) { // Defensive check
      setErrorMessage("Video trim range is not set. Please re-process the video.");
      return;
    }
    setLoadingMessage('Uploading and analyzing video with Gemini...');
    setErrorMessage(null);
    try {
      // Send the actual video file for analysis, but specify the time range.
      const suggestions = await analyzeVideoFile(trimmedVideoFile, trimRange.start, trimRange.end);
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error("Error analyzing video:", error);
      setErrorMessage("Failed to analyze video. Please check the console for details.");
    } finally {
      setLoadingMessage(null);
    }
  }, [trimmedVideoFile, trimRange]);

  const handleAnalyzeClips = useCallback(async () => {
    if (!trimmedVideoFile) {
      setErrorMessage("No video file available to analyze for clips.");
      return;
    }
    if (!trimRange) {
      setErrorMessage("Video trim range is not set. Please re-process the video.");
      return;
    }
    setLoadingMessage('Finding optimized viral clip...');
    setErrorMessage(null);
    try {
      const clipSuggestion = await analyzeVideoForClips(trimmedVideoFile, trimRange.start, trimRange.end);
      setClipSuggestion(clipSuggestion);
    } catch (error) {
      console.error("Error analyzing clips:", error);
      setErrorMessage("Failed to analyze clips. Please check the console for details.");
    } finally {
      setLoadingMessage(null);
    }
  }, [trimmedVideoFile, trimRange]);

  const handleUseClip = useCallback(async (startTime: number, endTime: number) => {
    if (!originalFile) {
      setErrorMessage("No original video file available to trim.");
      return;
    }
    
    // Calculate absolute time range based on current trim range
    const absoluteStartTime = (trimRange?.start || 0) + startTime;
    const absoluteEndTime = (trimRange?.start || 0) + endTime;
    
    setLoadingMessage('Trimming video to optimized clip...');
    setErrorMessage(null);
    
    try {
      // Clear current data and re-process with the new trim range
      setAiSuggestions([]);
      setClipSuggestion(null);
      setSelectedFrameIndex(null);
      setTrimmedVideoFile(originalFile);
      await loadAndProcessVideo(originalFile, 10, { startTime: absoluteStartTime, endTime: absoluteEndTime });
    } catch (error) {
      console.error("Error trimming video:", error);
      setErrorMessage("Failed to trim video. Please try again.");
    } finally {
      setLoadingMessage(null);
    }
  }, [originalFile, loadAndProcessVideo, trimRange]);

  const handleApplyOptimizations = useCallback(async (actions: EditingAction[]) => {
    if (!trimmedVideoFile || frames.length === 0) {
      setErrorMessage("No video or frames available to apply optimizations.");
      return;
    }
    
    setLoadingMessage('Applying automated optimizations...');
    setErrorMessage(null);
    
    try {
      // Adjust action times to be relative to current frames (not the full video)
      // Since clipSuggestion times are relative to the analyzed segment
      const adjustedActions = actions.map(action => {
        const adjustedParams = { ...action.params };
        
        // For trim actions, the times from Gemini are relative to the clip
        // but we need them relative to our current frames (which may already be trimmed)
        if (action.tool === 'trim' && clipSuggestion) {
          // The clipSuggestion times are relative to the analyzed segment
          // Our frames represent that segment, so times should work as-is
          console.log(`Trim action: ${adjustedParams.startTime} to ${adjustedParams.endTime} (clip suggestion: ${clipSuggestion.startTime} to ${clipSuggestion.endTime})`);
        }
        
        return { tool: action.tool, params: adjustedParams };
      });
      
      // First, execute the tools to get their results
      const results = await executeEditingPipeline(
        adjustedActions,
        trimmedVideoFile
      );
      
      console.log('Applied optimizations:', results);
      
      // Then, apply the edits to the actual frames using Nano Banana
      const processedVideo = await processVideoWithEdits(
        frames,
        adjustedActions,
        10, // fps
        editFrame // Pass the Nano Banana editFrame function
      );
      
      // Update the frames in the video context
      if (processedVideo.frames) {
        // Clear existing edited frames and replace with processed ones
        processedVideo.frames.forEach((frame, index) => {
          updateEditedFrame(index, frame);
        });
        
        // If frames were trimmed, we need to handle that differently
        if (processedVideo.frames.length !== frames.length) {
          // For now, just update what we can
          console.log(`Frame count changed from ${frames.length} to ${processedVideo.frames.length}`);
        }
      }
      
      setLoadingMessage(null);
      const message = `Applied ${results.length} optimizations: ${processedVideo.metadata.appliedEdits.join(', ')}`;
      console.log(message);
      // Show success briefly
      setErrorMessage(message);
      setTimeout(() => setErrorMessage(null), 5000);
      
    } catch (error) {
      console.error("Error applying optimizations:", error);
      setErrorMessage("Failed to apply optimizations. Please check the console for details.");
    } finally {
      setLoadingMessage(null);
    }
  }, [trimmedVideoFile, frames, updateEditedFrame, clipSuggestion]);

  const handleEditFrame = useCallback(async (prompt: string) => {
    if (selectedFrameIndex === null) {
        setErrorMessage("Please select a frame to edit.");
        return;
    }
    const currentFrame = frames[selectedFrameIndex];
    if (!currentFrame) {
        setErrorMessage("Selected frame not found.");
        return;
    }

    // Get adjacent frames for context
    const previousFrame = selectedFrameIndex > 0 ? frames[selectedFrameIndex - 1] : null;
    const nextFrame = selectedFrameIndex < frames.length - 1 ? frames[selectedFrameIndex + 1] : null;

    setLoadingMessage('Editing frame with Nano Banana...');
    setErrorMessage(null);
    try {
        const editedFrameData = await editFrame(currentFrame, prompt, previousFrame, nextFrame);
        
        // Update the primary edited frame
        updateEditedFrame(selectedFrameIndex, { ...currentFrame, data: editedFrameData });
        
        // Propagate the edit to subsequent similar frames
        setLoadingMessage('Applying edit to similar frames...');
        const SIMILARITY_THRESHOLD = 0.95; // 95% similarity

        for (let i = selectedFrameIndex + 1; i < frames.length; i++) {
            const nextOriginalFrame = frames[i];
            // eslint-disable-next-line no-await-in-loop
            const similarity = await calculatePixelSimilarity(currentFrame.data, nextOriginalFrame.data);

            if (similarity >= SIMILARITY_THRESHOLD) {
                // This frame is similar enough, apply the same edit to it.
                updateEditedFrame(i, { ...nextOriginalFrame, data: editedFrameData });
            } else {
                // The scene has changed, stop propagating.
                break;
            }
        }

    } catch (error) {
        console.error("Error editing frame:", error);
        setErrorMessage("Failed to edit frame. Please check the console for details.");
    } finally {
        setLoadingMessage(null);
    }
  }, [selectedFrameIndex, frames, updateEditedFrame]);

  const handleFrameSelect = useCallback((index: number, isShiftClick: boolean = false) => {
    if (isShiftClick) {
      // Multi-select with Shift+click
      setSelectedFrameIndices(prev => {
        if (prev.includes(index)) {
          // Remove if already selected
          return prev.filter(i => i !== index);
        } else {
          // Add to selection
          return [...prev, index];
        }
      });
    } else {
      // Single select - clear multi-selection
      setSelectedFrameIndex(index);
      setSelectedFrameIndices([index]);
    }
  }, []);

  const handleBatchEdit = useCallback(async (prompt: string, frameIndices: number[]) => {
    if (frameIndices.length === 0) {
      setErrorMessage("No frames selected for batch editing.");
      return;
    }

    setLoadingMessage(`Editing ${frameIndices.length} frames with Nano Banana...`);
    setErrorMessage(null);
    
    try {
      // Process frames in parallel for better performance
      const editPromises = frameIndices.map(async (frameIndex) => {
        const currentFrame = frames[frameIndex];
        if (!currentFrame) return null;

        // Get adjacent frames for context
        const previousFrame = frameIndex > 0 ? frames[frameIndex - 1] : null;
        const nextFrame = frameIndex < frames.length - 1 ? frames[frameIndex + 1] : null;

        const editedFrameData = await editFrame(currentFrame, prompt, previousFrame, nextFrame);
        return { index: frameIndex, data: editedFrameData };
      });

      const results = await Promise.all(editPromises);
      
      // Update all edited frames
      results.forEach(result => {
        if (result) {
          const originalFrame = frames[result.index];
          updateEditedFrame(result.index, { ...originalFrame, data: result.data });
        }
      });

    } catch (error) {
      console.error("Error batch editing frames:", error);
      setErrorMessage("Failed to batch edit frames. Please check the console for details.");
    } finally {
      setLoadingMessage(null);
    }
  }, [frames, updateEditedFrame]);
  
  const isLoading = !!loadingMessage || isProcessing;
  const hasVideo = !!videoUrl;

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col">
      <Header />
      {isLoading && <LoadingOverlay message={loadingMessage || "Processing..."} />}
      <main className="flex-grow p-4 md:p-8 flex flex-col items-center justify-center">
        {selectedFileForTrimming ? (
          <VideoTrimmer 
            file={selectedFileForTrimming} 
            onConfirm={handleTrimConfirm}
            onCancel={handleTrimCancel}
          />
        ) : !hasVideo ? (
          <FileUpload onFileSelect={handleFileSelect} setErrorMessage={setErrorMessage} />
        ) : (
          <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 h-full">
            {/* Left/Top Section: Video Player & Frame Gallery */}
            <div className="lg:col-span-8 flex flex-col gap-6 h-full">
              <div className="bg-dark-surface rounded-lg shadow-lg p-4 border border-dark-border">
                <h2 className="text-xl font-display text-brand-teal mb-4">Video Preview</h2>
                <VideoPreview />
              </div>
              <FrameGallery
                selectedFrameIndex={selectedFrameIndex}
                selectedFrameIndices={selectedFrameIndices}
                onFrameSelect={handleFrameSelect}
              />
            </div>

            {/* Right/Bottom Section: AI Controls */}
            <div className="lg:col-span-4 h-full">
              <AIControlPanel
                onAnalyze={handleAnalyzeVideo}
                onEdit={handleEditFrame}
                onBatchEdit={handleBatchEdit}
                onAnalyzeClips={handleAnalyzeClips}
                onUseClip={handleUseClip}
                onApplyOptimizations={handleApplyOptimizations}
                suggestions={aiSuggestions}
                clipSuggestion={clipSuggestion}
                selectedFrame={selectedFrameIndex !== null ? frames[selectedFrameIndex] : null}
                selectedFrameIndices={selectedFrameIndices}
              />
            </div>
          </div>
        )}
        {errorMessage && (
          <div className="fixed bottom-4 right-4 bg-red-800 text-white p-4 rounded-lg shadow-lg animate-fadeIn">
            <p className="font-bold">Error</p>
            <p>{errorMessage}</p>
          </div>
        )}
      </main>
    </div>
  );
};

const App: React.FC = () => (
  <VideoProvider>
    <AppContent />
  </VideoProvider>
);

export default App;