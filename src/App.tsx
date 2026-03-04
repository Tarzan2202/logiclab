import React, { useState, useEffect } from 'react';
import { Power, Settings, Zap, Terminal, Cpu, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for Tailwind class merging
 */
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---

type LogicLevel = 0 | 1;

// --- Components ---

const PinHeader = ({ count, vertical = false, label, cols = 1 }: { count: number; vertical?: boolean; label?: string; cols?: number }) => (
  <div className={cn("flex flex-col items-center gap-1.5", vertical ? "flex-row" : "flex-col")}>
    {label && <span className="text-[9px] font-mono text-pcb-silk/70 uppercase font-black drop-shadow-sm">{label}</span>}
    <div 
      className={cn(
        "plastic-block border-2 p-1.5 gap-1.5 grid",
        cols > 1 ? `grid-cols-${cols}` : (vertical ? "grid-rows-1" : "grid-cols-1")
      )}
      style={{ gridTemplateColumns: cols > 1 ? `repeat(${cols}, minmax(0, 1fr))` : undefined }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-4 h-4 hole-inner rounded-sm flex items-center justify-center relative">
          <div className="absolute inset-0 bg-white/5 rounded-sm pointer-events-none" />
          <div className="w-2 h-2 bg-zinc-800 rounded-full opacity-30 blur-[0.5px]" />
        </div>
      ))}
    </div>
  </div>
);

const ICChip = ({ label, pins = 14 }: { label: string; pins?: number }) => (
  <div className="flex flex-col items-center group">
    <div className="ic-chip w-12 rounded-sm border border-zinc-900 relative py-3 flex flex-col items-center justify-center transition-transform group-hover:scale-[1.02]" style={{ height: `${pins * 4.5}px` }}>
      <div className="absolute top-1.5 w-3 h-1.5 bg-zinc-950 rounded-full shadow-inner" />
      <span className="text-[8px] font-mono text-zinc-400 font-bold rotate-90 whitespace-nowrap opacity-60 tracking-tighter">{label}</span>
      {/* Pins */}
      <div className="absolute -left-2 top-0 bottom-0 flex flex-col justify-around py-2">
        {Array.from({ length: pins / 2 }).map((_, i) => (
          <div key={i} className="w-2.5 h-1.5 bg-gradient-to-r from-zinc-500 to-zinc-300 rounded-l-sm shadow-md" />
        ))}
      </div>
      <div className="absolute -right-2 top-0 bottom-0 flex flex-col justify-around py-2">
        {Array.from({ length: pins / 2 }).map((_, i) => (
          <div key={i} className="w-2.5 h-1.5 bg-gradient-to-l from-zinc-500 to-zinc-300 rounded-r-sm shadow-md" />
        ))}
      </div>
    </div>
  </div>
);

