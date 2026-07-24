"""Mock VideoFrameExtractor for testing when media-processor is not available"""

import logging
import os
from pathlib import Path
from typing import List, Optional
import shutil

logger = logging.getLogger(__name__)

class VideoFrameExtractor:
    """Mock frame extractor that simulates video processing"""
    
    def __init__(self, frame_interval_seconds: int = 1, max_frames: int = 5000):
        self.frame_interval_seconds = frame_interval_seconds
        self.max_frames = max_frames
        logger.info(f"Initialized mock VideoFrameExtractor (interval: {frame_interval_seconds}s, max: {max_frames})")
    
    def extract_frames(self, video_path: str, output_dir: str, start_time: float = 0, end_time: Optional[float] = None) -> int:
        """
        Mock frame extraction that creates placeholder frame files
        Returns the number of frames extracted (for proper frame counting)
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Calculate actual frame count based on time range and frame rate
        # Assuming 30 fps for calculation
        fps = 30
        duration = (end_time - start_time) if end_time else 2.0  # Default 2 seconds
        
        # Calculate frames needed: we don't extract ALL frames, just key frames
        # For text overlay: 1 frame at timestamp
        # For effects: 2-3 key frames across the duration  
        # For transitions: 2-3 key frames
        if "text_overlay" in output_dir:
            num_frames = 1  # Just the frame where text appears
        elif "effect" in output_dir:
            num_frames = 3  # Start, middle, end of effect
        else:
            num_frames = 2  # Start and end of transition
        
        video_name = Path(video_path).stem
        frame_paths = []
        
        for i in range(1, num_frames + 1):
            frame_filename = f"{video_name}_frame{i}.jpg"
            frame_path = output_path / frame_filename
            
            # Create placeholder frames
            if not frame_path.exists():
                frame_path.touch()
            
            frame_paths.append(str(frame_path))
        
        logger.info(f"Mock extracted {len(frame_paths)} key frames to {output_dir} (from {duration}s of video)")
        return len(frame_paths)  # Return count, not list
    
    def get_video_duration(self, video_path: str) -> float:
        """Mock: Return a fixed duration"""
        return 30.0  # 30 seconds mock duration