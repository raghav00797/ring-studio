"use client";

import React, { useState, useEffect } from "react";
import { Diamond360Viewer } from "@/components/Diamond360Viewer";
import { MetalSelector, MetalType } from "@/components/MetalSelector";
import { Gem } from "lucide-react";

export default function Home() {
  const [metal, setMetal] = useState<MetalType>("gold");

  // Update CSS variables for the accent color
  useEffect(() => {
    const root = document.documentElement;
    let rgb = "212, 175, 55"; // Default Gold

    if (metal === "silver") {
      rgb = "192, 192, 192";
    } else if (metal === "rose-gold") {
      rgb = "183, 110, 121";
    }

    root.style.setProperty("--accent", rgb);
  }, [metal]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-[rgb(var(--background))] text-[rgb(var(--foreground))] selection:bg-[rgba(var(--accent),0.3)]">
      
      {/* Header / Nav */}
      <header className="fixed top-0 left-0 w-full p-6 flex justify-between items-center z-50 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <Gem className="w-8 h-8 text-[rgb(var(--accent))] transition-colors duration-500" />
          <h1 className="text-2xl font-serif tracking-widest uppercase">Luxe Gems</h1>
        </div>
        <nav className="pointer-events-auto hidden md:flex gap-8 text-sm uppercase tracking-widest text-gray-400">
          <a href="#" className="hover:text-[rgb(var(--accent))] transition-colors">Collections</a>
          <a href="#" className="hover:text-[rgb(var(--accent))] transition-colors">Bespoke</a>
          <a href="#" className="hover:text-[rgb(var(--accent))] transition-colors">About</a>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="w-full max-w-6xl flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24 pt-20">
        
        {/* Left: Content */}
        <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left space-y-8 z-10">
          <h2 className="text-5xl md:text-7xl font-serif leading-tight">
            Timeless <br />
            <span className="text-[rgb(var(--accent))] transition-colors duration-500">Elegance</span>
          </h2>
          <p className="text-gray-400 max-w-md leading-relaxed">
            Discover the brilliance of our hand-crafted solitaire diamonds. 
            Customize your perfect piece with our exclusive metal selection.
          </p>
          
          <div className="pt-4">
             <MetalSelector selectedMetal={metal} onSelect={setMetal} />
          </div>

          <div className="pt-8 flex gap-4">
             <button className="px-8 py-3 bg-[rgb(var(--accent))] text-black font-bold uppercase tracking-widest hover:brightness-110 transition-all shadow-[0_0_20px_rgba(var(--accent),0.3)]">
               Shop Now
             </button>
             <button className="px-8 py-3 border border-white/20 text-white font-bold uppercase tracking-widest hover:bg-white/5 transition-all">
               Book Appointment
             </button>
          </div>
        </div>

        {/* Right: Viewer */}
        <div className="flex-1 w-full relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[radial-gradient(circle_at_center,rgba(var(--accent),0.15),transparent_70%)] blur-3xl -z-10 transition-colors duration-500" />
          <Diamond360Viewer />
        </div>

      </section>

      {/* Footer / Status */}
      <div className="fixed bottom-6 w-full text-center text-xs text-gray-600 uppercase tracking-widest pointer-events-none">
        Scroll to Explore • Drag to Rotate
      </div>

    </main>
  );
}
