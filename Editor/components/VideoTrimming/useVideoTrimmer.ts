import { useState, useEffect, useRef, useCallback } from 'react';

export const useVideoTrimmer = (file: File) => {
  const [videoUrl, setVideoUrl] = useState('');
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    
    // Reset state when file changes to prevent stale data
    setDuration(0);
    setStartTime(0);
    setEndTime(0);
    if(videoRef.current) videoRef.current.load(); // force reload

    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleMetadataLoaded = useCallback(() => {
    if (videoRef.current) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      setEndTime(videoDuration);
    }
  }, []);

  const handleTimeChange = useCallback((values: { start: number, end: number }) => {
    setStartTime(values.start);
    setEndTime(values.end);
  }, []);
  
  const seekTo = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  }, []);


  return {
    videoRef,
    videoUrl,
    duration,
    startTime,
    endTime,
    handleMetadataLoaded,
    handleTimeChange,
    seekTo,
  };
};