
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { GateType, EntityType, CircuitEntity } from './types';
import SwitchInput from './components/SwitchInput';
import Bulb from './components/Bulb';
import SevenSegment from './components/SevenSegment';
import { GATE_DATASHEET } from './gateData';

interface Wire {
  from: string; 
  to: string;   
}

export default function App() {
  const [entities, setEntities] = useState<CircuitEntity[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [activePin, setActivePin] = useState<string | null>(null);
  const [pinPositions, setPinPositions] = useState<Record<string, {x: number, y: number}>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const [scale, setScale] = useState(1);
  
  const workspaceRef = useRef<HTMLDivElement>(null);
  const BOARD_WIDTH = 1000;
  const BOARD_HEIGHT = 700;

  // Auto-Scaling Logic
  useEffect(() => {
    const handleResize = () => {
      const sidebarWidth = 260;
      const padding = 40;
      const availableWidth = window.innerWidth - sidebarWidth - padding;
      const availableHeight = window.innerHeight - padding;
      const scaleX = availableWidth / BOARD_WIDTH;
      const scaleY = availableHeight / BOARD_HEIGHT;
      setScale(Math.min(scaleX, scaleY, 1));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize fixed components (Switches and LEDs)
  useEffect(() => {
    setEntities([
      { id: 'pwr-main', type: EntityType.POWER, position: { x: 20, y: 250 } },
      { id: 'led-bank', type: EntityType.LED_PANEL, position: { x: 150, y: 30 } },
      { id: 'seg-0', type: EntityType.SEVEN_SEGMENT, position: { x: 740, y: 150 } },
      { id: 'seg-1', type: EntityType.SEVEN_SEGMENT, position: { x: 860, y: 150 } },
      { id: 'sw-bank', type: EntityType.SWITCH_PANEL, position: { x: 150, y: 530 }, state: Array(8).fill(false) }
    ]);
  }, []);

  const playError = useCallback((msg: string) => {
    setErrorMessage(msg);
    setFlash(true);
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(100, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch(e) {}
    setTimeout(() => { setErrorMessage(null); setFlash(false); }, 3000);
  }, []);

  const updatePositions = useCallback(() => {
    const positions: Record<string, {x: number, y: number}> = {};
    const pins = document.querySelectorAll('[data-pin-id]');
    const boardRect = workspaceRef.current?.getBoundingClientRect();

    if (boardRect && workspaceRef.current) {
      pins.forEach(pin => {
        const id = pin.getAttribute('data-pin-id');
        if (id) {
          const rect = pin.getBoundingClientRect();
          positions[id] = {
            x: (rect.left + rect.width / 2 - boardRect.left) / scale,
            y: (rect.top + rect.height / 2 - boardRect.top) / scale
          };
        }
      });
      setPinPositions(positions);
    }
  }, [scale]);

  useEffect(() => {
    const timer = setInterval(updatePositions, 50);
    return () => clearInterval(timer);
  }, [updatePositions]);

  const getPinInfo = (pinId: string) => {
    const [entId, type, sub] = pinId.split(':');
    const ent = entities.find(e => e.id === entId);
    let isSource = false;
    let isGnd = false;
    let label = "Pin";
    if (type === 'vcc') { isSource = true; label = "5V"; }
    else if (type === 'gnd') { isGnd = true; label = "GND"; }
    else if (type === 'sw') { isSource = true; label = `SW${sub}`; }
    else if (type === 'p' && ent?.gateType) {
      const pinNum = parseInt(sub);
      const ds = GATE_DATASHEET[ent.gateType];
      if (ds.pins.outputs.includes(pinNum)) { isSource = true; label = `OUT-${pinNum}`; }
      else if (pinNum === ds.pins.vcc) { isSource = true; label = "VCC"; }
      else if (pinNum === ds.pins.gnd) { isGnd = true; label = "GND"; }
    }
    return { isSource, isGnd, label };
  };

  const handlePinClick = (pinId: string) => {
    if (!activePin) {
      setActivePin(pinId);
    } else {
      if (activePin === pinId) { setActivePin(null); return; }
      const pinA = getPinInfo(activePin);
      const pinB = getPinInfo(pinId);
      if ((pinA.isSource && pinB.isGnd) || (pinB.isSource && pinA.isGnd)) {
        playError("ระวัง! ไฟลัดวงจร (Short Circuit)");
        setActivePin(null);
        return;
      }
      setWires([...wires, { from: activePin, to: pinId }]);
      setActivePin(null);
    }
  };

  const circuitStatus = useMemo(() => {
    const pinStates: Record<string, boolean> = {};
    const icPower = new Map<string, boolean>();

    const checkPath = (startId: string, targetType: 'vcc'|'gnd', visited = new Set<string>()): boolean => {
      const [eid, type] = startId.split(':');
      if (type === targetType && eid === 'pwr-main') return true;
      if (visited.has(startId)) return false;
      visited.add(startId);
      return wires.some(w => {
        const other = w.from === startId ? w.to : (w.to === startId ? w.from : null);
        return other ? checkPath(other, targetType, visited) : false;
      });
    };

    const getSignal = (pid: string, visited = new Set<string>()): boolean => {
      if (pinStates[pid] !== undefined) return pinStates[pid];
      const [eid, type, sub] = pid.split(':');
      const ent = entities.find(e => e.id === eid);
      if (type === 'vcc') return true;
      if (type === 'sw') return ent?.state?.[parseInt(sub)] || false;
      if (type === 'p' && ent?.gateType) {
        const pinNum = parseInt(sub);
        const ds = GATE_DATASHEET[ent.gateType];
        const hasPwr = checkPath(`${eid}:p:${ds.pins.vcc}`, 'vcc') && checkPath(`${eid}:p:${ds.pins.gnd}`, 'gnd');
        icPower.set(eid, hasPwr);
        if (hasPwr && ds.pins.outputs.includes(pinNum)) {
          const outIdx = ds.pins.outputs.indexOf(pinNum);
          const inPins = ds.pins.inputs[outIdx];
          const inVals = inPins.map(p => getSignal(`${eid}:p:${p}`, new Set([...visited, pid])));
          switch(ent.gateType) {
            case GateType.AND: return inVals[0] && inVals[1];
            case GateType.OR: return inVals[0] || inVals[1];
            case GateType.NOT: return !inVals[0];
            case GateType.NAND: return !(inVals[0] && inVals[1]);
            case GateType.NOR: return !(inVals[0] || inVals[1]);
            case GateType.XOR: return inVals[0] !== inVals[1];
            default: return inVals[0];
          }
        }
      }
      if (visited.has(pid)) return false;
      visited.add(pid);
      const res = wires.some(w => {
        const other = w.from === pid ? w.to : (w.to === pid ? w.from : null);
        return other ? getSignal(other, visited) : false;
      });
      pinStates[pid] = res;
      return res;
    };

    const componentStates: Record<string, any> = {};
    entities.forEach(e => {
      if (e.type === EntityType.LED_PANEL) {
        componentStates[e.id] = Array(8).fill(0).map((_, i) => getSignal(`${e.id}:in:${i}`));
      } else if (e.type === EntityType.SEVEN_SEGMENT) {
        componentStates[e.id] = {
          a: getSignal(`${e.id}:a`), b: getSignal(`${e.id}:b`), c: getSignal(`${e.id}:c`), 
          d: getSignal(`${e.id}:d`), e: getSignal(`${e.id}:e`), f: getSignal(`${e.id}:f`), 
          g: getSignal(`${e.id}:g`), dp: getSignal(`${e.id}:dp`)
        };
      }
    });
    return { componentStates, icPower, wireStatus: wires.map(w => getSignal(w.from) || getSignal(w.to)) };
  }, [entities, wires]);

  const addIC = (type: GateType) => {
    const id = `ic-${Math.random().toString(36).substr(2, 4)}`;
    setEntities([...entities, {
      id, type: EntityType.GATE, gateType: type,
      position: { x: 420, y: 220 }
    }]);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = workspaceRef.current?.getBoundingClientRect();
    if (rect) {
      const curX = (e.clientX - rect.left) / scale;
      const curY = (e.clientY - rect.top) / scale;
      setMousePos({ x: curX, y: curY });
      if (draggingId) {
        setEntities(entities.map(ent => ent.id === draggingId ? {
          ...ent, position: { x: curX - dragOffset.x, y: curY - dragOffset.y }
        } : ent));
      }
    }
  };

  const startDrag = (e: React.MouseEvent, id: string) => {
    const ent = entities.find(x => x.id === id);
    if (ent && workspaceRef.current) {
      const rect = workspaceRef.current.getBoundingClientRect();
      const curX = (e.clientX - rect.left) / scale;
      const curY = (e.clientY - rect.top) / scale;
      setDraggingId(id);
      setDragOffset({ x: curX - ent.position.x, y: curY - ent.position.y });
    }
  };

  return (
    <div className={`h-screen w-screen bg-[#0d0f14] flex flex-row transition-all overflow-hidden`}>
      
      {errorMessage && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-2 rounded-lg font-bold shadow-2xl animate-bounce text-xs uppercase">
          {errorMessage}
        </div>
      )}

      {/* Sidebar - IC Library */}
      <aside className="w-64 bg-[#141b24] border-r border-white/5 flex flex-col z-50 shadow-2xl">
        <div className="p-6 border-b border-white/5">
            <h1 className="text-blue-400 font-black text-lg tracking-tighter"><br/><span className="text-white opacity-40 text-xs font-normal tracking-normal">Logic Simulator</span></h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            <section>
                <div className="flex items-center gap-2 mb-3 px-2">
                    <i className="fas fa-microchip text-blue-500 text-[10px]"></i>
                    <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">IC Library</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {Object.values(GateType).map(gt => (
                        <button 
                            key={gt} 
                            onClick={() => addIC(gt)} 
                            className="flex flex-col items-start p-3 rounded-xl bg-white/5 hover:bg-blue-600 border border-white/5 hover:border-blue-400 transition-all group"
                        >
                            <span className="text-xs font-black text-white group-hover:text-white">{GATE_DATASHEET[gt].model}</span>
                            <span className="text-[8px] text-white/40 group-hover:text-blue-100 uppercase tracking-tighter">{GATE_DATASHEET[gt].title.split(' ').slice(1).join(' ')}</span>
                        </button>
                    ))}
                </div>
            </section>

            <section>
                 <div className="flex items-center gap-2 mb-3 px-2">
                    <i className="fas fa-tools text-red-500 text-[10px]"></i>
                    <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">Tools</span>
                </div>
                <button 
                    onClick={() => setWires([])} 
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-red-600/10 hover:bg-red-600 border border-red-600/20 text-red-500 hover:text-white transition-all font-black text-[10px] uppercase"
                >
                    <i className="fas fa-broom"></i>
                    Reset Wires
                </button>
            </section>
        </nav>

        <div className="p-4 border-t border-white/5">
            <div className="text-[8px] text-white/20 uppercase font-black tracking-widest leading-relaxed">
                v1.2.0 Stable<br/>
                No API Mode Active
            </div>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-[#0b0c10]">
        
        {/* Workspace Labels */}
        <div className="absolute top-8 left-8 flex items-center gap-4 opacity-30 pointer-events-none">
            <div className="w-12 h-[1px] bg-white"></div>
            <span className="text-[10px] font-black uppercase tracking-widest"></span>
        </div>

        <div 
          ref={workspaceRef} 
          onMouseMove={handleMouseMove}
          onMouseUp={() => setDraggingId(null)}
          className={`board-container shadow-2xl transition-transform duration-300 ${flash ? 'error-shake' : ''}`}
          style={{ width: `${BOARD_WIDTH}px`, height: `${BOARD_HEIGHT}px`, transform: `scale(${scale})` }}
        >
          {/* Silk Labels */}
          <div className="absolute top-4 left-4 text-[10px] text-white/5 font-black tracking-widest uppercase"> MICROCONTROLLER EXPERIMENT BOARD</div>

          {/* Breadboard Placeholder */}
          <div className="breadboard absolute top-[150px] left-[150px] w-[550px] h-[360px] opacity-30"></div>

          {/* Board Entities */}
          {entities.map(ent => (
            <div key={ent.id} className={`absolute ${ent.type === EntityType.GATE ? 'z-40' : 'z-20'}`} style={{ left: ent.position.x, top: ent.position.y }}>
              {/* Power Section */}
              {ent.type === EntityType.POWER && (
                <div className="nx-panel p-4 flex flex-col gap-6 border-l-4 border-red-500">
                  <div className="flex flex-col items-center gap-1">
                    <div data-pin-id={`${ent.id}:vcc`} onClick={() => handlePinClick(`${ent.id}:vcc`)} className="w-8 h-8 rounded-full bg-red-600 border-4 border-black/70 cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-lg flex items-center justify-center">+</div>
                    <span className="text-[8px] font-black text-red-500">+5V VCC</span>
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <div data-pin-id={`${ent.id}:gnd`} onClick={() => handlePinClick(`${ent.id}:gnd`)} className="w-8 h-8 rounded-full bg-[#111] border-4 border-white/10 cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-lg flex items-center justify-center">-</div>
                    <span className="text-[8px] font-black text-gray-500">GND 0V</span>
                  </div>
                </div>
              )}

              {/* Switches */}
              {ent.type === EntityType.SWITCH_PANEL && (
                <div className="nx-panel p-4 flex gap-3 border-t-4 border-blue-500 bg-[#1e2a38]">
                  {ent.state?.map((s: boolean, i: number) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div data-pin-id={`${ent.id}:sw:${i}`} onClick={() => handlePinClick(`${ent.id}:sw:${i}`)} className="w-6 h-4 bg-gray-900 rounded-sm mb-[-10px] cursor-pointer hover:bg-blue-500 z-30 border border-black shadow-inner"></div>
                      <SwitchInput index={i} isOn={s} onToggle={() => {
                        setEntities(entities.map(x => x.id === ent.id ? {...x, state: x.state.map((v:any, idx:number) => idx === i ? !v : v)} : x));
                      }} />
                    </div>
                  ))}
                  <div className="text-[7px] text-blue-500/50 font-black rotate-90 ml-2 flex items-center">INPUTS</div>
                </div>
              )}

              {/* LEDs */}
              {ent.type === EntityType.LED_PANEL && (
                <div className="nx-panel p-4 flex gap-3 border-b-4 border-green-500 bg-[#1e2a38]">
                  {Array(8).fill(0).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div data-pin-id={`${ent.id}:in:${i}`} onClick={() => handlePinClick(`${ent.id}:in:${i}`)} className="w-6 h-4 bg-gray-900 rounded-sm mb-[-12px] cursor-pointer hover:bg-green-500 z-30 border border-black shadow-inner"></div>
                      <Bulb isOn={circuitStatus.componentStates[ent.id]?.[i]} />
                    </div>
                  ))}
                  <div className="text-[7px] text-green-500/50 font-black rotate-90 ml-2 flex items-center">OUTPUTS</div>
                </div>
              )}

              {/* Seven Segment */}
              {ent.type === EntityType.SEVEN_SEGMENT && (
                <div className="nx-panel p-3 flex flex-col gap-3 border-r-4 border-red-500 bg-[#1e2a38]">
                  <SevenSegment segments={circuitStatus.componentStates[ent.id] || {}} />
                  <div className="grid grid-cols-4 gap-1 px-1">
                    {['a','b','c','d','e','f','g','dp'].map(seg => (
                      <div key={seg} data-pin-id={`${ent.id}:${seg}`} onClick={() => handlePinClick(`${ent.id}:${seg}`)} className="w-4 h-3 bg-gray-900 rounded-sm text-[6px] text-white/40 flex items-center justify-center font-black cursor-pointer hover:bg-red-600 border border-black">{seg.toUpperCase()}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* ICs */}
              {ent.type === EntityType.GATE && (
                <div className="ic-realistic w-[80px] h-[180px] flex flex-col items-center justify-between p-2 relative select-none shadow-2xl" onMouseDown={(e) => startDrag(e, ent.id)}>
                  <div className="absolute left-[-12px] top-5 bottom-5 flex flex-col justify-between">
                    {[1,2,3,4,5,6,7].map(p => (<div key={p} data-pin-id={`${ent.id}:p:${p}`} onClick={(e) => { e.stopPropagation(); handlePinClick(`${ent.id}:p:${p}`); }} className="w-4 h-3.5 ic-pin rounded-l-md flex items-center justify-center text-[7px] text-black font-black">{p}</div>))}
                  </div>
                  <div className="absolute right-[-12px] top-5 bottom-5 flex flex-col justify-between">
                    {[14,13,12,11,10,9,8].map(p => (<div key={p} data-pin-id={`${ent.id}:p:${p}`} onClick={(e) => { e.stopPropagation(); handlePinClick(`${ent.id}:p:${p}`); }} className="w-4 h-3.5 ic-pin rounded-r-md flex items-center justify-center text-[7px] text-black font-black">{p}</div>))}
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-white/10 mt-1"></div>
                  <div className="text-white font-black text-xs rotate-90 whitespace-nowrap opacity-80 uppercase tracking-widest">{GATE_DATASHEET[ent.gateType!].model}</div>
                  <button onClick={(e) => { e.stopPropagation(); setEntities(entities.filter(x => x.id !== ent.id)); }} className="text-[6px] bg-red-600/30 text-red-500 hover:text-white px-1.5 py-0.5 rounded-sm uppercase font-black transition-all mb-1">Del</button>
                  <div className={`absolute top-2 left-2 w-1.5 h-1.5 rounded-full ${circuitStatus.icPower.get(ent.id) ? 'bg-green-500 shadow-[0_0_5px_green]' : 'bg-red-900 opacity-20'}`}></div>
                </div>
              )}
            </div>
          ))}

          {/* Wiring Layer */}
          <svg className="absolute inset-0 pointer-events-none z-50 w-full h-full">
            {wires.map((wire, idx) => {
              const start = pinPositions[wire.from];
              const end = pinPositions[wire.to];
              if (!start || !end) return null;
              const isHigh = circuitStatus.wireStatus[idx];
              let color = isHigh ? '#f1c40f' : '#7f8c8d';
              if (wire.from.includes('vcc') || wire.to.includes('vcc') || wire.from.includes('p:14') || wire.to.includes('p:14')) color = isHigh ? '#e74c3c' : '#c0392b';
              if (wire.from.includes('gnd') || wire.to.includes('gnd') || wire.from.includes('p:7') || wire.to.includes('p:7')) color = '#2c3e50';
              return (
                <g key={idx}>
                  <path d={`M ${start.x} ${start.y} C ${start.x} ${start.y + 60}, ${end.x} ${end.y - 60}, ${end.x} ${end.y}`} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" className={`pointer-events-auto cursor-pointer hover:stroke-white transition-all ${isHigh ? 'wire-active' : ''}`} onClick={() => setWires(wires.filter((_, i) => i !== idx))} style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} />
                </g>
              );
            })}
            {activePin && pinPositions[activePin] && (
              <line x1={pinPositions[activePin].x} y1={pinPositions[activePin].y} x2={mousePos.x} y2={mousePos.y} stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeDasharray="4,4" />
            )}
          </svg>
        </div>
      </main>
    </div>
  );
}
