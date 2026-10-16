import React from 'react';

export const CRTOverlay: React.FC<{ active?: boolean }> = ({ active = true }) => {
  if (!active) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.15)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_4px,3px_100%]" />
      <div className="absolute inset-0 bg-white/5 opacity-[0.01]" />
    </div>
  );
};
