"""Gemini video analysis - send video directly to Gemini for frame identification"""

import logging
import base64
import json
from pathlib import Path
from typing import Dict, Any, List, Optional
import mimetypes

logger = logging.getLogger(__name__)

class GeminiVideoAnalyzer:
    """Send video directly to Gemini for analysis and frame identification"""
    
    def __init__(self, ai_client):
        self.ai_client = ai_client
        
    async def analyze_video_for_edits(self, video_path: str) -> Dict[str, Any]:
        """
        Send video directly to Gemini to identify specific frames/timestamps to edit
        
        Gemini will analyze the video and tell us:
        - Exact timestamps where edits should be made
        - What type of edit to apply at each timestamp
        - Specific text or effects to add
        """
        
        # Read video file and encode for Gemini
        video_data = self._prepare_video_for_gemini(video_path)
        
        if not video_data:
            return {"error": "Failed to prepare video for analysis"}
        
        prompt = """Analyze this video and identify specific frames/timestamps that need editing.

For each edit point, provide:
1. The exact timestamp (in seconds)
2. What you see in that frame
3. What edit to apply (text overlay, effect, etc.)
4. The specific text or effect details

Return your analysis in this JSON format:
{
    "video_analysis": {
        "duration": <video_duration_in_seconds>,
        "content_description": "<brief description of video content>",
        "key_moments": [
            {
                "timestamp": 1.5,
                "frame_description": "<what's visible in this frame>",
                "why_edit": "<why this moment needs enhancement>"
            }
        ]
    },
    "edits_to_apply": [
        {
            "timestamp": 1.5,
            "edit_type": "text_overlay",
            "text": "Important moment!",
            "position": "bottom",
            "duration": 2.0,
            "reasoning": "This is a key action point"
        },
        {
            "timestamp": 5.2,
            "edit_type": "highlight",
            "effect": "zoom",
            "target_area": "center",
            "duration": 1.5,
            "reasoning": "Focus attention on main subject"
        }
    ]
}

Analyze the entire video and identify 3-5 key moments that would benefit from enhancement."""

        try:
            # Send video to Gemini with multimodal request (correct format for ai-proxy-core)
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "video",
                            "video": {
                                "file_path": video_path  # ai-proxy-core supports direct file path
                            }
                        }
                    ]
                }
            ]
            
            # Use the correct ai-proxy-core API (already in async context)
            response = await self.ai_client.create_completion(
                model="gemini-1.5-flash",
                messages=messages,
                temperature=0.7,
                max_tokens=2000
            )
            
            analysis_text = response["choices"][0]["message"]["content"]
            logger.info("Gemini video analysis completed")
            
            # Parse JSON response
            try:
                analysis = json.loads(analysis_text)
                logger.info(f"Identified {len(analysis.get('edits_to_apply', []))} edit points in video")
                return analysis
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse Gemini response: {e}")
                # Try to extract JSON from the response
                import re
                json_match = re.search(r'\{.*\}', analysis_text, re.DOTALL)
                if json_match:
                    try:
                        analysis = json.loads(json_match.group())
                        return analysis
                    except:
                        pass
                return {"error": "Failed to parse analysis", "raw_response": analysis_text}
                
        except Exception as e:
            logger.error(f"Gemini video analysis failed: {e}")
            return {"error": str(e)}
    
    def _prepare_video_for_gemini(self, video_path: str) -> Optional[Dict[str, str]]:
        """
        Prepare video file for Gemini API
        
        Returns:
            Dict with mime_type and base64_data, or None if failed
        """
        try:
            # Check file size (Gemini has limits)
            file_size = Path(video_path).stat().st_size
            max_size = 20 * 1024 * 1024  # 20MB limit for free tier
            
            if file_size > max_size:
                logger.warning(f"Video file too large ({file_size} bytes), need to compress")
                # Could implement video compression here
                return None
            
            # Detect MIME type
            mime_type, _ = mimetypes.guess_type(video_path)
            if not mime_type:
                mime_type = "video/mp4"  # Default to mp4
            
            # Read and encode video
            with open(video_path, 'rb') as video_file:
                video_bytes = video_file.read()
                base64_data = base64.b64encode(video_bytes).decode('utf-8')
            
            logger.info(f"Prepared video for Gemini: {file_size} bytes, {mime_type}")
            return {
                "mime_type": mime_type,
                "base64_data": base64_data
            }
            
        except Exception as e:
            logger.error(f"Failed to prepare video for Gemini: {e}")
            return None
    
    def extract_frame_at_timestamp(self, video_path: str, timestamp: float, output_path: str) -> bool:
        """Extract a single frame at the Gemini-identified timestamp"""
        import subprocess
        
        cmd = [
            'ffmpeg',
            '-ss', str(timestamp),
            '-i', video_path,
            '-frames:v', '1',
            '-y',
            output_path
        ]
        
        try:
            subprocess.run(cmd, capture_output=True, text=True, check=True)
            logger.info(f"Extracted frame at {timestamp}s")
            return True
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to extract frame at {timestamp}s: {e}")
            return False