# Nano-Banana-Shorts-Editor Architecture Documentation

## Project Overview

Nano-Banana-Shorts-Editor is the **integration project** that orchestrates AI-powered video editing for marketing materials. This repository serves as the main application layer that combines two foundational libraries to create an automated video editing pipeline.

## System Architecture

### Repository Dependencies

```
Nano-Banana-Shorts-Editor (Main Application)
├── ai-proxy-core (AI Processing Layer)
│   ├── Gemini for video analysis
│   ├── Model management & routing
│   └── Unified AI interface
└── media-processor (Media Operations Layer)
    ├── Video frame extraction
    └── Format conversions
```

## Core Dependencies

### 1. ai-proxy-core (v0.4.40+)
**Repository**: `ebowwa/ai-proxy-core`
**Role**: AI abstraction and processing layer

**Key Features Used**:
- **Gemini Integration**: Video content analysis and decision making
- **Unified AI Interface**: Single client for multiple AI providers
- **Model Management**: Intelligent model selection and routing
- **Image Generation**: DALL-E integration for enhanced content creation
- **WebSocket Support**: Real-time AI interactions via Gemini Live

**Integration Points**:
```python
from ai_proxy_core import CompletionClient, GeminiLiveSession

# Video analysis
client = CompletionClient()
analysis = await client.create_completion(
    messages=[{"role": "user", "content": "Analyze this video for enhancement opportunities"}],
    model="gemini-1.5-flash"
)

# Real-time processing
session = GeminiLiveSession(api_key="...", enable_code_execution=True)
```

### 2. media-processor
**Repository**: `ebowwa/media-processor`
**Role**: Media processing and manipulation engine

**Key Features Used**:
- **Frame Extraction**: Extract frames from videos at specified intervals
- **Format Conversion**: Handle various media format transformations
- **Batch Processing**: Process multiple files efficiently

**Integration Points**:
```python
from media_processor import VideoFrameExtractor, WebPConverter

# Post-AI inference: Extract only frames identified by Gemini
selected_timestamps = gemini_analysis["frames_to_edit"]
extractor = VideoFrameExtractor()
for timestamp in selected_timestamps:
    frame = extractor.extract_frame_at_time("input.mp4", timestamp)
    
# Apply format conversions and basic processing as needed
converter = WebPConverter()
converter.process(selected_frames, processed_frames)
```

## Planned Workflow

### Phase 1: Video Upload & Initial Processing
1. User uploads source video
2. Video prepared for AI analysis (direct processing or initial frame extraction)

### Phase 2: AI Analysis & Decision Making (Primary Intelligence Layer)
1. **ai-proxy-core** sends video/frames to Gemini for comprehensive analysis
2. Gemini AI determines:
   - Which specific frames need editing/enhancement
   - What type of effects should be applied to each frame
   - Optimal moments for text overlays and positioning
   - Vector points for augmentation and object tracking
   - Scene transitions and key moments for enhancement

### Phase 3: Targeted Frame Processing (Post-AI Inference)
1. Based on Gemini's analysis, **media-processor** extracts only the frames identified for editing
2. **ai-proxy-core** generates specific overlay content, translations, and effects for identified frames
3. **media-processor** applies targeted processing:
   - Extracting specific frames as determined by AI
   - Format conversions for frames that need modification
   - Basic processing operations on AI-identified frames

### Phase 4: Video Reconstruction & Output
1. Enhanced frames reintegrated into original video timeline
2. Effects, text overlays, and enhancements applied at AI-determined timestamps
3. Output optimized for target platform (social media, marketing)

## Use Cases

### 1. Overlay Commentator Content
- AI identifies key moments for commentary
- Generates contextual text overlays
- Positions overlays optimally in frame

### 2. Multi-language Translations
- Extracts text from video frames
- Translates content using AI
- Replaces original text with translations

### 3. General Editor Functionality
- Automated scene detection
- Smart cropping and framing
- Color correction and enhancement

### 4. AR/MR Functionality
- Object detection and tracking
- 3D effect placement
- Augmented reality overlays

## Technical Implementation Strategy

### Data Flow
```
Video Input → AI Analysis → Frame Selection → Enhancement Generation → Targeted Processing → Video Output
     ↓             ↓              ↓                    ↓                      ↓               ↓
  Raw Video → ai-proxy-core → ai-proxy-core → ai-proxy-core → media-processor → Final Product
                  ↓                                                    ↑
            (Gemini determines                                  (Processes only
             which frames to edit)                              AI-selected frames)
```

### Key Integration Patterns

1. **Async Processing Pipeline**: Leverage ai-proxy-core's async capabilities
2. **Batch Operations**: Use media-processor's batch processing for efficiency
3. **Model Selection**: Utilize ai-proxy-core's intelligent model routing
4. **Error Handling**: Implement robust error handling across both libraries

## Development Roadmap

### Phase 1: Foundation (Current)
- [x] ai-proxy-core: Production ready (v0.4.40)
- [x] media-processor: Complete CLI tool
- [ ] Integration layer architecture design

### Phase 2: Core Integration
- [ ] Implement video upload and preprocessing
- [ ] Integrate AI analysis pipeline
- [ ] Basic frame enhancement workflow

### Phase 3: Advanced Features
- [ ] Real-time processing with Gemini Live
- [ ] Multi-language support
- [ ] AR/MR functionality

### Phase 4: Production
- [ ] Performance optimization
- [ ] User interface development
- [ ] Deployment and scaling

## Benefits of This Architecture

### Separation of Concerns
- **ai-proxy-core**: Handles all AI operations and model management
- **media-processor**: Manages all media manipulation tasks
- **Nano-Banana-Shorts-Editor**: Orchestrates workflow and user experience

### Reusability
- Both dependency libraries can be used independently
- Modular design allows for easy testing and maintenance
- Clear interfaces between components

### Scalability
- AI processing can be scaled independently
- Media processing can be optimized separately
- Easy to add new AI providers or media formats

### Maintainability
- Each repository has focused responsibility
- Updates to AI capabilities don't affect media processing
- Clear dependency management and versioning

## Getting Started (Future)

Once implementation begins, the setup will involve:

```bash
# Install dependencies
pip install ai-proxy-core>=0.4.40
pip install media-processor

# Clone integration project
git clone https://github.com/ebowwa/Nano-Banana-Shorts-Editor.git
cd Nano-Banana-Shorts-Editor

# Install integration layer
pip install -e .
```

## Contributing

This project integrates two mature libraries:
- Contribute AI improvements to `ebowwa/ai-proxy-core`
- Contribute media processing features to `ebowwa/media-processor`
- Contribute integration and workflow improvements to this repository

---

*This architecture documentation will be updated as the integration project develops.*