const ScrewTerminal = ({ count = 4, color = "bg-blue-600" }: { count?: number; color?: string }) => (
  <div className={cn("flex rounded-md overflow-hidden shadow-[0_15px_30px_rgba(0,0,0,0.6)] border-b-[6px] border-black/50", color)}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="w-12 h-16 border-r border-black/30 flex flex-col items-center justify-between py-3 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
        <div className="w-8 h-8 screw-head rounded-full flex items-center justify-center">
          <div className="w-1 h-6 bg-zinc-900/80 rotate-45 rounded-full shadow-inner" />
          <div className="absolute w-1 h-6 bg-zinc-900/80 -rotate-45 rounded-full shadow-inner" />
        </div>
        <div className="w-8 h-4 bg-zinc-950/60 rounded-sm border border-black/40 shadow-inner flex items-center justify-center">
           <div className="w-4 h-1 bg-zinc-800 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

const SevenSegmentDigit = ({ value }: { value: string }) => {
  // Simple 7-segment mapping for hex
  const segments = {
    '0': [1,1,1,1,1,1,0],
    '1': [0,1,1,0,0,0,0],
    '2': [1,1,0,1,1,0,1],
    '3': [1,1,1,1,0,0,1],
    '4': [0,1,1,0,0,1,1],
    '5': [1,0,1,1,0,1,1],
    '6': [1,0,1,1,1,1,1],
    '7': [1,1,1,0,0,0,0],
    '8': [1,1,1,1,1,1,1],
    '9': [1,1,1,1,0,1,1],
    'A': [1,1,1,0,1,1,1],
    'B': [0,0,1,1,1,1,1],
    'C': [1,0,0,1,1,1,0],
    'D': [0,1,1,1,1,0,1],
    'E': [1,0,0,1,1,1,1],
    'F': [1,0,0,0,1,1,1],
  }[value.toUpperCase()] || [0,0,0,0,0,0,0];

  return (
    <div className="relative w-14 h-22 bg-zinc-950 p-2 rounded-sm border-2 border-zinc-800 shadow-inner">
      {/* A */}
      <div className={cn("absolute top-2 left-4 right-4 h-2 rounded-full transition-all duration-200", segments[0] ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)]" : "bg-zinc-900")} />
      {/* B */}
      <div className={cn("absolute top-3 right-2 w-2 h-8 rounded-full transition-all duration-200", segments[1] ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)]" : "bg-zinc-900")} />
      {/* C */}
      <div className={cn("absolute bottom-3 right-2 w-2 h-8 rounded-full transition-all duration-200", segments[2] ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)]" : "bg-zinc-900")} />
      {/* D */}
      <div className={cn("absolute bottom-2 left-4 right-4 h-2 rounded-full transition-all duration-200", segments[3] ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)]" : "bg-zinc-900")} />
      {/* E */}
      <div className={cn("absolute bottom-3 left-2 w-2 h-8 rounded-full transition-all duration-200", segments[4] ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)]" : "bg-zinc-900")} />
      {/* F */}
      <div className={cn("absolute top-3 left-2 w-2 h-8 rounded-full transition-all duration-200", segments[5] ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)]" : "bg-zinc-900")} />
      {/* G */}
      <div className={cn("absolute top-1/2 left-4 right-4 h-2 -translate-y-1/2 rounded-full transition-all duration-200", segments[6] ? "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)]" : "bg-zinc-900")} />
    </div>
  );
};

const Breadboard = () => {
  const rows = 60;
  const cols = 5; // per side

  return (
    <div className="bg-[#fdfdfd] p-8 rounded-md shadow-[0_10px_40px_rgba(0,0,0,0.4)] border-b-8 border-r-8 border-zinc-300 flex gap-6 select-none">
      {/* Power Rails Left */}
      <div className="flex flex-col gap-1.5 px-1 border-r-2 border-zinc-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-3">
            <div className={cn("w-2.5 h-2.5 rounded-sm hole-inner", r % 5 === 0 ? "border-red-500/30 border" : "")} />
            <div className={cn("w-2.5 h-2.5 rounded-sm hole-inner", r % 5 === 0 ? "border-blue-500/30 border" : "")} />
          </div>
        ))}
      </div>

      {/* Main Grid Left */}
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: rows * cols }).map((_, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-sm hole-inner" />
        ))}
      </div>

      {/* Center Gutter */}
      <div className="w-6 bg-zinc-200/80 rounded-sm shadow-inner" />

      {/* Main Grid Right */}
      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: rows * cols }).map((_, i) => (
          <div key={i} className="w-2.5 h-2.5 rounded-sm hole-inner" />
        ))}
      </div>

      {/* Power Rails Right */}
      <div className="flex flex-col gap-1.5 px-1 border-l-2 border-zinc-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-3">
            <div className={cn("w-2.5 h-2.5 rounded-sm hole-inner", r % 5 === 0 ? "border-blue-500/30 border" : "")} />
            <div className={cn("w-2.5 h-2.5 rounded-sm hole-inner", r % 5 === 0 ? "border-red-500/30 border" : "")} />
          </div>
        ))}
      </div>
    </div>
  );
};

