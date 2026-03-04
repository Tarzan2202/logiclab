
import React from 'react';

interface BulbProps {
  isOn: boolean;
  brightness?: number;
}

const Bulb: React.FC<BulbProps> = ({ isOn, brightness = 1 }) => {
  return (
    <div className="flex items-center gap-2 group">
      <div className="w-6 h-6 bg-[#f3f4f6] rounded-full border-2 border-gray-300 shadow-[inset_0_1px_2px_rgba(0,0,0,0.1)] flex items-center justify-center relative overflow-hidden">
        {/* LED Diffuser */}
        <div 
          className={`w-3.5 h-3.5 rounded-full transition-all duration-200 relative ${
            isOn 
              ? 'bg-red-500 border-red-400' 
              : 'bg-red-900/10 border-red-900/5'
          } border`}
          style={{ 
            opacity: isOn ? 1.0 : 0.3,
            boxShadow: isOn ? `0 0 ${12 * brightness}px rgba(239,68,68,0.9)` : 'none'
          }}
        >
          {/* Reflection highlight */}
          <div className="absolute top-0.5 left-0.5 w-1 h-1 bg-white/40 rounded-full blur-[0.2px]"></div>
        </div>
      </div>
    </div>
  );
};

export default Bulb;
