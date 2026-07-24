import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { Frame } from '../types';
import { formatTime } from '../utils/formatTime';
import { useVideo } from '../contexts/VideoContext';

// --- SVG Icons for Controls ---

const PlayIcon: React.FC = () => (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"></path></svg>
);
const PauseIcon: React.FC = () => (
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"></path></svg>
);
const VolumeHighIcon: React.FC = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path></svg>
);
const VolumeMutedIcon: React.FC = () => (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"></path></svg>
);
const FullscreenEnterIcon: React.FC = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5v-4m0 0h-4m4 0l-5-5"></path>
  </svg>
);
const FullscreenExitIcon: React.FC = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19v-4m0 0h4M15 15l5 5M5 5v4m0 0H9m-4 0l5-5m10 0v4m0 0h-4m4 0l-5-5M5 19v-4m0 0h4m-4 0l5 5"></path>
  </svg>
);


export const VideoPreview: React.FC = () => {
  const { videoUrl, editedFrames, trimRange, videoDimensions, framesPerSecond } = useVideo();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const preloadedImages = useRef<Map<number, HTMLImageElement>>(new Map());

  // Component state for controls
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(trimRange?.start ?? 0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Derive trim values from props, with safe fallbacks
  const trimStart = trimRange?.start ?? 0;
  const effectiveTrimEnd = trimRange?.end ?? videoDuration;
  const clipDuration = Math.max(0, effectiveTrimEnd - trimStart);

  // Pre-load edited frame images into HTMLImageElement for faster rendering on canvas.
  useEffect(() => {
    editedFrames.forEach((frame, index) => {
      if (preloadedImages.current.get(index)?.src !== frame.data) {
        const img = new Image();
        img.src = frame.data;
        preloadedImages.current.set(index, img);
      }
    });
  }, [editedFrames]);

  // Main rendering loop for drawing edited frames onto the canvas overlay.
  const renderLoop = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas?.getContext('2d')) return;
    const ctx = canvas.getContext('2d')!;
    
    const currentFrameIndex = Math.floor((video.currentTime - trimStart) * framesPerSecond);
    const editedFrameImage = preloadedImages.current.get(currentFrameIndex);
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (editedFrameImage?.complete && editedFrameImage.naturalHeight !== 0) {
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const imgWidth = editedFrameImage.naturalWidth;
      const imgHeight = editedFrameImage.naturalHeight;
      
      const canvasAspect = canvasWidth / canvasHeight;
      const imgAspect = imgWidth / imgHeight;

      let drawWidth, drawHeight, offsetX, offsetY;

      if (imgAspect > canvasAspect) {
        // Image is wider than canvas aspect ratio (fit to width)
        drawWidth = canvasWidth;
        drawHeight = drawWidth / imgAspect;
        offsetX = 0;
        offsetY = (canvasHeight - drawHeight) / 2;
      } else {
        // Image is taller than or same aspect as canvas (fit to height)
        drawHeight = canvasHeight;
        drawWidth = drawHeight * imgAspect;
        offsetY = 0;
        offsetX = (canvasWidth - drawWidth) / 2;
      }

      ctx.drawImage(editedFrameImage, offsetX, offsetY, drawWidth, drawHeight);
    }
    animationFrameId.current = requestAnimationFrame(renderLoop);
  }, [trimStart, framesPerSecond]);
  
  // Effect to initialize the video when the source URL or trim range changes.
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !videoDimensions) return;

    setIsReady(false); // Mark as not ready until metadata is loaded for the new source
    
    // Set canvas dimensions from context - the single source of truth
    canvas.width = videoDimensions.width;
    canvas.height = videoDimensions.height;


    const handleLoadedMetadata = () => {
      setVideoDuration(video.duration);
      video.currentTime = trimStart;
      setCurrentTime(trimStart);
      setIsReady(true); // Video is now ready for interaction
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    if(videoUrl && video.currentSrc !== videoUrl) {
      video.src = videoUrl;
      video.load();
    } else if (video.readyState > 0) {
      // If src is the same but component re-mounted, metadata might be loaded
      handleLoadedMetadata();
    }
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [videoUrl, trimStart, videoDimensions]);

  // Effect to manage continuous playback controls (play, pause, timeupdate).
  useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
          if (video.currentTime >= effectiveTrimEnd) {
              video.pause();
              video.currentTime = effectiveTrimEnd;
          }
          setCurrentTime(video.currentTime);
      };
      
      const handlePlay = () => {
        if (video.currentTime < trimStart) {
            video.currentTime = trimStart;
        }
        setIsPlaying(true);
        animationFrameId.current = requestAnimationFrame(renderLoop);
      };
      
      const handlePause = () => {
        setIsPlaying(false);
        if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      };
      
      const handleVolumeChange = () => {
          setVolume(video.volume);
          setIsMuted(video.muted);
      };
      
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('volumechange', handleVolumeChange);
      
      handleVolumeChange(); // Initial sync

      return () => {
          video.removeEventListener('timeupdate', handleTimeUpdate);
          video.removeEventListener('play', handlePlay);
          video.removeEventListener('pause', handlePause);
          video.removeEventListener('volumechange', handleVolumeChange);
          if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      };
  }, [trimStart, effectiveTrimEnd, renderLoop]);
  
  // Effect to handle fullscreen state changes.
  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // --- Control Handlers ---
  const handlePlayPauseToggle = useCallback(() => {
    const video = videoRef.current;
    if (!video || !isReady) return;
    if (video.paused) {
        if(video.currentTime >= effectiveTrimEnd) {
            video.currentTime = trimStart;
        }
        video.play();
    } else {
        video.pause();
    }
  }, [trimStart, effectiveTrimEnd, isReady]);
  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video || !isReady) return;
    video.currentTime = parseFloat(e.target.value);
    setCurrentTime(video.currentTime);
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    video.muted = newVolume === 0;
  };
  
  const handleMuteToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };
  
  const handleFullscreenToggle = () => {
    if (!document.fullscreenElement) {
        containerRef.current?.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
  };
  
  if (!videoUrl) return null;

  return (
    <div ref={containerRef} className="relative w-full aspect-video bg-black rounded-md group overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full rounded-md"
        crossOrigin="anonymous"
        playsInline
        onClick={handlePlayPauseToggle}
      />
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full rounded-md pointer-events-none"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      {/* Custom Controls */}
      <div className={`absolute bottom-0 left-0 right-0 p-2 sm:p-3 text-white transition-opacity duration-300 flex flex-col gap-1 ${isReady ? 'opacity-0 group-hover:opacity-100' : 'opacity-0'}`}>
        <input
            type="range"
            min={trimStart}
            max={effectiveTrimEnd}
            step="any"
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer range-slider"
        />
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3">
                <button onClick={handlePlayPauseToggle} className="p-1">{isPlaying ? <PauseIcon /> : <PlayIcon />}</button>
                <div className="flex items-center gap-2 group/volume">
                  <button onClick={handleMuteToggle}>{isMuted || volume === 0 ? <VolumeMutedIcon /> : <VolumeHighIcon />}</button>
                  <input type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume} onChange={handleVolumeChange} className="w-0 group-hover/volume:w-20 transition-all duration-300 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer range-slider"/>
                </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
                <span className="text-xs sm:text-sm font-mono">{formatTime(currentTime - trimStart)} / {formatTime(clipDuration)}</span>
                <button onClick={handleFullscreenToggle} className="p-1">{isFullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}</button>
            </div>
        </div>
      </div>
       {!isReady && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
            <div className="w-8 h-8 border-2 border-t-brand-pink rounded-full animate-spin"></div>
        </div>
      )}
      <style>{`
        .range-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 14px; height: 14px;
          background-color: #db2777;
          border-radius: 50%; cursor: pointer;
          transition: background-color 0.2s;
        }
        .range-slider:hover::-webkit-slider-thumb {
            background-color: #f472b6;
        }
        .range-slider::-moz-range-thumb {
          width: 14px; height: 14px;
          background-color: #db2777;
          border-radius: 50%; cursor: pointer;
        }
      `}</style>
    </div>
  );
};