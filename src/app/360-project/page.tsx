"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Play, Pause, RotateCcw, Hand, ZoomIn } from "lucide-react";

export default function Project360Page() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showHand, setShowHand] = useState(true);
  const [zoomed, setZoomed] = useState(false);
  const virtualTimeRef = useRef<number>(0);
  const targetTimeRef = useRef<number>(0);
  const dragStartXRef = useRef<number>(0);
  const dragStartTimeRef = useRef<number>(0);
  const dragStartTsRef = useRef<number>(0);
  const FRAME_STEP = 0.1;
  const SENSITIVITY = 2.0;
  const LERP_FACTOR = 0.18;
  const FLICK_THRESHOLD = 0.6;

  const animate = useCallback(() => {
    if (videoRef.current && !isPlaying) {
      const video = videoRef.current;
      const duration = video.duration || 1;
      const diff = targetTimeRef.current - virtualTimeRef.current;
      if (Math.abs(diff) > 0.001) {
        virtualTimeRef.current += diff * LERP_FACTOR;
        let time = virtualTimeRef.current % duration;
        if (time < 0) time += duration;
        const snapped = Math.round(time / FRAME_STEP) * FRAME_STEP;
        video.currentTime = snapped % duration;
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [isPlaying]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [animate]);

  useEffect(() => {
    if (isPlaying && videoRef.current) {
      const interval = setInterval(() => {
        if (videoRef.current) {
          virtualTimeRef.current = videoRef.current.currentTime;
          targetTimeRef.current = videoRef.current.currentTime;
        }
      }, 120);
      return () => clearInterval(interval);
    }
  }, [isPlaying]);

  const startDrag = (clientX: number) => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      virtualTimeRef.current = videoRef.current.currentTime;
      targetTimeRef.current = videoRef.current.currentTime;
    }
    setIsDragging(true);
    setShowHand(false);
    dragStartXRef.current = clientX;
    dragStartTimeRef.current = targetTimeRef.current;
    dragStartTsRef.current = performance.now();
  };

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startDrag(e.clientX);
  };
  const onTouchStart = (e: React.TouchEvent) => {
    startDrag(e.touches[0].clientX);
  };

  const updateTarget = (clientX: number) => {
    if (!isDragging || !containerRef.current || !videoRef.current) return;
    const width = containerRef.current.clientWidth;
    const deltaX = clientX - dragStartXRef.current;
    const percent = deltaX / width;
    const duration = videoRef.current.duration || 1;
    const timeDelta = -percent * duration * SENSITIVITY;
    targetTimeRef.current = dragStartTimeRef.current + timeDelta;
  };

  const onMouseMove = (e: MouseEvent) => updateTarget(e.clientX);
  const onTouchMove = (e: TouchEvent) => updateTarget(e.touches[0].clientX);

  const endDrag = () => {
    if (videoRef.current) {
      const elapsed = performance.now() - dragStartTsRef.current;
      const velocity = Math.abs((dragStartXRef.current - (dragStartXRef.current + 0)) / (elapsed || 1));
      if (velocity > FLICK_THRESHOLD) {
        videoRef.current.playbackRate = 2.0;
        videoRef.current.play();
        setIsPlaying(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.playbackRate = 1.0;
            setIsPlaying(false);
          }
        }, 800);
      }
    }
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", endDrag);
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", endDrag);
    } else {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", endDrag);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", endDrag);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", endDrag);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", endDrag);
    };
  }, [isDragging]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggle360 = () => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = 1.25;
    videoRef.current.play();
    setIsPlaying(true);
  };

  const toggleZoom = () => {
    setZoomed((z) => !z);
  };

  const resetVideo = () => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    virtualTimeRef.current = 0;
    targetTimeRef.current = 0;
    setIsPlaying(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowHand(false), 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-gray-800 flex flex-col items-center justify-center p-8">
      <div className="relative w-full max-w-5xl aspect-video bg-white rounded-xl overflow-hidden shadow-xl border border-gray-200">
        <div
          ref={containerRef}
          className={`absolute inset-0 z-10 ${isDragging ? "cursor-grabbing" : "cursor-grab"} touch-none`}
          onMouseDown={onMouseDown}
          onTouchStart={onTouchStart}
        >
          {showHand && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 px-6 py-3 rounded-full border border-gray-200 shadow-sm flex items-center gap-3">
                <Hand className="w-5 h-5 text-gray-700" />
                <span className="text-gray-700 font-medium tracking-wide text-sm">Drag to Rotate</span>
              </div>
            </div>
          )}
        </div>
        <div className={`w-full h-full ${zoomed ? "scale-[1.15]" : "scale-100"} transition-transform duration-300`}>
          <video
            ref={videoRef}
            className="w-full h-full object-contain select-none pointer-events-none"
            src="/ring-360.mp4"
            playsInline
            muted
            loop
            preload="auto"
          />
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="px-4 py-2 bg-white border border-gray-200 rounded-full text-gray-800 hover:bg-gray-50"
          aria-label="Play"
        >
          <Play className="w-4 h-4" />
        </button>
        <button
          onClick={togglePlay}
          className="px-4 py-2 bg-white border border-gray-200 rounded-full text-gray-800 hover:bg-gray-50"
          aria-label="Pause"
        >
          <Pause className="w-4 h-4" />
        </button>
        <button
          onClick={toggle360}
          className="px-4 py-2 bg-white border border-gray-200 rounded-full text-gray-800 hover:bg-gray-50"
          aria-label="360 Toggle"
        >
          <span className="text-xs font-semibold">360</span>
        </button>
        <button
          onClick={toggleZoom}
          className="px-4 py-2 bg-white border border-gray-200 rounded-full text-gray-800 hover:bg-gray-50"
          aria-label="Zoom"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={resetVideo}
          className="px-4 py-2 bg-white border border-gray-200 rounded-full text-gray-800 hover:bg-gray-50"
          aria-label="Reset"
          title="Reset View"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-3 text-sm text-gray-500">
        Interactive 360° View
      </div>
    </div>
  );
}
