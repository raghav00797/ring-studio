import React from 'react';
import { clsx } from 'clsx';

export type MetalType = 'gold' | 'silver' | 'rose-gold';

interface MetalSelectorProps {
  selectedMetal: MetalType;
  onSelect: (metal: MetalType) => void;
}

const metals: { id: MetalType; name: string; color: string; hex: string }[] = [
  { id: 'gold', name: 'Gold', color: 'bg-[#D4AF37]', hex: '#D4AF37' },
  { id: 'silver', name: 'Silver', color: 'bg-[#C0C0C0]', hex: '#C0C0C0' },
  { id: 'rose-gold', name: 'Rose Gold', color: 'bg-[#B76E79]', hex: '#B76E79' },
];

export const MetalSelector: React.FC<MetalSelectorProps> = ({ selectedMetal, onSelect }) => {
  return (
    <div className="flex flex-col items-center gap-4">
      <h3 className="text-sm uppercase tracking-widest text-gray-400">Select Metal</h3>
      <div className="flex gap-4">
        {metals.map((metal) => (
          <button
            key={metal.id}
            onClick={() => onSelect(metal.id)}
            className={clsx(
              "w-12 h-12 rounded-full border-2 transition-all duration-300 relative group",
              selectedMetal === metal.id 
                ? "border-[rgb(var(--accent))] scale-110 shadow-[0_0_15px_rgba(var(--accent),0.5)]" 
                : "border-transparent hover:border-gray-600"
            )}
            title={metal.name}
            aria-label={`Select ${metal.name}`}
          >
            <span 
              className={clsx(
                "absolute inset-1 rounded-full",
                metal.color
              )} 
            />
          </button>
        ))}
      </div>
      <div className="text-lg font-light tracking-wide transition-colors duration-300" style={{ color: metals.find(m => m.id === selectedMetal)?.hex }}>
        {metals.find(m => m.id === selectedMetal)?.name}
      </div>
    </div>
  );
};
