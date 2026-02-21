
import React from 'react';

interface BulbProps {
  isOn: boolean;
  brightness?: number;
}

const Bulb: React.FC<BulbProps> = ({ isOn, brightness = 1 }) => {
  return (
    <div className="flex items-center gap-2 group">
      <div className="w-6 h-6 bg-[#0f1115] rounded-full border border-white/5 shadow-inner flex items-center justify-center relative overflow-hidden">
        {/* LED Diffuser */}
        <div 
          className={`w-3.5 h-3.5 rounded-full transition-all duration-200 relative ${
            isOn 
              ? 'bg-red-500 border-red-400' 
              : 'bg-red-950/20 border-red-900/10'
          } border`}
          style={{ 
            opacity: isOn ? Math.max(0.2, brightness) : 0.2,
            boxShadow: isOn ? `0 0 ${12 * brightness}px rgba(239,68,68,0.9)` : 'none'
          }}
        >
          {/* Reflection highlight */}
          <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white/30 rounded-full blur-[0.2px]"></div>
        </div>
      </div>
    </div>
  );
};

export default Bulb;
