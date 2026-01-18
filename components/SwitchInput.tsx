
import React from 'react';

interface SwitchInputProps {
  index: number;
  isOn: boolean;
  onToggle: () => void;
}

const SwitchInput: React.FC<SwitchInputProps> = ({ index, isOn, onToggle }) => {
  const label = String.fromCharCode(65 + index);

  return (
    <div className="flex flex-col items-center gap-1">
      <div 
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className="w-10 h-14 bg-[#333] rounded-md p-1 cursor-pointer border-b-2 border-black shadow-inner flex flex-col items-center justify-center hover:bg-[#3a3a3a] transition-colors"
      >
        <div className="w-6 h-8 bg-[#222] rounded flex flex-col items-center p-0.5 relative">
           <div className={`w-4 h-4 rounded-sm bg-gray-400 border border-gray-300 shadow transition-all duration-150 ${
             isOn ? '-translate-y-1 bg-blue-400' : 'translate-y-1'
           }`}></div>
        </div>
      </div>
      <span className="text-[7px] text-gray-500 font-black">{label}</span>
    </div>
  );
};

export default SwitchInput;
