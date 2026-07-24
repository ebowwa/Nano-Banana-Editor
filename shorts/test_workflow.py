#!/usr/bin/env python3
"""Test script to verify the complete workflow without actual video files"""

import asyncio
import json
import logging
from pathlib import Path
from main import NanoBananaEditor, VideoProcessingConfig, ProcessingResult

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MockVideoFrameExtractor:
    """Mock frame extractor for testing without actual video files"""
    
    def __init__(self, frame_interval_seconds=1, max_frames=5000):
        self.frame_interval_seconds = frame_interval_seconds
        self.max_frames = max_frames
    
    def extract_frames(self, video_path, output_dir):
        """Mock frame extraction that creates placeholder files"""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        for i in range(3):
            placeholder_frame = output_path / f"frame_{i:04d}.png"
            placeholder_frame.write_text(f"Mock frame {i} from {video_path}")
        
        logger.info(f"Mock extracted 3 frames to {output_dir}")
        return 3

class MockCompletionClient:
    """Mock AI client for testing without API calls"""
    
    async def create_completion(self, messages, model, temperature, response_format=None):
        """Mock AI completion that returns structured JSON"""
        mock_analysis = {
            "frames_to_edit": [
                {"start": 1.0, "end": 3.0, "type": "text_overlay"},
                {"start": 5.0, "end": 7.0, "type": "effect_enhancement"},
                {"start": 10.0, "end": 12.0, "type": "scene_transition"}
            ],
            "enhancement_types": ["text_overlay", "effect_enhancement", "scene_transition"],
            "text_overlay_suggestions": [
                {"timestamp": 2.0, "text": "Key moment", "position": "center"},
                {"timestamp": 6.0, "text": "Important scene", "position": "bottom"}
            ],
            "effect_recommendations": [
                {"timestamp": 2.5, "effect": "highlight", "intensity": 0.7},
                {"timestamp": 6.5, "effect": "zoom", "factor": 1.2}
            ],
            "priority_scores": [8, 6, 9]
        }
        
        return {
            "choices": [{
                "message": {
                    "content": json.dumps(mock_analysis)
                }
            }]
        }

class TestNanoBananaEditor(NanoBananaEditor):
    """Test version of the editor with mocked components"""
    
    def _initialize_components(self):
        """Initialize with mock components for testing"""
        self.ai_client = MockCompletionClient()
        self.frame_extractor = MockVideoFrameExtractor(
            frame_interval_seconds=self.config.frame_interval_seconds,
            max_frames=self.config.max_frames
        )
        logger.info("Initialized mock components for testing")

async def test_ai_analysis():
    """Test AI analysis phase"""
    print("\n🧪 Testing AI Analysis Phase...")
    
    config = VideoProcessingConfig()
    editor = TestNanoBananaEditor(config)
    
    mock_video_path = "test_video.mp4"
    result = await editor.analyze_video_with_ai(mock_video_path)
    
    if "error" in result:
        print(f"❌ AI analysis failed: {result['error']}")
        return False
    
    analysis = result["analysis"]
    if not isinstance(analysis, dict):
        print("❌ AI analysis did not return a dictionary")
        return False
    
    required_keys = ["frames_to_edit", "enhancement_types", "text_overlay_suggestions", "effect_recommendations"]
    for key in required_keys:
        if key not in analysis:
            print(f"❌ Missing required key in AI analysis: {key}")
            return False
    
    frames_to_edit = analysis["frames_to_edit"]
    if not isinstance(frames_to_edit, list) or len(frames_to_edit) == 0:
        print("❌ frames_to_edit should be a non-empty list")
        return False
    
    print(f"✅ AI analysis successful with {len(frames_to_edit)} frames to edit")
    return True

async def test_frame_extraction():
    """Test frame extraction phase"""
    print("\n🧪 Testing Frame Extraction Phase...")
    
    config = VideoProcessingConfig()
    editor = TestNanoBananaEditor(config)
    
    mock_ai_analysis = {
        "analysis": {
            "frames_to_edit": [
                {"start": 1.0, "end": 3.0, "type": "text_overlay"},
                {"start": 5.0, "end": 7.0, "type": "effect_enhancement"}
            ]
        }
    }
    
    mock_video_path = "test_video.mp4"
    extracted_frames = await editor.extract_targeted_frames(mock_video_path, mock_ai_analysis)
    
    if not extracted_frames:
        print("❌ No frames were extracted")
        return False
    
    if len(extracted_frames) != 2:
        print(f"❌ Expected 2 frame directories, got {len(extracted_frames)}")
        return False
    
    for frame_dir in extracted_frames:
        if not Path(frame_dir).exists():
            print(f"❌ Frame directory does not exist: {frame_dir}")
            return False
    
    print(f"✅ Frame extraction successful with {len(extracted_frames)} directories")
    return True

async def test_complete_workflow():
    """Test the complete processing workflow"""
    print("\n🧪 Testing Complete Workflow...")
    
    config = VideoProcessingConfig()
    editor = TestNanoBananaEditor(config)
    
    mock_video_path = "test_video.mp4"
    Path(mock_video_path).write_text("Mock video content")
    
    try:
        result = await editor.process_video(mock_video_path)
        
        if not result.success:
            print(f"❌ Workflow failed: {result.error_message}")
            return False
        
        if not result.output_path or not Path(result.output_path).exists():
            print("❌ Output video was not created")
            return False
        
        if result.frames_processed == 0:
            print("❌ No frames were processed")
            return False
        
        if not result.ai_analysis:
            print("❌ AI analysis was not included in result")
            return False
        
        print(f"✅ Complete workflow successful:")
        print(f"   - Input: {result.input_path}")
        print(f"   - Output: {result.output_path}")
        print(f"   - Frames processed: {result.frames_processed}")
        print(f"   - AI analysis completed: {'Yes' if result.ai_analysis else 'No'}")
        
        return True
        
    finally:
        if Path(mock_video_path).exists():
            Path(mock_video_path).unlink()
        
        output_dir = Path("./output")
        if output_dir.exists():
            import shutil
            shutil.rmtree(output_dir)

async def main():
    """Run all workflow tests"""
    print("🧪 Testing Nano-Banana-Shorts-Editor Workflow")
    print("=" * 50)
    
    tests = [
        ("AI Analysis", test_ai_analysis),
        ("Frame Extraction", test_frame_extraction),
        ("Complete Workflow", test_complete_workflow),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            success = await test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"❌ {test_name} test failed with exception: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 50)
    print("📊 Workflow Test Results:")
    
    all_passed = True
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {test_name}: {status}")
        if not success:
            all_passed = False
    
    if all_passed:
        print("\n🎉 All workflow tests passed!")
        print("\nThe integration is working correctly. You can now:")
        print("  1. Test with real video files")
        print("  2. Configure AI models and parameters")
        print("  3. Customize the enhancement pipeline")
    else:
        print("\n⚠️ Some workflow tests failed. Please check the implementation.")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(asyncio.run(main()))
