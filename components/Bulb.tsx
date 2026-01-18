
import React from 'react';

interface BulbProps {
  isOn: boolean;
}

const Bulb: React.FC<BulbProps> = ({ isOn }) => {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-[#1a1a1a] rounded-lg border border-[#222] shadow-inner">
      <div className="relative mb-2">
        <div className={`w-10 h-14 rounded-t-full transition-all duration-300 border-b-2 border-black/50 ${
          isOn ? 'bg-red-500 shadow-[0_0_30px_#ef4444]' : 'bg-red-950/20 opacity-40'
        }`}>
          {isOn && <div className="absolute inset-0 bg-red-400/40 rounded-t-full blur-lg"></div>}
          <div className="absolute top-2 left-2 w-1.5 h-3 bg-white/20 rounded-full"></div>
        </div>
        <div className="flex justify-center px-2 relative -bottom-2">
          {/* Visual Leg */}
          <div className="w-0.5 h-8 bg-gray-500"></div>
        </div>
      </div>
      <div className="h-4"></div>
      <span className={`text-[8px] font-black tracking-[0.2em] uppercase transition-colors duration-500 ${isOn ? 'text-red-400' : 'text-gray-800'}`}>
        {isOn ? 'OUTPUT HIGH' : 'OUTPUT LOW'}
      </span>
    </div>
  );
};

export default Bulb;
