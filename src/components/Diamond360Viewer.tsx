"use client";

import React, { useRef, useState, useEffect } from 'react';
import { RotateCw } from 'lucide-react';

export const Diamond360Viewer = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startVideoTime, setStartVideoTime] = useState(0);
  const [loading, setLoading] = useState(true);

  // Sensitivity: how many pixels of drag corresponds to 1 second of video
  const SENSITIVITY = 0.005; 

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!videoRef.current) return;
    setIsDragging(true);
    
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    
    setStartX(clientX);
    setStartVideoTime(videoRef.current.currentTime);
  };

  const handleMouseMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging || !videoRef.current) return;
    
    // Prevent default to stop scrolling on touch devices while spinning
    if ('touches' in e) {
      // e.preventDefault(); // Be careful with this on passive listeners
    }

    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const deltaX = clientX - startX;
    
    // Calculate new time
    // We want dragging LEFT to rotate one way, RIGHT the other
    // If the video is a 360 rotation, scrubbing time rotates the object.
    
    const duration = videoRef.current.duration || 1;
    let newTime = startVideoTime - (deltaX * SENSITIVITY * duration);
    
    // Normalize time to handle looping
    if (newTime < 0) newTime += duration;
    if (newTime > duration) newTime -= duration;
    
    videoRef.current.currentTime = newTime;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Attach global listeners for drag release/move outside component
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging, startX, startVideoTime]);

  const handleLoadedMetadata = () => {
    setLoading(false);
    if (videoRef.current) {
      // Pause immediately, we control via scrub
      videoRef.current.pause();
    }
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-square bg-black/20 rounded-2xl overflow-hidden backdrop-blur-sm border border-white/10 shadow-2xl">
      {/* Loading State */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center text-white/50">
          <RotateCw className="w-8 h-8 animate-spin" />
        </div>
      )}

      {/* Video Element */}
      {/* Using a placeholder video URL for demonstration if local file is missing */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover pointer-events-none select-none"
        src="/videos/diamond-360.mp4" 
        playsInline
        muted
        loop
        onLoadedMetadata={handleLoadedMetadata}
      />

      {/* Interaction Layer */}
      <div 
        ref={containerRef}
        className={`absolute inset-0 cursor-grab active:cursor-grabbing z-10 flex items-center justify-center transition-opacity duration-300 ${isDragging ? 'opacity-0' : 'opacity-100 hover:opacity-100'}`}
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
      >
        {!loading && !isDragging && (
          <div className="bg-black/40 px-4 py-2 rounded-full text-white/80 text-sm backdrop-blur-md border border-white/10 pointer-events-none select-none flex items-center gap-2">
            <RotateCw className="w-4 h-4" />
            Drag to Spin
          </div>
        )}
      </div>
      
      {/* Overlay to catch events when dragging but cursor moves fast */}
      {isDragging && (
        <div className="absolute inset-0 z-20 cursor-grabbing" />
      )}
    </div>
  );
};
