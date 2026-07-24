import { Type } from "@google/genai";

export const suggestionSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        frameIndex: {
          type: Type.NUMBER,
          description: 'The time in seconds, relative to the start of the clip, where the suggestion applies. Can be a float.',
        },
        suggestion: {
          type: Type.STRING,
          description: 'A creative and actionable editing suggestion for this frame. e.g., "Add celebratory confetti" or "Overlay text: \'Unbelievable!\'"',
        },
      },
      required: ['frameIndex', 'suggestion'],
    },
};

export const clipSuggestionSchema = {
    type: Type.OBJECT,
    properties: {
      startTime: {
        type: Type.NUMBER,
        description: 'The starting time in seconds for the optimized clip (relative to the analyzed video segment).',
      },
      endTime: {
        type: Type.NUMBER,
        description: 'The ending time in seconds for the optimized clip (relative to the analyzed video segment).',
      },
      duration: {
        type: Type.NUMBER,
        description: 'The duration of the clip in seconds (ideally 5-10 seconds for optimal virality).',
      },
      reason: {
        type: Type.STRING,
        description: 'Explanation of why this specific sequence was chosen for viral potential.',
      },
      viralPotential: {
        type: Type.STRING,
        enum: ['low', 'medium', 'high'],
        description: 'Assessment of the viral potential of this clip.',
      },
      editingSuggestions: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING,
        },
        description: 'Specific editing suggestions to enhance the viral potential of this clip.',
      },
      editingActions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            tool: {
              type: Type.STRING,
              enum: ['trim', 'textOverlay', 'effects', 'audio', 'cropZoom', 'speed', 'colorGrading', 'transition'],
              description: 'The editing tool to use',
            },
            params: {
              type: Type.OBJECT,
              description: 'Parameters specific to the tool',
              properties: {
                // Generic parameters that could be used by any tool
                text: { type: Type.STRING },
                startTime: { type: Type.NUMBER },
                endTime: { type: Type.NUMBER },
                duration: { type: Type.NUMBER },
                position: { 
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER }
                  }
                },
                effect: { type: Type.STRING },
                audioType: { type: Type.STRING },
                volume: { type: Type.NUMBER },
                fadeIn: { type: Type.BOOLEAN },
                fadeOut: { type: Type.BOOLEAN },
                cropArea: {
                  type: Type.OBJECT,
                  properties: {
                    x: { type: Type.NUMBER },
                    y: { type: Type.NUMBER },
                    width: { type: Type.NUMBER },
                    height: { type: Type.NUMBER }
                  }
                },
                zoomLevel: { type: Type.NUMBER },
                panDirection: { type: Type.STRING },
                speedMultiplier: { type: Type.NUMBER },
                preset: { type: Type.STRING },
                intensity: { type: Type.NUMBER },
                type: { type: Type.STRING }
              }
            },
            description: {
              type: Type.STRING,
              description: 'Human-readable description of what this action does',
            },
          },
          required: ['tool', 'params', 'description'],
        },
        description: 'Automated editing actions to apply using the available tools.',
      },
    },
    required: ['startTime', 'endTime', 'duration', 'reason', 'viralPotential', 'editingSuggestions'],
};
