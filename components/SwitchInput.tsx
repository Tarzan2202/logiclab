
import React from 'react';

interface SwitchInputProps {
  index: number;
  isOn: boolean;
  onToggle: () => void;
}

const SwitchInput: React.FC<SwitchInputProps> = ({ index, isOn, onToggle }) => {
  return (
    <div className="flex flex-col items-center gap-1 group">
      <div 
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="w-12 h-16 rounded shadow-inner flex flex-col items-center justify-center p-1.5 cursor-pointer hover:bg-white/5 transition-all relative"
      >
        {/* Switch Track */}
        <div className="w-6 h-10 rounded-sm relative flex items-center justify-center overflow-hidden border border-white/5 shadow-2xl">
           {/* Slider Handle */}
           <div className={`absolute w-5 h-6 bg-gradient-to-b from-gray-100 to-gray-400 rounded-sm shadow-lg transition-all duration-200 ease-in-out ${
             isOn ? '-translate-y-2' : 'translate-y-2'
           }`}>
             <div className="w-full h-[2px] bg-black/10 mt-1"></div>
             <div className="w-full h-[2px] bg-black/10 mt-1"></div>
           </div>
        </div>
      </div>
      <span className="text-[11px] text-white/30 font-bold tracking-tighter mt-1 group-hover:text-blue-400 transition-colors uppercase">SW{index}</span>
    </div>
  );
};

export default SwitchInput;
