
import React from 'react';

const LoadingSpinner: React.FC = () => (
  <div className="w-16 h-16 border-4 border-t-brand-pink border-r-brand-pink border-b-brand-purple border-l-brand-teal rounded-full animate-spin"></div>
);

interface LoadingOverlayProps {
  message: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex flex-col items-center justify-center z-50 animate-fadeIn">
      <LoadingSpinner />
      <p className="mt-6 text-xl font-display text-white animate-pulse-glow">{message}</p>
    </div>
  );
};
