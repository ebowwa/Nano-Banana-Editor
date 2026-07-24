
export interface Frame {
  id: number;
  data: string; // base64 encoded image data
  mimeType: string;
}

export interface AISuggestion {
  frameIndex: number;
  suggestion: string;
}

export interface EditingAction {
  tool: string; // Name of the tool to use
  params: Record<string, any>; // Parameters for the tool
  description: string; // Human-readable description of what this does
}

export interface ClipSuggestion {
  startTime: number; // Time in seconds (using time-based approach)
  endTime: number; // Time in seconds
  duration: number; // Duration in seconds
  reason: string;
  viralPotential: 'low' | 'medium' | 'high';
  editingSuggestions: string[]; // Human-readable suggestions
  editingActions?: EditingAction[]; // Automated actions to apply
}
