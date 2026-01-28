
import React from 'react';

interface BulbProps {
  isOn: boolean;
}

const Bulb: React.FC<BulbProps> = ({ isOn }) => {
  return (
    <div className="flex flex-col items-center gap-1 group">
      <div className="w-10 h-10 bg-[#1a1a1a] rounded-full border border-[#333] shadow-inner flex items-center justify-center relative overflow-hidden">
        {/* LED Diffuser */}
        <div className={`w-5 h-5 rounded-full transition-all duration-200 relative ${
          isOn 
            ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] border-red-400' 
            : 'bg-red-950/30 border-red-900/20'
        } border-2`}>
          {/* Reflection highlight */}
          <div className="absolute top-1 left-1 w-1.5 h-1.5 bg-white/40 rounded-full blur-[0.5px]"></div>
        </div>
        
        {/* Internal Plate effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent to-white/5 pointer-events-none"></div>
      </div>
      <span className={`text-[7px] font-black uppercase transition-colors duration-300 ${isOn ? 'text-red-500' : 'text-white/20'}`}>
        L{isOn ? '•' : ''}
      </span>
    </div>
  );
};

export default Bulb;
