"""Video editor that applies selective edits at specific timestamps"""

import subprocess
import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import tempfile

logger = logging.getLogger(__name__)

class VideoEditor:
    """Handles selective video editing at specific timestamps"""
    
    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix="nano_editor_")
        logger.info(f"Created temp directory: {self.temp_dir}")
    
    def add_text_overlays(self, input_video: str, output_video: str, overlays: List[Dict[str, Any]]) -> bool:
        """
        Add text overlays at specific timestamps using ffmpeg drawtext filter
        
        Args:
            input_video: Path to input video
            output_video: Path to output video
            overlays: List of overlay configs with timestamp, text, position
        """
        if not overlays:
            logger.warning("No text overlays to add")
            return False
        
        # Build ffmpeg filter for text overlays
        drawtext_filters = []
        
        for i, overlay in enumerate(overlays):
            timestamp = overlay.get('timestamp', 0)
            text = overlay.get('text', 'Sample Text')
            position = overlay.get('position', 'center')
            duration = overlay.get('duration', 2)  # Show for 2 seconds by default
            
            # Map position to x,y coordinates
            if position == 'center':
                x, y = '(w-text_w)/2', '(h-text_h)/2'
            elif position == 'bottom':
                x, y = '(w-text_w)/2', 'h-text_h-50'
            elif position == 'top':
                x, y = '(w-text_w)/2', '50'
            else:
                x, y = '(w-text_w)/2', '(h-text_h)/2'
            
            # Create drawtext filter with timing
            filter_str = (
                f"drawtext=text='{text}':fontsize=48:fontcolor=white:"
                f"box=1:boxcolor=black@0.5:boxborderw=5:"
                f"x={x}:y={y}:"
                f"enable='between(t,{timestamp},{timestamp + duration})'"
            )
            drawtext_filters.append(filter_str)
        
        # Combine all filters
        filter_complex = ','.join(drawtext_filters)
        
        # Run ffmpeg command
        cmd = [
            'ffmpeg', '-i', input_video,
            '-vf', filter_complex,
            '-c:a', 'copy',  # Copy audio without re-encoding
            '-y', output_video
        ]
        
        try:
            logger.info(f"Adding {len(overlays)} text overlays to video")
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            logger.info("Text overlays added successfully")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to add text overlays: {e.stderr}")
            return False
    
    def apply_effects_at_timestamps(self, input_video: str, output_video: str, effects: List[Dict[str, Any]]) -> bool:
        """
        Apply visual effects at specific timestamps
        
        Args:
            input_video: Path to input video
            output_video: Path to output video  
            effects: List of effect configs with start, end, type
        """
        if not effects:
            logger.warning("No effects to apply")
            return False
        
        effect_filters = []
        
        for effect in effects:
            start = effect.get('start', 0)
            end = effect.get('end', start + 2)
            effect_type = effect.get('type', 'blur')
            
            if effect_type == 'blur':
                # Apply blur effect during specified time
                filter_str = f"boxblur=5:enable='between(t,{start},{end})'"
            elif effect_type == 'brightness':
                # Increase brightness
                filter_str = f"eq=brightness=0.3:enable='between(t,{start},{end})'"
            elif effect_type == 'contrast':
                # Increase contrast
                filter_str = f"eq=contrast=1.5:enable='between(t,{start},{end})'"
            elif effect_type == 'zoom':
                # Zoom in effect
                filter_str = f"zoompan=z='if(between(t,{start},{end}),min(zoom+0.01,1.5),1)':d=1:s=640x480"
            else:
                continue
            
            effect_filters.append(filter_str)
        
        if not effect_filters:
            return False
        
        filter_complex = ','.join(effect_filters)
        
        cmd = [
            'ffmpeg', '-i', input_video,
            '-vf', filter_complex,
            '-c:a', 'copy',
            '-y', output_video
        ]
        
        try:
            logger.info(f"Applying {len(effects)} effects to video")
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            logger.info("Effects applied successfully")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to apply effects: {e.stderr}")
            return False
    
    def create_enhanced_video(self, input_video: str, output_video: str, ai_analysis: Dict[str, Any]) -> bool:
        """
        Create enhanced video by applying all edits from AI analysis
        
        This is the main method that combines text overlays and effects
        """
        logger.info("Creating enhanced video with AI-suggested edits")
        
        # Extract edit instructions from AI analysis
        frames_to_edit = ai_analysis.get('frames_to_edit', [])
        text_suggestions = ai_analysis.get('text_overlay_suggestions', [])
        
        # Build combined filter chain
        filters = []
        
        # Add text overlays
        for suggestion in text_suggestions:
            timestamp = suggestion.get('timestamp', 0)
            text = suggestion.get('text', '')
            position = suggestion.get('position', 'center')
            
            if position == 'center':
                x, y = '(w-text_w)/2', '(h-text_h)/2'
            elif position == 'bottom':
                x, y = '(w-text_w)/2', 'h-text_h-50'
            else:
                x, y = '(w-text_w)/2', '50'
            
            filter_str = (
                f"drawtext=text='{text}':fontsize=48:fontcolor=white:"
                f"box=1:boxcolor=black@0.5:boxborderw=5:"
                f"x={x}:y={y}:"
                f"enable='between(t,{timestamp},{timestamp + 2})'"
            )
            filters.append(filter_str)
        
        # Add effects for specific segments
        for segment in frames_to_edit:
            start = segment.get('start', 0)
            end = segment.get('end', start + 2)
            edit_type = segment.get('type', '')
            
            if edit_type == 'effect_enhancement':
                # Add a subtle brightness boost
                filters.append(f"eq=brightness=0.1:enable='between(t,{start},{end})'")
            elif edit_type == 'scene_transition':
                # Add fade effect
                filters.append(f"fade=t=in:st={start}:d=0.5")
        
        if not filters:
            logger.warning("No edits to apply, copying original video")
            subprocess.run(['cp', input_video, output_video], check=True)
            return True
        
        # Combine all filters
        filter_complex = ','.join(filters)
        
        # Run ffmpeg with all filters
        cmd = [
            'ffmpeg', '-i', input_video,
            '-vf', filter_complex,
            '-c:a', 'copy',  # Preserve audio
            '-preset', 'fast',  # Faster encoding
            '-y', output_video
        ]
        
        try:
            logger.info(f"Applying {len(filters)} edits to video")
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            logger.info(f"Enhanced video created successfully: {output_video}")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to create enhanced video: {e.stderr}")
            # Fallback: copy original
            subprocess.run(['cp', input_video, output_video], check=True)
            return False