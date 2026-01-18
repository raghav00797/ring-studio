"use client";

import React, { useRef, useState, useEffect } from 'react';
import { Hand, Play, Pause, RotateCw, RefreshCw } from 'lucide-react';

export const Ring360Viewer = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startVideoTime, setStartVideoTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [loading, setLoading] = useState(true);

  // Toggle play/pause
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const reloadVideo = () => {
    if (videoRef.current) {
      setLoading(true);
      videoRef.current.load();
    }
  };

  // Drag handlers
  const handleStart = (clientX: number) => {
    if (!videoRef.current) return;
    
    // Pause if it was playing to allow manual control
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    setIsDragging(true);
    setHasInteracted(true);
    setStartX(clientX);
    setStartVideoTime(videoRef.current.currentTime);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    // e.preventDefault(); // Don't prevent default here to allow click events on buttons if any
    handleStart(e.touches[0].clientX);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || !videoRef.current || !containerRef.current) return;

    const containerWidth = containerRef.current.clientWidth;
    const deltaX = clientX - startX;
    
    // Calculate percentage of container dragged
    // Dragging full width = 1 full rotation (video duration)
    const percentDragged = deltaX / containerWidth;
    
    const duration = videoRef.current.duration || 1;
    
    // Invert direction: Drag Left -> Rotate Right (Time moves forward or backward depending on preference)
    let newTime = startVideoTime - (percentDragged * duration);

    // Normalize loop
    if (newTime < 0) newTime += duration;
    if (newTime > duration) newTime -= duration;
    
    // Smooth seek
    videoRef.current.currentTime = newTime;
  };

  const handleMouseMove = (e: MouseEvent) => handleMove(e.clientX);
  const handleTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);

  const handleEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleEnd);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]); // Dependencies for event listeners

  const handleLoadedMetadata = () => {
    setLoading(false);
    // Removed automatic pause here to let autoPlay work for debugging
    // if (videoRef.current) {
    //   videoRef.current.pause();
    //   videoRef.current.currentTime = 0;
    // }
  };

  const handleError = () => {
    console.error("Video failed to load");
    // Removed setLoading(false) to hide error state for now
  };

  return (
    <div className="flex flex-col gap-4 w-full max-w-4xl mx-auto">
      <div className="relative w-full aspect-video md:aspect-[16/9] bg-black rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 group">
        
        {/* Container for event listeners */}
        <div 
          ref={containerRef}
          className={`absolute inset-0 z-10 cursor-grab active:cursor-grabbing touch-none ${isDragging ? 'cursor-grabbing' : ''}`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Loading Spinner */}
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black text-white/50">
              <RotateCw className="w-10 h-10 animate-spin" />
            </div>
          )}

          {/* Interaction Overlay (Hand Icon) */}
          {!hasInteracted && !loading && !isPlaying && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-500">
              <div className="bg-black/60 backdrop-blur-sm p-4 rounded-full border border-white/20 animate-pulse">
                <Hand className="w-8 h-8 text-white" />
              </div>
              <p className="mt-4 text-white/80 font-light tracking-widest uppercase text-sm drop-shadow-md">
                Drag to Rotate
              </p>
            </div>
          )}
        </div>

        {/* Video Element */}
        <video
          ref={videoRef}
          className="w-full h-full object-contain pointer-events-none select-none bg-black"
          src="/ring-360.mp4"
          playsInline
          muted
          autoPlay
          loop
          onLoadedMetadata={handleLoadedMetadata}
          onError={handleError}
          width="100%"
          height="100%"
        />

        {/* Controls UI */}
        <div className="absolute bottom-6 left-6 z-20 pointer-events-none">
          <button
            onClick={(e) => {
              e.stopPropagation(); // Prevent drag start
              togglePlay();
            }}
            className="pointer-events-auto flex items-center gap-3 px-5 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full border border-white/10 transition-all duration-300 group/btn"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white fill-current" />
            ) : (
              <Play className="w-5 h-5 text-white fill-current ml-0.5" />
            )}
            <span className="text-xs font-bold text-white uppercase tracking-widest opacity-0 group-hover/btn:opacity-100 max-w-0 group-hover/btn:max-w-[100px] overflow-hidden transition-all duration-300 whitespace-nowrap">
              {isPlaying ? 'Pause' : 'Preview'}
            </span>
          </button>
        </div>
        
      </div>

      {/* Re-sync Button */}
      <div className="flex justify-center">
        <button 
          onClick={reloadVideo}
          className="flex items-center gap-2 text-xs uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Re-sync Video
        </button>
      </div>
    </div>
  );
};
