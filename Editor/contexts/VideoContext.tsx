import React, { createContext, useState, useCallback, useContext, ReactNode } from 'react';
import type { Frame } from '../types';

interface VideoDimensions {
  width: number;
  height: number;
}

interface VideoContextType {
  frames: Frame[];
  videoUrl: string | null;
  videoDimensions: VideoDimensions | null;
  trimRange: { start: number; end: number } | null;
  editedFrames: Map<number, Frame>;
  isProcessing: boolean;
  framesPerSecond: number;
  loadAndProcessVideo: (videoFile: File, framesPerSecond: number, trim?: { startTime: number; endTime: number }) => Promise<void>;
  updateEditedFrame: (index: number, frame: Frame) => void;
  clearVideoData: () => void;
}

const VideoContext = createContext<VideoContextType | undefined>(undefined);

export const VideoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoDimensions, setVideoDimensions] = useState<VideoDimensions | null>(null);
  const [trimRange, setTrimRange] = useState<{ start: number, end: number } | null>(null);
  const [editedFrames, setEditedFrames] = useState<Map<number, Frame>>(new Map());
  const [framesPerSecond, setFramesPerSecond] = useState(1);

  const clearVideoData = useCallback(() => {
    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }
    setFrames([]);
    setVideoUrl(null);
    setVideoDimensions(null);
    setTrimRange(null);
    setEditedFrames(new Map());
    setIsProcessing(false);
    setFramesPerSecond(1);
  }, [videoUrl]);
  
  const loadAndProcessVideo = useCallback(async (videoFile: File, fps: number, trim?: { startTime: number; endTime: number }) => {
    clearVideoData(); 
    setIsProcessing(true);
    setFramesPerSecond(fps);

    const url = URL.createObjectURL(videoFile);
    setVideoUrl(url);
    setTrimRange(trim ? { start: trim.startTime, end: trim.endTime } : null);

    const video = document.createElement('video');
    video.src = url;
    video.muted = true;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    return new Promise<void>((resolve, reject) => {
        video.onloadedmetadata = async () => {
          try {
            const dimensions = { width: video.videoWidth, height: video.videoHeight };
            setVideoDimensions(dimensions);
            canvas.width = dimensions.width;
            canvas.height = dimensions.height;
            
            const duration = video.duration;
            const capturedFrames: Frame[] = [];
            const interval = 1 / fps;

            const startTime = trim?.startTime ?? 0;
            const endTime = trim?.endTime ?? duration;

            for (let time = startTime; time < endTime; time += interval) {
              video.currentTime = time;
              // eslint-disable-next-line no-await-in-loop
              await new Promise(resolveSeek => {
                const onSeeked = () => {
                  video.removeEventListener('seeked', onSeeked);
                  resolveSeek(null);
                };
                video.addEventListener('seeked', onSeeked);
              });

              if (context) {
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                const mimeType = 'image/jpeg';
                const dataUrl = canvas.toDataURL(mimeType, 0.8);
                capturedFrames.push({
                  id: capturedFrames.length,
                  data: dataUrl,
                  mimeType,
                });
              }
            }
            setFrames(capturedFrames);
            setIsProcessing(false);
            resolve();
          } catch (error) {
              console.error("Error processing video:", error);
              setIsProcessing(false);
              reject(error);
          }
        };

        video.onerror = () => {
          console.error("Error loading video file.");
          setIsProcessing(false);
          reject(new Error("Error loading video file."));
        };
    });
  }, [clearVideoData]);
  
  const updateEditedFrame = useCallback((index: number, frame: Frame) => {
    setEditedFrames(prev => {
        const newMap = new Map(prev);
        newMap.set(index, frame);
        return newMap;
    });
  }, []);

  const value = {
    frames,
    videoUrl,
    videoDimensions,
    trimRange,
    editedFrames,
    isProcessing,
    framesPerSecond,
    loadAndProcessVideo,
    updateEditedFrame,
    clearVideoData,
  };

  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>;
};

export const useVideo = (): VideoContextType => {
  const context = useContext(VideoContext);
  if (context === undefined) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
};