import React, { useState } from 'react';
import type { AISuggestion, Frame, ClipSuggestion } from '../types';
import { useVideo } from '../contexts/VideoContext';

interface AIControlPanelProps {
  onAnalyze: () => void;
  onEdit: (prompt: string) => void;
  onBatchEdit: (prompt: string, frameIndices: number[]) => void;
  onAnalyzeClips: () => void;
  onUseClip?: (startTime: number, endTime: number) => void;
  onApplyOptimizations?: (actions: any[]) => void;
  suggestions: AISuggestion[];
  clipSuggestion: ClipSuggestion | null;
  selectedFrame: Frame | null;
  selectedFrameIndices: number[];
}

const EditSection: React.FC<{ 
    selectedFrame: Frame | null; 
    selectedFrameIndices: number[];
    onEdit: (prompt: string) => void;
    onBatchEdit: (prompt: string, frameIndices: number[]) => void;
}> = ({ selectedFrame, selectedFrameIndices, onEdit, onBatchEdit }) => {
    const [prompt, setPrompt] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(prompt.trim()) {
            if (selectedFrameIndices.length > 1) {
                onBatchEdit(prompt, selectedFrameIndices);
            } else {
                onEdit(prompt);
            }
        }
    };

    const hasMultipleSelection = selectedFrameIndices.length > 1;
    const hasSelection = selectedFrame || hasMultipleSelection;
    
    return (
        <div className="mt-6 p-4 border border-dark-border rounded-lg bg-gray-900/50">
            <h3 className="text-lg font-display text-brand-pink mb-3">
                {hasMultipleSelection 
                    ? `Edit ${selectedFrameIndices.length} Frames` 
                    : `Edit Frame ${selectedFrame ? `#${selectedFrame.id + 1}` : ''}`
                }
            </h3>
            {hasMultipleSelection && (
                <div className="mb-3 p-2 bg-brand-teal/20 border border-brand-teal/30 rounded text-sm">
                    <span className="text-brand-teal font-semibold">Multi-selection:</span>
                    <span className="text-gray-300 ml-1">
                        Frames {selectedFrameIndices.map(i => i + 1).join(', ')}
                    </span>
                </div>
            )}
            {hasSelection ? (
                <form onSubmit={handleSubmit}>
                    <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="e.g., 'Add sunglasses to the person' or 'make the sky purple'"
                        className="w-full h-24 p-2 bg-dark-surface border border-dark-border rounded-md focus:ring-2 focus:ring-brand-pink focus:outline-none transition-shadow"
                    />
                    <button 
                        type="submit"
                        disabled={!prompt.trim()}
                        className="mt-3 w-full bg-brand-pink text-white font-bold py-2 px-4 rounded-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg focus:ring-brand-pink transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed">
                        {hasMultipleSelection ? `Generate Edit for ${selectedFrameIndices.length} Frames` : 'Generate Edit'}
                    </button>
                </form>
            ) : (
                <p className="text-gray-400 italic">Select frame(s) from the gallery to start editing. Hold Shift to select multiple frames.</p>
            )}
        </div>
    );
};

