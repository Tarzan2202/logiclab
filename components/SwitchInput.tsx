
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
        className="w-8 h-16 bg-[#1a1a1a] rounded-sm border border-[#333] shadow-inner flex flex-col items-center justify-between p-1 cursor-pointer hover:border-blue-500/50 transition-colors relative"
      >
        {/* Logic 1 Label */}
        <span className="text-[6px] text-gray-600 font-bold select-none">1</span>
        
        {/* Switch Track */}
        <div className="w-4 h-10 bg-black rounded-full relative flex items-center justify-center overflow-hidden border border-white/5 shadow-inner">
           {/* Slider Handle */}
           <div className={`absolute w-3.5 h-5 bg-white rounded-sm shadow-md transition-all duration-200 ease-in-out border-b-2 border-gray-400 ${
             isOn ? '-translate-y-2' : 'translate-y-2'
           }`}>
             <div className="w-full h-[1px] bg-gray-200 mt-1"></div>
             <div className="w-full h-[1px] bg-gray-200 mt-1"></div>
             <div className="w-full h-[1px] bg-gray-200 mt-1"></div>
           </div>
        </div>

        {/* Logic 0 Label */}
        <span className="text-[6px] text-gray-600 font-bold select-none">0</span>
      </div>
      <span className="text-[8px] text-white/40 font-black group-hover:text-blue-400 transition-colors">SW{index}</span>
    </div>
  );
};

export default SwitchInput;
