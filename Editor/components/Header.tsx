
import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="bg-dark-surface p-4 shadow-lg border-b-2 border-dark-border">
      <h1 className="text-2xl md:text-3xl font-display text-center font-bold">
        <span className="text-brand-pink">Nano-Banana</span>{' '}
        <span className="text-brand-teal">Shorts Editor</span>
      </h1>
    </header>
  );
};
