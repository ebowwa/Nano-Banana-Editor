import { useState, useCallback } from 'react';
import type { Frame } from '../types';

interface TrimOptions {
  startTime: number;
  endTime: number;
}

export const useVideoProcessor = () => {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processVideo = useCallback(async (videoFile: File, framesPerSecond: number, trim?: TrimOptions) => {
    setIsProcessing(true);
    setFrames([]);

    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    video.onloadedmetadata = async () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const duration = video.duration;
      const capturedFrames: Frame[] = [];
      const interval = 1 / framesPerSecond;

      const startTime = trim?.startTime ?? 0;
      const endTime = trim?.endTime ?? duration;

      for (let time = startTime; time < endTime; time += interval) {
        video.currentTime = time;
        // eslint-disable-next-line no-await-in-loop
        await new Promise(resolve => {
          const onSeeked = () => {
            video.removeEventListener('seeked', onSeeked);
            resolve(null);
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
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      console.error("Error loading video file.");
      setIsProcessing(false);
    };

  }, []);

  return { frames, processVideo, isProcessing };
};