import React from 'react';
import { useVideoTrimmer } from './useVideoTrimmer';
import { RangeSlider } from './RangeSlider';
import { formatTime } from '../../utils/formatTime';

interface VideoTrimmerProps {
  file: File;
  onConfirm: (file: File, startTime: number, endTime: number) => void;
  onCancel: () => void;
}

export const VideoTrimmer: React.FC<VideoTrimmerProps> = ({ file, onConfirm, onCancel }) => {
  const {
    videoRef,
    videoUrl,
    duration,
    startTime,
    endTime,
    handleMetadataLoaded,
    handleTimeChange,
    seekTo,
  } = useVideoTrimmer(file);

  return (
    <div className="w-full max-w-4xl bg-dark-surface rounded-lg shadow-lg p-6 border border-dark-border animate-fadeIn flex flex-col items-center">
      <h2 className="text-2xl font-display text-brand-teal mb-4">Trim Your Video</h2>
      <p className="text-gray-400 mb-6">Select a clip or use the full video to continue.</p>
      
      <div className="w-full aspect-video bg-black rounded-md overflow-hidden mb-6">
        {videoUrl && (
          <video
            ref={videoRef}
            src={videoUrl}
            onLoadedMetadata={handleMetadataLoaded}
            controls
            className="w-full h-full"
          />
        )}
      </div>

      <RangeSlider
        min={0}
        max={duration}
        step={0.1}
        startTime={startTime}
        endTime={endTime}
        onTimeChange={handleTimeChange}
        onSeek={seekTo}
      />
        
      <div className="flex flex-col sm:flex-row gap-4 mt-8 w-full sm:w-auto">
        <button
          onClick={onCancel}
          className="w-full sm:w-auto px-6 py-2 border border-dark-border rounded-md text-gray-300 hover:bg-dark-border transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(file, 0, duration)}
          className="w-full sm:w-auto px-6 py-2 bg-brand-purple rounded-md text-white font-semibold hover:bg-purple-700 transition-colors"
        >
          Use Full Video
        </button>
        <button
          onClick={() => onConfirm(file, startTime, endTime)}
          disabled={endTime - startTime <= 0}
          className="w-full sm:w-auto px-6 py-2 bg-brand-pink rounded-md text-white font-bold hover:bg-pink-600 transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
        >
          Use Clip ({formatTime(endTime - startTime)})
        </button>
      </div>

    </div>
  );
};