const ClipAnalysisSection: React.FC<{ 
    clipSuggestion: ClipSuggestion | null; 
    onAnalyzeClips: () => void; 
    onUseClip?: (startTime: number, endTime: number) => void;
    onApplyOptimizations?: (actions: any[]) => void;
}> = ({ clipSuggestion, onAnalyzeClips, onUseClip, onApplyOptimizations }) => {
    const [hasAnalyzedClips, setHasAnalyzedClips] = useState(false);
    const { frames } = useVideo();
    const hasFrames = frames.length > 0;

    const handleAnalyzeClipsClick = () => {
        onAnalyzeClips();
        setHasAnalyzedClips(true);
    };

    const getViralPotentialColor = (potential: string) => {
        switch (potential) {
            case 'high': return 'text-green-400';
            case 'medium': return 'text-yellow-400';
            case 'low': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    return (
        <div className="mt-6 p-4 border border-dark-border rounded-lg bg-gray-900/50">
            <h3 className="text-lg font-display text-brand-pink mb-3">Optimized Clips</h3>
            
            <button
                onClick={handleAnalyzeClipsClick}
                disabled={!hasFrames || hasAnalyzedClips}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2 px-4 rounded-md hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg focus:ring-brand-pink transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                {hasAnalyzedClips ? 'Clip Analysis Complete' : 'Find Optimized Viral Clip'}
            </button>

            {clipSuggestion && (
                <div className="mt-4 space-y-3">
                    <div className="p-3 bg-gray-800/50 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-gray-300">Viral Potential:</span>
                            <span className={`font-bold ${getViralPotentialColor(clipSuggestion.viralPotential)}`}>
                                {clipSuggestion.viralPotential.toUpperCase()}
                            </span>
                        </div>
                        <div className="text-sm text-gray-400 mb-2">
                            <span className="font-semibold">Duration:</span> {clipSuggestion.duration.toFixed(1)}s
                        </div>
                        <div className="text-sm text-gray-400 mb-2">
                            <span className="font-semibold">Time Range:</span> {clipSuggestion.startTime.toFixed(1)}s - {clipSuggestion.endTime.toFixed(1)}s
                        </div>
                        <p className="text-sm text-gray-300 mb-3">{clipSuggestion.reason}</p>
                        
                        {clipSuggestion.editingActions && clipSuggestion.editingActions.length > 0 ? (
                            <div className="space-y-2 mt-3">
                                <h4 className="font-semibold text-gray-300 text-sm">Optimizations Ready:</h4>
                                <ul className="space-y-1">
                                    {clipSuggestion.editingActions.map((action, index) => (
                                        <li key={index} className="text-xs text-gray-400 bg-gray-700/30 p-2 rounded flex items-center">
                                            <span className="font-mono text-brand-teal mr-2">[{action.tool}]</span>
                                            {action.description}
                                        </li>
                                    ))}
                                </ul>
                                {onApplyOptimizations && (
                                    <button
                                        onClick={() => onApplyOptimizations(clipSuggestion.editingActions!)}
                                        className="w-full mt-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-2 px-4 rounded-md hover:from-purple-700 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg focus:ring-purple-500 transition-colors text-sm"
                                    >
                                        Apply Optimizations with Nano Banana
                                    </button>
                                )}
                            </div>
                        ) : clipSuggestion.editingSuggestions && (
                            <div className="space-y-2">
                                <h4 className="font-semibold text-gray-300 text-sm">Suggested Optimizations:</h4>
                                <ul className="space-y-1">
                                    {clipSuggestion.editingSuggestions.map((suggestion, index) => (
                                        <li key={index} className="text-xs text-gray-400 bg-gray-700/30 p-2 rounded">
                                            • {suggestion}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        
                        {onUseClip && (
                            <button
                                onClick={() => onUseClip(clipSuggestion.startTime, clipSuggestion.endTime)}
                                className="w-full mt-3 bg-gradient-to-r from-green-600 to-teal-600 text-white font-bold py-2 px-4 rounded-md hover:from-green-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg focus:ring-green-500 transition-colors"
                            >
                                Use This Optimized Clip
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export const AIControlPanel: React.FC<AIControlPanelProps> = ({ 
    onAnalyze, 
    onEdit, 
    onBatchEdit,
    onAnalyzeClips, 
    onUseClip,
    onApplyOptimizations, 
    suggestions, 
    clipSuggestion, 
    selectedFrame,
    selectedFrameIndices 
}) => {
    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    const { frames } = useVideo();
    const hasFrames = frames.length > 0;

    const handleAnalyzeClick = () => {
        onAnalyze();
        setHasAnalyzed(true);
    };

    return (
        <div className="bg-dark-surface rounded-lg shadow-lg p-6 border border-dark-border h-full flex flex-col animate-fadeIn">
            {/* <h2 className="text-2xl font-display text-brand-teal mb-4">AI Assistant</h2>
            
            <button
                onClick={handleAnalyzeClick}
                disabled={!hasFrames || hasAnalyzed}
                className="w-full bg-brand-purple text-white font-bold py-2 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-bg focus:ring-brand-purple transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                {hasAnalyzed ? 'Analysis Complete' : 'Analyze Video with Gemini'}
            </button>
            
            <div className="mt-6 flex-grow overflow-y-auto">
                <h3 className="text-lg font-display text-brand-teal mb-2">Suggestions</h3>
                {suggestions.length > 0 ? (
                    <ul className="space-y-3">
                        {suggestions.map((s, i) => (
                            <li key={i} className="p-3 bg-gray-900/50 border-l-4 border-brand-teal rounded-r-md text-sm">
                                <span className="font-bold text-gray-300">Time {s.frameIndex.toFixed(1)}s:</span>
                                <p className="text-gray-400">{s.suggestion}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-500 italic text-sm">
                        {hasAnalyzed ? 'No specific suggestions were generated.' : 'Click "Analyze Video" to get AI-powered editing ideas.'}
                    </p>
                )}
            </div> */}

            <ClipAnalysisSection 
                clipSuggestion={clipSuggestion} 
                onAnalyzeClips={onAnalyzeClips} 
                onUseClip={onUseClip}
                onApplyOptimizations={onApplyOptimizations} 
            />
            <EditSection 
                selectedFrame={selectedFrame} 
                selectedFrameIndices={selectedFrameIndices}
                onEdit={onEdit} 
                onBatchEdit={onBatchEdit}
            />
        </div>
    );
};