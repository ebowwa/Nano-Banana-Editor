import React from 'react';
import { formatTime } from '../utils/formatTime';

interface RangeSliderProps {
  min: number;
  max: number;
  step: number;
  startTime: number;
  endTime: number;
  onTimeChange: (values: { start: number, end: number }) => void;
  onSeek: (time: number) => void;
}

export const RangeSlider: React.FC<RangeSliderProps> = ({ min, max, step, startTime, endTime, onTimeChange, onSeek }) => {
  
  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newStart = parseFloat(e.target.value);
    if (newStart < endTime) {
      onTimeChange({ start: newStart, end: endTime });
      onSeek(newStart);
    }
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEnd = parseFloat(e.target.value);
    if (newEnd > startTime) {
      onTimeChange({ start: startTime, end: newEnd });
      onSeek(newEnd);
    }
  };
  
  const progressPercent = (max > 0) ? (endTime - startTime) / max * 100 : 0;
  const startPercent = (max > 0) ? (startTime / max) * 100 : 0;

  return (
    <div className="w-full px-2">
      <div className="relative h-12 flex items-center">
          <div className="absolute w-full h-2 bg-gray-600 rounded-full"></div>
          <div 
              className="absolute h-2 bg-brand-pink rounded-full"
              style={{
                  left: `${startPercent}%`,
                  width: `${progressPercent}%`,
              }}
          ></div>
          <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={startTime}
              onChange={handleStartTimeChange}
              className="absolute w-full h-2 appearance-none bg-transparent pointer-events-auto range-thumb"
              aria-label="Start Time"
          />
          <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={endTime}
              onChange={handleEndTimeChange}
              className="absolute w-full h-2 appearance-none bg-transparent pointer-events-auto range-thumb"
              aria-label="End Time"
          />
      </div>

      <div className="flex justify-between text-sm font-mono mt-2 text-gray-300">
          <span className="cursor-pointer" onClick={() => onSeek(startTime)}>Start: <span className="text-brand-teal">{formatTime(startTime)}</span></span>
          <span className="cursor-pointer" onClick={() => onSeek(endTime)}>End: <span className="text-brand-teal">{formatTime(endTime)}</span></span>
      </div>
        
      <style>{`
        .range-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          background-color: #db2777;
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
          margin-top: -10px;
          pointer-events: all;
          position: relative;
          z-index: 10;
        }
        .range-thumb::-moz-range-thumb {
          width: 20px;
          height: 20px;
          background-color: #db2777;
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
          pointer-events: all;
          position: relative;
          z-index: 10;
        }
      `}</style>
    </div>
  );
};
