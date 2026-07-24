"""Real frame extraction and processing using ffmpeg"""

import subprocess
import logging
import base64
from pathlib import Path
from typing import List, Dict, Any, Optional
import json
import os

logger = logging.getLogger(__name__)

class FrameProcessor:
    """Extracts actual frames from video and processes them"""
    
    def __init__(self):
        self.temp_dir = Path("/tmp/nano_frames")
        self.temp_dir.mkdir(exist_ok=True, parents=True)
    
    def extract_frame_at_timestamp(self, video_path: str, timestamp: float, output_path: str) -> bool:
        """
        Extract a single frame from video at specific timestamp
        
        Args:
            video_path: Path to input video
            timestamp: Time in seconds to extract frame
            output_path: Where to save the extracted frame
        """
        cmd = [
            'ffmpeg',
            '-ss', str(timestamp),  # Seek to timestamp
            '-i', video_path,
            '-frames:v', '1',  # Extract only 1 frame
            '-y',  # Overwrite output
            output_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            logger.info(f"Extracted frame at {timestamp}s to {output_path}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to extract frame: {e.stderr}")
            return False
    
    def extract_frames_for_analysis(self, video_path: str, num_frames: int = 5) -> List[str]:
        """
        Extract frames evenly distributed throughout the video for AI analysis
        
        Args:
            video_path: Path to input video
            num_frames: Number of frames to extract for analysis
        
        Returns:
            List of paths to extracted frames
        """
        # Get video duration
        duration = self.get_video_duration(video_path)
        if duration <= 0:
            logger.error("Could not determine video duration")
            return []
        
        # Calculate timestamps for frame extraction
        interval = duration / (num_frames + 1)
        timestamps = [interval * (i + 1) for i in range(num_frames)]
        
        extracted_frames = []
        video_name = Path(video_path).stem
        
        for i, timestamp in enumerate(timestamps):
            output_path = self.temp_dir / f"{video_name}_frame_{i}_{timestamp:.1f}s.jpg"
            if self.extract_frame_at_timestamp(video_path, timestamp, str(output_path)):
                extracted_frames.append(str(output_path))
        
        logger.info(f"Extracted {len(extracted_frames)} frames for analysis")
        return extracted_frames
    
    def get_video_duration(self, video_path: str) -> float:
        """Get video duration in seconds using ffprobe"""
        cmd = [
            'ffprobe',
            '-v', 'error',
            '-show_entries', 'format=duration',
            '-of', 'default=noprint_wrappers=1:nokey=1',
            video_path
        ]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return float(result.stdout.strip())
        except (subprocess.CalledProcessError, ValueError) as e:
            logger.error(f"Failed to get video duration: {e}")
            return 0.0
    
    def encode_frame_for_gemini(self, frame_path: str) -> str:
        """Encode frame as base64 for Gemini API"""
        with open(frame_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')
    
    def apply_text_to_frame(self, input_frame: str, output_frame: str, text: str, position: str = 'center') -> bool:
        """
        Apply text overlay to a single frame using ffmpeg
        
        Args:
            input_frame: Path to input frame
            output_frame: Path to output frame
            text: Text to overlay
            position: Position of text (center, top, bottom)
        """
        # Map position to coordinates
        if position == 'center':
            x, y = '(w-text_w)/2', '(h-text_h)/2'
        elif position == 'bottom':
            x, y = '(w-text_w)/2', 'h-th-50'
        elif position == 'top':
            x, y = '(w-text_w)/2', '50'
        else:
            x, y = '(w-text_w)/2', '(h-text_h)/2'
        
        cmd = [
            'ffmpeg',
            '-i', input_frame,
            '-vf', f"drawtext=text='{text}':fontsize=48:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=5:x={x}:y={y}",
            '-y',
            output_frame
        ]
        
        try:
            subprocess.run(cmd, capture_output=True, text=True, check=True)
            logger.info(f"Applied text '{text}' to frame")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to apply text to frame: {e.stderr}")
            return False
    
    def replace_frames_in_video(self, video_path: str, output_path: str, frame_replacements: Dict[float, str]) -> bool:
        """
        Replace specific frames in video with edited versions
        
        Args:
            video_path: Original video path
            output_path: Output video path
            frame_replacements: Dict mapping timestamp -> edited frame path
        
        This is complex with ffmpeg, so we'll use a different approach:
        1. Split video into segments
        2. Replace frames
        3. Concatenate segments
        """
        if not frame_replacements:
            logger.warning("No frames to replace")
            subprocess.run(['cp', video_path, output_path], check=True)
            return True
        
        # For now, use overlay approach - overlay edited frames at timestamps
        filter_complex = []
        inputs = ['-i', video_path]
        
        # Add each edited frame as an input
        for i, (timestamp, frame_path) in enumerate(frame_replacements.items(), 1):
            inputs.extend(['-i', frame_path])
            # Overlay the frame for 0.1 seconds at the timestamp
            filter = f"[0:v][{i}:v]overlay=enable='between(t,{timestamp},{timestamp + 0.1})'"
            filter_complex.append(filter)
        
        if filter_complex:
            # Chain all overlays
            filter_str = ','.join(filter_complex)
            
            cmd = [
                'ffmpeg',
                *inputs,
                '-filter_complex', filter_str,
                '-c:a', 'copy',  # Copy audio
                '-y',
                output_path
            ]
            
            try:
                subprocess.run(cmd, capture_output=True, text=True, check=True)
                logger.info(f"Replaced {len(frame_replacements)} frames in video")
                return True
            except subprocess.CalledProcessError as e:
                logger.error(f"Failed to replace frames: {e.stderr}")
                # Fallback to simple copy
                subprocess.run(['cp', video_path, output_path], check=True)
                return False
        
        return True