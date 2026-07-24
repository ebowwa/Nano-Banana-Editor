import React, { useCallback, useState, useEffect } from 'react';
import { useGoogleDrivePicker } from '../hooks/useGoogleDrivePicker';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  setErrorMessage: (message: string | null) => void;
}

const UploadIcon: React.FC = () => (
    <svg className="w-12 h-12 mb-4 text-brand-teal" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
    </svg>
);

const GoogleDriveIcon: React.FC = () => (
    <svg className="w-12 h-12 mb-4 text-gray-400 group-hover:text-white transition-colors" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M34.46 28.253l-6.109 10.582-12.804-22.176 6.109-10.582 12.804 22.176z" fill="#3777e3"/>
        <path d="M15.547 6.079l-6.109 10.582L3 28.253l6.109-10.582L15.547 6.08z" fill="#30a952"/>
        <path d="M38.89 28.253l-6.109-10.582L45 7.089l-6.11 21.164z" fill="#fbc02d"/>
    </svg>
);


export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, setErrorMessage }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { openPicker, error: pickerError, isReady, isConfigured } = useGoogleDrivePicker({ onVideoSelect: onFileSelect });

  useEffect(() => {
    if (pickerError) {
      setErrorMessage(`Google Drive Error: ${pickerError}`);
    }
  }, [pickerError, setErrorMessage]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('video/')) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  return (
    <div className="w-full max-w-4xl text-center animate-fadeIn">
      <div className="grid md:grid-cols-2 gap-8">
        {/* Option 1: Upload from Device */}
        <label
          htmlFor="video-upload"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          className={`flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 group
                      ${isDragging ? 'border-brand-pink bg-dark-surface' : 'border-dark-border bg-gray-900/50 hover:bg-dark-surface hover:border-brand-teal'}`}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadIcon />
            <p className="mb-2 text-lg text-gray-400"><span className="font-semibold text-brand-pink">Upload from Device</span></p>
            <p className="text-sm text-gray-500">Drag & drop or click to browse</p>
            <p className="text-xs text-gray-600 mt-2">MP4, MOV, WEBM, etc.</p>
          </div>
          <input id="video-upload" type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
        </label>
        
        {/* Option 2: Select from Google Drive */}
        <button
          type="button"
          onClick={openPicker}
          disabled={!isReady}
          className="flex flex-col items-center justify-center w-full h-80 border-2 border-dashed rounded-lg cursor-pointer transition-all duration-300 group border-dark-border bg-gray-900/50 hover:bg-dark-surface hover:border-brand-purple disabled:cursor-not-allowed disabled:opacity-50"
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <GoogleDriveIcon />
            <p className="mb-2 text-lg text-gray-400"><span className="font-semibold text-brand-purple">Select from Google Drive</span></p>
            <p className="text-sm text-gray-500">Import a video from your Drive</p>
             {!isConfigured ? (
                <p className="text-xs text-yellow-500 mt-2">Feature not configured.</p>
             ) : !isReady ? (
                <p className="text-xs text-yellow-400 mt-2 animate-pulse">Initializing...</p>
             ) : pickerError ? (
                <p className="text-xs text-red-400 mt-2">Could not connect to Drive.</p>
             ) : null}
          </div>
        </button>
      </div>
    </div>
  );
};