const Led = ({ active, color = "red", label, ...props }: { active: boolean; color?: "red" | "green" | "yellow"; label?: string; [key: string]: any }) => {
  const colors = {
    red: active ? "bg-red-500 shadow-[0_0_15px_rgba(239,68,68,1),inset_0_0_4px_rgba(255,255,255,0.5)]" : "bg-red-950 border-red-900",
    green: active ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,1),inset_0_0_4px_rgba(255,255,255,0.5)]" : "bg-emerald-950 border-emerald-900",
    yellow: active ? "bg-yellow-500 shadow-[0_0_15px_rgba(234,179,8,1),inset_0_0_4px_rgba(255,255,255,0.5)]" : "bg-yellow-950 border-yellow-900",
  };

  return (
    <div className="flex flex-col items-center gap-1" {...props}>
      <div className={cn("w-5 h-5 rounded-full border-2 transition-all duration-150 relative overflow-hidden", colors[color])}>
        <div className="absolute top-0.5 left-1 w-1.5 h-1.5 bg-white/30 rounded-full blur-[1px]" />
      </div>
      {label && <span className="text-[9px] font-mono font-bold text-pcb-silk/70">{label}</span>}
    </div>
  );
};

const SlideSwitch = ({ active, onToggle, label, ...props }: { active: boolean; onToggle: () => void; label?: string; [key: string]: any }) => (
  <div className="flex flex-col items-center gap-2" {...props}>
    <div 
      onClick={onToggle}
      className="w-10 h-16 bg-zinc-900 rounded-sm border-2 border-zinc-800 p-1.5 cursor-pointer relative shadow-xl overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none" />
      <motion.div 
        animate={{ y: active ? 0 : 28 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="w-full h-8 bg-zinc-300 rounded-sm shadow-[0_2px_5px_rgba(0,0,0,0.5)] border-t border-white/50 border-b border-black/30 flex items-center justify-center"
      >
        <div className="w-full h-0.5 bg-zinc-400/50" />
      </motion.div>
      <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-1.5 text-[9px] font-black text-zinc-600">
        <span>1</span>
        <span>0</span>
      </div>
    </div>
    {label && <span className="text-[10px] font-mono font-bold text-pcb-silk/80">{label}</span>}
  </div>
);

export default function App() {
  const [powerOn, setPowerOn] = useState(false);
  const [switches, setSwitches] = useState<LogicLevel[]>(new Array(8).fill(0));
  
  const toggleSwitch = (index: number) => {
    if (!powerOn) return;
    const newSwitches = [...switches];
    newSwitches[index] = newSwitches[index] === 0 ? 1 : 0;
    setSwitches(newSwitches);
  };

  // Calculate hex values for display based on switches
  const lowNibble = switches.slice(0, 4).reduce((acc, val, i) => acc + val * Math.pow(2, i), 0);
  const highNibble = switches.slice(4, 8).reduce((acc, val, i) => acc + val * Math.pow(2, i), 0);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-12 bg-zinc-950">
      <div className="relative bg-pcb-green w-[1100px] rounded-2xl shadow-[0_40px_100px_rgba(0,0,0,0.8)] border-8 border-pcb-green-dark p-16 pcb-grid overflow-hidden">
        {/* Silkscreen Borders */}
        <div className="absolute inset-6 border-2 border-pcb-silk/10 pointer-events-none rounded-xl" />
        
        {/* Header Section */}
        <div className="flex justify-between items-start mb-16 relative z-10">
          <div className="space-y-2">
            <h1 className="text-5xl font-black text-pcb-silk tracking-tighter italic drop-shadow-lg">NX-100 Plus</h1>
            <div className="text-sm font-mono text-pcb-silk/60 uppercase tracking-widest font-bold">
              DIGITAL CIRCUIT EXPERIMENT BOARD
              <br />
              <span className="text-pcb-silk/40">for beginner and electronic hobbyist</span>
              <br />
              <span className="text-pcb-silk/30 italic">© INEX Revision 07</span>
            </div>
          </div>
          
          <div className="flex gap-12">
            {/* Logic Probe Section */}
            <div className="border-2 border-pcb-silk/20 p-6 rounded-md bg-pcb-green-dark/30 shadow-inner">
              <div className="text-[11px] font-black text-pcb-silk mb-4 uppercase tracking-widest text-center">Logic Probe</div>
              <div className="flex gap-6">
                <Led active={powerOn && switches[0] === 1} color="red" label="HI" />
                <Led active={powerOn && switches[0] === 0} color="green" label="LO" />
                <Led active={powerOn} color="yellow" label="PULSE" />
              </div>
              <div className="mt-4 flex justify-center">
                <PinHeader count={2} label="INPUT" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Board Layout */}
        <div className="grid grid-cols-12 gap-12 h-full relative z-10">
          
          {/* Left Column: Displays & Monitors */}
          <div className="col-span-3 space-y-16">
            {/* 7-Segment Section */}
            <div className="border-2 border-pcb-silk/20 p-8 rounded-md bg-pcb-green-dark/30 shadow-inner">
              <div className="text-[11px] font-black text-pcb-silk mb-6 uppercase tracking-widest text-center">Binary to Hex Decoder</div>
              <div className="flex gap-6 justify-center bg-zinc-950 p-6 rounded-lg border-4 border-zinc-900 shadow-2xl">
                <SevenSegmentDigit value={powerOn ? highNibble.toString(16) : ''} />
                <SevenSegmentDigit value={powerOn ? lowNibble.toString(16) : ''} />
              </div>
              <div className="mt-8 flex justify-center gap-8">
                <PinHeader count={4} label="D C B A" />
                <PinHeader count={4} label="D C B A" />
              </div>
              <div className="mt-6 flex justify-center">
                <ICChip label="74HC4511" pins={16} />
              </div>
            </div>

            {/* Logic Monitor Section */}
            <div className="border-2 border-pcb-silk/20 p-8 rounded-md bg-pcb-green-dark/30 shadow-inner">
              <div className="text-[11px] font-black text-pcb-silk mb-6 uppercase tracking-widest text-center">Logic Monitor</div>
              <div className="grid grid-cols-2 gap-y-8 justify-items-center">
                {switches.map((s, i) => (
                  <Led key={i} active={powerOn && s === 1} label={`D${7-i}`} />
                ))}
              </div>
              <div className="mt-8 flex justify-center">
                <PinHeader count={8} label="INPUT" />
              </div>
              <div className="mt-6 flex justify-center">
                <ICChip label="SN74HC541N" pins={20} />
              </div>
            </div>
          </div>

          {/* Center Column: Breadboard */}
          <div className="col-span-6 flex flex-col items-center">
            <div className="text-[12px] font-black text-pcb-silk mb-6 uppercase tracking-[0.3em] opacity-30">Prototyping Area</div>
            <Breadboard />
            <div className="mt-12 flex gap-12">
               <PinHeader count={10} cols={5} label="VCC / GND BUS" />
               <PinHeader count={10} cols={5} label="VCC / GND BUS" />
            </div>
          </div>

          {/* Right Column: Switches & Pulse */}
          <div className="col-span-3 space-y-16">
            {/* Logic Switches */}
            <div className="border-2 border-pcb-silk/20 p-8 rounded-md bg-pcb-green-dark/30 shadow-inner">
              <div className="text-[11px] font-black text-pcb-silk mb-8 uppercase tracking-widest text-center">Logic Switch (8 Channels)</div>
              <div className="grid grid-cols-4 gap-x-4 gap-y-10 justify-items-center">
                {switches.map((s, i) => (
                  <SlideSwitch 
                    key={i} 
                    active={s === 1} 
                    onToggle={() => toggleSwitch(i)} 
                    label={`S${7-i}`} 
                  />
                ))}
              </div>
              <div className="mt-10 flex justify-center">
                <PinHeader count={8} label="OUTPUT" />
              </div>
            </div>

            {/* Pulse Generator */}
            <div className="border-2 border-pcb-silk/20 p-8 rounded-md bg-pcb-green-dark/30 shadow-inner">
              <div className="text-[11px] font-black text-pcb-silk mb-6 uppercase tracking-widest text-center">Pulse Generator</div>
              <div className="space-y-8">
                <div className="flex justify-around">
                  <Led active={powerOn} color="red" label="1Hz" />
                  <Led active={powerOn} color="red" label="10Hz" />
                  <Led active={powerOn} color="red" label="100Hz" />
                </div>
                <div className="flex flex-col items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center shadow-xl cursor-pointer active:rotate-45 transition-transform">
                    <div className="w-1 h-6 bg-zinc-400 rounded-full rotate-45" />
                  </div>
                  <span className="text-[10px] font-black text-pcb-silk/60 uppercase">Frequency Adjust</span>
                </div>
                <div className="flex justify-center">
                  <PinHeader count={4} label="PULSE OUTPUT" />
                </div>
              </div>
            </div>

            {/* Debounce Switch */}
            <div className="border-2 border-pcb-silk/20 p-8 rounded-md bg-pcb-green-dark/30 shadow-inner">
              <div className="text-[11px] font-black text-pcb-silk mb-6 uppercase tracking-widest text-center">Debounce Switch</div>
              <div className="flex justify-around items-center">
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-yellow-500 rounded-full border-4 border-yellow-600 active:scale-90 transition-transform cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.5)]" />
                  <span className="text-[9px] font-bold text-pcb-silk/50">SW-A</span>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 bg-blue-500 rounded-full border-4 border-blue-600 active:scale-90 transition-transform cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.5)]" />
                  <span className="text-[9px] font-bold text-pcb-silk/50">SW-B</span>
                </div>
              </div>
              <div className="mt-6 flex justify-center">
                <PinHeader count={4} label="OUTPUT" />
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Connectors */}
        <div className="mt-20 flex justify-between items-end relative z-10">
          <div className="flex items-center gap-12">
            <div className="flex flex-col items-center gap-2">
               <ScrewTerminal count={4} color="bg-blue-600" />
               <span className="text-[10px] font-black text-pcb-silk/60 uppercase">4-CH Driver Output</span>
            </div>
            
            <div className="border-2 border-pcb-silk/20 p-6 rounded-md bg-pcb-green-dark/30 flex items-center gap-8">
               <div className="flex flex-col items-center gap-4">
                  <div 
                    onClick={() => setPowerOn(!powerOn)}
                    className={cn(
                      "w-16 h-16 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 border-4 shadow-2xl",
                      powerOn ? "bg-emerald-500 border-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.6)]" : "bg-zinc-800 border-zinc-700"
                    )}
                  >
                    <Power className={cn("w-8 h-8", powerOn ? "text-white" : "text-zinc-500")} />
                  </div>
                  <span className="text-[11px] font-black text-pcb-silk uppercase">Power</span>
               </div>
               <div className="w-px h-16 bg-pcb-silk/10" />
               <div className="text-[11px] font-mono text-pcb-silk/50 uppercase leading-relaxed">
                  DC ADAPTOR INPUT<br />
                  <span className="text-pcb-silk/80">9V - 12V DC</span><br />
                  <span className="text-pcb-silk/30">Center Positive</span>
               </div>
            </div>
          </div>
          
          <div className="text-right space-y-1">
            <div className="text-xs font-black text-pcb-silk/40 uppercase tracking-tighter">
              Experimental Board System<br />
              Model: NX-100+<br />
              S/N: 160801-REV07
            </div>
            <div className="flex gap-2 justify-end opacity-20">
               <div className="w-4 h-4 rounded-full bg-pcb-silk" />
               <div className="w-4 h-4 rounded-full bg-pcb-silk" />
            </div>
          </div>
        </div>

        {/* Decorative PCB Traces */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-[0.03]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
             <defs>
                <pattern id="trace-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                   <path d="M 0 50 L 100 50 M 50 0 L 50 100" stroke="white" strokeWidth="1" fill="none" />
                </pattern>
             </defs>
             <rect width="100%" height="100%" fill="url(#trace-pattern)" />
          </svg>
        </div>
      </div>

      {/* Instructions Overlay */}
      <AnimatePresence>
        {!powerOn && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 pointer-events-none"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-zinc-900 p-12 rounded-3xl border-2 border-white/10 shadow-[0_50px_100px_rgba(0,0,0,1)] text-center max-w-lg"
            >
              <div className="relative w-20 h-20 mx-auto mb-8">
                 <Zap className="w-20 h-20 text-yellow-500 animate-pulse" />
                 <div className="absolute inset-0 bg-yellow-500/20 blur-2xl rounded-full" />
              </div>
              <h2 className="text-4xl font-black mb-4 tracking-tight">SYSTEM STANDBY</h2>
              <p className="text-zinc-400 text-lg leading-relaxed">
                The experiment board is currently unpowered. 
                <br />
                <span className="text-emerald-500 font-bold">Toggle the Power Switch</span> at the bottom to begin.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
