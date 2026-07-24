"""Workaround: Extract frames and send as images to Gemini for analysis"""

import logging
import base64
import json
import subprocess
from pathlib import Path
from typing import Dict, Any, List, Optional
import tempfile

logger = logging.getLogger(__name__)

class GeminiFrameAnalyzer:
    """Extract key frames from video and send as images to Gemini"""
    
    def __init__(self, ai_client):
        self.ai_client = ai_client
        self.temp_dir = Path(tempfile.mkdtemp(prefix="gemini_frames_"))
        
    async def analyze_video_frames(self, video_path: str, num_frames: int = 5) -> Dict[str, Any]:
        """
        Extract key frames from video and send them as images to Gemini
        
        This is a workaround until direct video support is fixed in ai-proxy-core
        """
        
        # Extract key frames from video
        frames = self._extract_key_frames(video_path, num_frames)
        
        if not frames:
            return {"error": "Failed to extract frames from video"}
        
        # Prepare multimodal message with frames as images
        content = [
            {"type": "text", "text": f"""Analyze these {len(frames)} frames from a video. 
For each frame, identify:
1. What's happening in the frame
2. Any text that should be added
3. Any effects that would enhance it

Please provide specific timestamps and edit suggestions in JSON format:
{{
    "video_analysis": {{
        "total_frames": {len(frames)},
        "content_summary": "brief description of what the video shows"
    }},
    "edits_to_apply": [
        {{
            "frame_index": 0,
            "timestamp": 0.0,
            "description": "what's in this frame",
            "edit_type": "text_overlay",
            "text": "suggested text",
            "position": "bottom"
        }}
    ]
}}"""}
        ]
        
        # Add each frame as an image
        for i, frame_path in enumerate(frames):
            timestamp = self._get_frame_timestamp(video_path, i, num_frames)
            
            # Add frame as image with metadata
            content.append({
                "type": "text",
                "text": f"Frame {i+1} at {timestamp:.1f} seconds:"
            })
            
            content.append({
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{self._encode_image(frame_path)}"
                }
            })
        
        try:
            # Send frames to Gemini for analysis
            messages = [{"role": "user", "content": content}]
            
            response = await self.ai_client.create_completion(
                model="gemini-1.5-flash",
                messages=messages,
                temperature=0.7,
                max_tokens=2000
            )
            
            analysis_text = response["choices"][0]["message"]["content"]
            logger.info(f"Gemini analyzed {len(frames)} frames from video")
            
            # Parse JSON response (handle markdown wrapped JSON)
            try:
                # Remove markdown code block if present
                import re
                json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', analysis_text, re.DOTALL)
                if json_match:
                    analysis_text = json_match.group(1)
                
                analysis = json.loads(analysis_text)
                
                # Add actual timestamps based on frame positions
                if "edits_to_apply" in analysis:
                    for edit in analysis["edits_to_apply"]:
                        if "frame_index" in edit:
                            edit["timestamp"] = self._get_frame_timestamp(
                                video_path, 
                                edit["frame_index"], 
                                num_frames
                            )
                
                logger.info(f"Identified {len(analysis.get('edits_to_apply', []))} edits from frame analysis")
                return analysis
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Gemini response: {e}")
                logger.debug(f"Response was: {analysis_text[:500]}")
                return {"error": "Failed to parse analysis", "raw_response": analysis_text}
                
        except Exception as e:
            logger.error(f"Frame analysis failed: {e}")
            return {"error": str(e)}
    
    def _extract_key_frames(self, video_path: str, num_frames: int) -> List[str]:
        """Extract evenly spaced frames from video"""
        
        # Get video duration
        duration = self._get_video_duration(video_path)
        if duration <= 0:
            logger.error("Could not determine video duration")
            return []
        
        # Calculate timestamps for frame extraction
        interval = duration / (num_frames + 1)
        timestamps = [interval * (i + 1) for i in range(num_frames)]
        
        extracted_frames = []
        
        for i, timestamp in enumerate(timestamps):
            output_path = self.temp_dir / f"frame_{i:03d}_{timestamp:.1f}s.jpg"
            
            cmd = [
                'ffmpeg',
                '-ss', str(timestamp),
                '-i', video_path,
                '-frames:v', '1',
                '-q:v', '2',  # High quality JPEG
                '-y',
                str(output_path)
            ]
            
            try:
                subprocess.run(cmd, capture_output=True, text=True, check=True)
                extracted_frames.append(str(output_path))
                logger.info(f"Extracted frame {i+1}/{num_frames} at {timestamp:.1f}s")
            except subprocess.CalledProcessError as e:
                logger.error(f"Failed to extract frame at {timestamp}s: {e}")
        
        return extracted_frames
    
    def _get_video_duration(self, video_path: str) -> float:
        """Get video duration in seconds"""
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
    
    def _get_frame_timestamp(self, video_path: str, frame_index: int, total_frames: int) -> float:
        """Calculate timestamp for a frame index"""
        duration = self._get_video_duration(video_path)
        if duration <= 0:
            return 0.0
        
        # Evenly space frames throughout video
        interval = duration / (total_frames + 1)
        return interval * (frame_index + 1)
    
    def _encode_image(self, image_path: str) -> str:
        """Encode image as base64"""
        with open(image_path, 'rb') as f:
            return base64.b64encode(f.read()).decode('utf-8')