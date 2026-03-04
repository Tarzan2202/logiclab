
import React from 'react';

interface TerminalSocketProps {
  id: string;
  label?: string;
  color?: string;
  active?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: () => void;
}

const TerminalSocket: React.FC<TerminalSocketProps> = ({ 
  id, label, color = 'emerald', active, onMouseEnter, onMouseLeave, onClick 
}) => {
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-500/40 hover:bg-emerald-900/40',
    red: 'border-red-500/40 hover:bg-red-900/40 border-red-600/50',
    blue: 'border-blue-500/40 hover:bg-blue-900/40 border-blue-600/50',
    cyan: 'border-cyan-500/40 hover:bg-cyan-900/40 border-cyan-600/50',
    purple: 'border-purple-500/40 hover:bg-purple-900/40 border-purple-600/50',
    amber: 'border-amber-500/40 hover:bg-amber-900/40 border-amber-600/50',
    black: 'border-gray-400 hover:bg-gray-200 border-gray-500/50',
  };

  return (
    <div className="flex flex-col items-center gap-1 group/socket">
      <div
        data-pin-id={id}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        className={`
          w-7 h-7 rounded-md bg-[#e5e7eb] border-2 shadow-[inset_0_1px_2px_rgba(255,255,255,0.5),0_2px_4px_rgba(0,0,0,0.1)]
          flex items-center justify-center cursor-pointer transition-all
          ${colorMap[color] || colorMap.emerald}
          ${active ? 'ring-2 ring-blue-500 scale-110 z-10' : ''}
          relative
        `}
      >
        {/* The "hole" */}
        <div className="w-3.5 h-3.5 rounded-full bg-[#111] shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)] border border-white/10"></div>
        {/* Metallic contact inside */}
        <div className="absolute w-1.5 h-1.5 rounded-full bg-gray-600/40 blur-[0.5px]"></div>
      </div>
      {label && <span className="text-[9px] font-bold text-gray-600 uppercase tracking-tighter group-hover/socket:text-gray-900 transition-colors">{label}</span>}
    </div>
  );
};

export default TerminalSocket;
