#!/usr/bin/env python3
"""Test script to verify imports work correctly"""

import sys
from pathlib import Path

def test_ai_proxy_core():
    """Test ai-proxy-core import"""
    try:
        from ai_proxy_core import CompletionClient
        print("✅ ai-proxy-core import successful")
        
        client = CompletionClient()
        print("✅ CompletionClient instantiation successful")
        return True
    except ImportError as e:
        print(f"❌ ai-proxy-core import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ ai-proxy-core initialization failed: {e}")
        return False

def test_media_processor():
    """Test media-processor import"""
    try:
        from src.video.extractor import VideoFrameExtractor
        print("✅ media-processor import successful")
        
        extractor = VideoFrameExtractor(frame_interval_seconds=1, max_frames=100)
        print("✅ VideoFrameExtractor instantiation successful")
        return True
    except ImportError as e:
        print(f"❌ media-processor import failed: {e}")
        print("Make sure media-processor is installed: pip install -e ~/repos/media-processor")
        return False
    except Exception as e:
        print(f"❌ media-processor initialization failed: {e}")
        return False

def test_main_imports():
    """Test main.py imports"""
    try:
        from main import NanoBananaEditor, VideoProcessingConfig
        print("✅ main.py imports successful")
        
        config = VideoProcessingConfig()
        print("✅ VideoProcessingConfig instantiation successful")
        return True
    except ImportError as e:
        print(f"❌ main.py import failed: {e}")
        return False
    except Exception as e:
        print(f"❌ main.py initialization failed: {e}")
        return False

def test_environment():
    """Test environment setup"""
    try:
        import os
        gemini_key = os.getenv('GEMINI_API_KEY')
        if gemini_key:
            print("✅ GEMINI_API_KEY environment variable found")
        else:
            print("⚠️ GEMINI_API_KEY environment variable not found")
        
        print(f"✅ Python version: {sys.version}")
        print(f"✅ Current working directory: {Path.cwd()}")
        return True
    except Exception as e:
        print(f"❌ Environment test failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Nano-Banana-Shorts-Editor Integration")
    print("=" * 50)
    
    tests = [
        ("Environment", test_environment),
        ("AI Proxy Core", test_ai_proxy_core),
        ("Media Processor", test_media_processor),
        ("Main Module", test_main_imports),
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n📋 Testing {test_name}...")
        success = test_func()
        results.append((test_name, success))
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    
    all_passed = True
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {test_name}: {status}")
        if not success:
            all_passed = False
    
    if all_passed:
        print("\n🎉 All tests passed! Integration is ready.")
        print("\nNext steps:")
        print("  1. Run: uv run main.py --help")
        print("  2. Test with a video file: uv run main.py path/to/video.mp4")
    else:
        print("\n⚠️ Some tests failed. Please fix the issues above.")
        sys.exit(1)
