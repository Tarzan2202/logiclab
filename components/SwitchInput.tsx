
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
        className="w-12 h-20 bg-[#f9fafb] rounded border-2 border-gray-300 shadow-[inset_0_1px_2px_rgba(255,255,255,1),0_2px_4px_rgba(0,0,0,0.1)] flex flex-col items-center justify-between p-1.5 cursor-pointer hover:border-blue-500 transition-all relative"
      >
        <span className="text-[10px] text-gray-400 font-black select-none">ON</span>
        
        {/* Switch Track */}
        <div className="w-6 h-10 bg-gray-200 rounded-sm relative flex items-center justify-center overflow-hidden border border-gray-400 shadow-inner">
           {/* Slider Handle */}
           <div className={`absolute w-5 h-6 bg-gradient-to-b from-gray-50 to-gray-300 rounded-sm shadow-md transition-all duration-200 ease-in-out border border-gray-400 ${
             isOn ? '-translate-y-2' : 'translate-y-2'
           }`}>
             <div className="w-full h-[1.5px] bg-black/5 mt-1"></div>
             <div className="w-full h-[1.5px] bg-black/5 mt-1"></div>
           </div>
        </div>

        <span className="text-[10px] text-gray-400 font-black select-none">OFF</span>
      </div>
      <span className="text-[11px] text-gray-500 font-black tracking-tighter mt-1 group-hover:text-blue-600 transition-colors uppercase">SW{index}</span>
    </div>
  );
};

export default SwitchInput;
