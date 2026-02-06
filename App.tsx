
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
  const [scale, setScale] = useState(1);
  const [infoGate, setInfoGate] = useState<GateType | null>(null);
  
  const workspaceRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const BOARD_WIDTH = 1100;
  const BOARD_HEIGHT = 850; 

  // Function to play error sound
  const playErrorSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
      console.warn("Audio not supported or blocked", e);
    }
  };

  // Auto-Scaling Logic (For responsiveness only)
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

  // Initialize board components
  useEffect(() => {
    setEntities([
      { id: 'pwr-main', type: EntityType.POWER, position: { x: 30, y: 310 } },
      { id: 'seg-0', type: EntityType.SEVEN_SEGMENT, position: { x: 100, y: 30 } },
      { id: 'seg-1', type: EntityType.SEVEN_SEGMENT, position: { x: 230, y: 30 } },
      { id: 'led-bank', type: EntityType.LED_PANEL, position: { x: 400, y: 30 } },
      { id: 'sw-bank', type: EntityType.SWITCH_PANEL, position: { x: 260, y: 680 }, state: Array(8).fill(false) }
    ]);
  }, []);

  const playError = useCallback((msg: string) => {
    setErrorMessage(msg);
    playErrorSound();
    // ข้อความจะหายไปเองหลังจาก 5 วินาที
    setTimeout(() => { 
      setErrorMessage(null); 
    }, 5000);
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

  const getPinName = (pinId: string) => {
    const [entId, type, sub] = pinId.split(':');
    if (entId === 'pwr-main') return type.toUpperCase();
    if (type === 'sw') return `Switch ${sub}`;
    if (type === 'in') return `LED Input ${sub}`;
    if (type === 'p') return `IC Pin ${sub}`;
    return pinId;
  };

  const getPinInfo = (pinId: string) => {
    const [entId, type, sub] = pinId.split(':');
    const ent = entities.find(e => e.id === entId);
    let isSource = false;
    let isGnd = false;
    if (type === 'vcc') isSource = true;
    else if (type === 'gnd') isGnd = true;
    else if (type === 'sw') isSource = true;
    else if (type === 'p' && ent?.gateType) {
      const pinNum = parseInt(sub);
      const ds = GATE_DATASHEET[ent.gateType];
      if (ds.pins.outputs.includes(pinNum)) isSource = true;
      else if (pinNum === ds.pins.vcc) isSource = true;
      else if (pinNum === ds.pins.gnd) isGnd = true;
    }
    return { isSource, isGnd };
  };

  const handlePinClick = (pinId: string) => {
    if (!activePin) {
      setActivePin(pinId);
    } else {
      if (activePin === pinId) { setActivePin(null); return; }
      const pinA = getPinInfo(activePin);
      const pinB = getPinInfo(pinId);
      if ((pinA.isSource && pinB.isGnd) || (pinB.isSource && pinA.isGnd)) {
        playError(`Short Circuit! ไม่สามารถต่อ ${getPinName(activePin)} เข้ากับ ${getPinName(pinId)} (VCC ชน GND)`);
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
      position: { x: 420, y: 310 } 
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
    <div className="h-screen w-screen bg-[#0d0f14] flex flex-row overflow-hidden relative">
      
      {/* Sidebar - IC Library */}
      <aside className="w-64 bg-[#111] border-r border-white/5 flex flex-col z-50 shadow-2xl">
        <div className="p-8 border-b border-white/5">
            <h1 className="text-blue-400 font-black text-xl tracking-tighter">LOGIC<br/><span className="text-white opacity-40 text-xs font-normal tracking-normal uppercase">Simulator</span></h1>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            <section>
                <div className="flex items-center gap-2 mb-3 px-2">
                    <i className="fas fa-microchip text-blue-500 text-[10px]"></i>
                    <span className="text-[10px] text-white/40 font-black uppercase tracking-widest">IC Library</span>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {Object.values(GateType).map(gt => (
                        <div key={gt} className="relative group/item">
                          <button 
                            onClick={() => addIC(gt)} 
                            className="w-full flex flex-col items-start p-4 rounded-xl bg-white/5 hover:bg-blue-600 border border-white/5 transition-all group shadow-sm pr-12"
                          >
                            <span className="text-sm font-black text-white group-hover:text-white">{GATE_DATASHEET[gt].model.replace('LS', '')}</span>
                            <span className="text-[9px] text-white/30 group-hover:text-blue-100 uppercase tracking-tighter">{GATE_DATASHEET[gt].title}</span>
                          </button>
                          <button 
                            onClick={() => setInfoGate(gt)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-blue-400 hover:border-white/20 transition-all z-10"
                            title="How it works?"
                          >
                            <i className="fas fa-question text-xs"></i>
                          </button>
                        </div>
                    ))}
                </div>
            </section>
            <button onClick={() => setWires([])} className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-red-600/10 hover:bg-red-600 border border-red-600/20 text-red-500 hover:text-white transition-all font-black text-xs uppercase">
                <i className="fas fa-broom"></i> Reset Wires
            </button>
        </nav>
      </aside>

      {/* Error Alert Overlay - Stable Fade In, No Bouncing or Zooming Effects */}
      {errorMessage && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] px-8 py-5 bg-red-600 text-white rounded-2xl shadow-[0_10px_40px_rgba(220,38,38,0.5)] flex items-center gap-5 border-2 border-red-400 transition-all duration-300 ease-out animate-in fade-in slide-in-from-top-4">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-2xl">
            <i className="fas fa-bolt"></i>
          </div>
          <div>
            <div className="font-black text-xs uppercase tracking-[0.2em] opacity-80 mb-0.5">Wiring Error Detected</div>
            <div className="font-bold text-lg leading-tight">{errorMessage}</div>
          </div>
          <button onClick={() => setErrorMessage(null)} className="ml-4 w-8 h-8 rounded-full hover:bg-white/20 flex items-center justify-center">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Educational Modal */}
      {infoGate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm" onClick={() => setInfoGate(null)}>
          <div 
            className="w-full max-w-lg bg-[#1a1a1a] border border-blue-500/30 rounded-2xl p-8 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setInfoGate(null)} className="absolute top-4 right-4 text-white/40 hover:text-white"><i className="fas fa-times"></i></button>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center text-2xl font-black text-white shadow-lg shadow-blue-500/20">
                {GATE_DATASHEET[infoGate].model.replace('LS', '')}
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tighter uppercase">{GATE_DATASHEET[infoGate].title}</h2>
                <div className="h-1 w-12 bg-blue-500 rounded-full mt-1"></div>
              </div>
            </div>

            <div className="space-y-6">
              <section>
                <p className="text-white/80 leading-relaxed font-medium">
                  {GATE_DATASHEET[infoGate].description}
                </p>
              </section>

              <section className="bg-black/30 p-4 rounded-xl border border-white/5">
                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-3">Truth Table (ตารางความจริง)</h3>
                <pre className="font-mono text-sm text-blue-300 leading-tight">
                  {GATE_DATASHEET[infoGate].truthTable}
                </pre>
              </section>

              <div className="p-4 rounded-xl bg-blue-600/10 border border-blue-500/20 text-blue-300 text-xs italic">
                "จำง่ายๆ: {
                  infoGate === GateType.AND ? 'ต้องมาทั้งคู่ถึงจะติด' : 
                  infoGate === GateType.OR ? 'มาแค่คนเดียวก็ติดแล้ว' :
                  infoGate === GateType.NOT ? 'ชอบทำอะไรตรงกันข้าม' :
                  infoGate === GateType.NAND ? 'ติดตลอด ยกเว้นตอนมาคู่' :
                  infoGate === GateType.NOR ? 'จะติดเฉพาะตอนที่ไม่มาทั้งคู่' :
                  infoGate === GateType.XOR ? 'ต้องมาต่างกันถึงจะติด' : 'ส่งต่อข้อมูลตรงๆ'
                }"
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workspace Area */}
      <main className="flex-1 flex items-center justify-center p-12 overflow-hidden bg-[#0b0c10]">
        <div 
          ref={workspaceRef} 
          onMouseMove={handleMouseMove}
          onMouseUp={() => setDraggingId(null)}
          className="pcb-board"
          style={{ width: `${BOARD_WIDTH}px`, height: `${BOARD_HEIGHT}px`, transform: `scale(${scale})` }}
        >
          {/* Decorative dummy sections */}
          <div className="absolute top-10 right-10 w-24 h-24 nx-panel border-green-500/20 opacity-40 pointer-events-none">
             <div className="absolute inset-4 rounded-full bg-black shadow-inner"></div>
             <div className="absolute -bottom-4 right-0 silk-label text-[8px]">Buzzer</div>
          </div>
          <div className="absolute top-1/2 -translate-y-1/2 right-10 w-20 h-40 nx-panel border-green-500/20 opacity-40 pointer-events-none flex flex-col justify-around items-center">
             {[1,2,3,4].map(i => <div key={i} className="w-12 h-6 bg-blue-600/50 rounded-sm border-2 border-black/50"></div>)}
             <div className="absolute -bottom-4 right-0 silk-label text-[8px]">Terminals</div>
          </div>

          {/* Breadboard */}
          <div className="breadboard absolute top-[230px] left-[150px] w-[800px] h-[400px]">
             <div className="absolute top-4 left-1/2 -translate-x-1/2 silk-label text-[10px] text-black/10">IC Workspace Area</div>
          </div>

          {/* Render All Components */}
          {entities.map(ent => (
            <div key={ent.id} className={`absolute ${ent.type === EntityType.GATE ? 'z-40' : 'z-20'}`} style={{ left: ent.position.x, top: ent.position.y }}>
              
              {/* Power Unit */}
              {ent.type === EntityType.POWER && (
                <div className="nx-panel p-4 flex flex-col gap-10 border-l-8 border-red-500 bg-black/40 shadow-2xl">
                   <div className="flex flex-col items-center gap-2">
                       <div data-pin-id={`${ent.id}:vcc`} onClick={() => handlePinClick(`${ent.id}:vcc`)} className={`w-12 h-12 rounded-full bg-red-600 border-4 border-black/70 cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl flex items-center justify-center text-sm font-black text-white ${activePin === `${ent.id}:vcc` ? 'ring-4 ring-white animate-pulse' : ''}`}>+</div>
                       <span className="silk-label text-[10px] text-red-500 font-black">5V VCC</span>
                   </div>
                   <div className="flex flex-col items-center gap-2">
                       <div data-pin-id={`${ent.id}:gnd`} onClick={() => handlePinClick(`${ent.id}:gnd`)} className={`w-12 h-12 rounded-full bg-[#111] border-4 border-white/10 cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-xl flex items-center justify-center text-sm font-black text-white/50 ${activePin === `${ent.id}:gnd` ? 'ring-4 ring-white animate-pulse' : ''}`}>-</div>
                       <span className="silk-label text-[10px] text-gray-500 font-black">GND</span>
                   </div>
                </div>
              )}

              {/* Switches Panel */}
              {ent.type === EntityType.SWITCH_PANEL && (
                <div className="nx-panel p-6 flex gap-4 border-b-8 border-blue-600 bg-black/30">
                  {ent.state?.map((s: boolean, i: number) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div data-pin-id={`${ent.id}:sw:${i}`} onClick={() => handlePinClick(`${ent.id}:sw:${i}`)} className={`w-8 h-6 bg-black rounded-sm mb-[-15px] cursor-pointer hover:bg-blue-500 z-30 border border-white/10 shadow-inner transition-colors ${activePin === `${ent.id}:sw:${i}` ? 'bg-blue-500 ring-2 ring-white animate-pulse' : ''}`}></div>
                      <SwitchInput index={i} isOn={s} onToggle={() => {
                        setEntities(entities.map(x => x.id === ent.id ? {...x, state: x.state.map((v:any, idx:number) => idx === i ? !v : v)} : x));
                      }} />
                    </div>
                  ))}
                </div>
              )}

              {/* LEDs Panel */}
              {ent.type === EntityType.LED_PANEL && (
                <div className="nx-panel p-6 flex gap-4 border-t-8 border-green-600 bg-black/30">
                  {Array(8).fill(0).map((_, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div data-pin-id={`${ent.id}:in:${i}`} onClick={() => handlePinClick(`${ent.id}:in:${i}`)} className={`w-8 h-6 bg-black rounded-sm mt-[-15px] order-last cursor-pointer hover:bg-green-500 z-30 border border-white/10 shadow-inner transition-colors ${activePin === `${ent.id}:in:${i}` ? 'bg-green-500 ring-2 ring-white animate-pulse' : ''}`}></div>
                      <Bulb isOn={circuitStatus.componentStates[ent.id]?.[i]} />
                    </div>
                  ))}
                </div>
              )}

              {/* 7-Segment Displays */}
              {ent.type === EntityType.SEVEN_SEGMENT && (
                <div className="nx-panel p-4 flex flex-col gap-4 border-t-8 border-red-600 bg-black/30">
                  <SevenSegment segments={circuitStatus.componentStates[ent.id] || {}} />
                  <div className="grid grid-cols-4 gap-2">
                    {['a','b','c','d','e','f','g','dp'].map(seg => (
                      <div key={seg} data-pin-id={`${ent.id}:${seg}`} onClick={() => handlePinClick(`${ent.id}:${seg}`)} className={`w-5 h-5 bg-black rounded-sm text-[8px] text-white/40 flex items-center justify-center font-black cursor-pointer hover:bg-red-600 border border-white/10 ${activePin === `${ent.id}:${seg}` ? 'bg-red-600 ring-2 ring-white animate-pulse' : ''}`}>{seg.toUpperCase()}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* IC Gates */}
              {ent.type === EntityType.GATE && (
                <div className="ic-realistic w-[90px] h-[210px] flex flex-col items-center justify-between p-3 relative select-none" onMouseDown={(e) => startDrag(e, ent.id)}>
                  <div className="absolute left-[-15px] top-6 bottom-6 flex flex-col justify-between">
                    {[1,2,3,4,5,6,7].map(p => (<div key={p} data-pin-id={`${ent.id}:p:${p}`} onClick={(e) => { e.stopPropagation(); handlePinClick(`${ent.id}:p:${p}`); }} className={`w-5 h-5 ic-pin rounded-l-md flex items-center justify-center text-[9px] text-black font-black ${activePin === `${ent.id}:p:${p}` ? 'bg-blue-500 ring-2 ring-white animate-pulse' : ''}`}>{p}</div>))}
                  </div>
                  <div className="absolute right-[-15px] top-6 bottom-6 flex flex-col justify-between">
                    {[14,13,12,11,10,9,8].map(p => (<div key={p} data-pin-id={`${ent.id}:p:${p}`} onClick={(e) => { e.stopPropagation(); handlePinClick(`${ent.id}:p:${p}`); }} className={`w-5 h-5 ic-pin rounded-r-md flex items-center justify-center text-[9px] text-black font-black ${activePin === `${ent.id}:p:${p}` ? 'bg-blue-500 ring-2 ring-white animate-pulse' : ''}`}>{p}</div>))}
                  </div>
                  <div className="w-4 h-4 rounded-full bg-white/10 mt-1 border border-white/5"></div>
                  <div className="text-white font-black text-sm rotate-90 whitespace-nowrap opacity-90 uppercase tracking-[0.2em] pointer-events-none">{GATE_DATASHEET[ent.gateType!].model.replace('LS', '')}</div>
                  <button onClick={(e) => { e.stopPropagation(); setWires(wires.filter(w => !w.from.startsWith(ent.id) && !w.to.startsWith(ent.id))); setEntities(entities.filter(x => x.id !== ent.id)); }} className="text-[9px] bg-red-600/40 text-red-400 hover:bg-red-600 hover:text-white px-2 py-1 rounded transition-all mb-1 font-black shadow-lg">X REMOVE</button>
                  <div className={`absolute top-2 left-2 w-2 h-2 rounded-full ${circuitStatus.icPower.get(ent.id) ? 'bg-green-500 shadow-[0_0_8px_green]' : 'bg-red-900 opacity-20'}`}></div>
                </div>
              )}
            </div>
          ))}

          {/* Wiring Layer */}
          <svg className="absolute inset-0 pointer-events-none z-50 w-full h-full overflow-visible">
            {wires.map((wire, idx) => {
              const start = pinPositions[wire.from];
              const end = pinPositions[wire.to];
              if (!start || !end) return null;
              const isHigh = circuitStatus.wireStatus[idx];
              let color = isHigh ? '#f1c40f' : '#34495e';
              if (wire.from.includes('vcc') || wire.to.includes('vcc') || wire.from.includes('p:14') || wire.to.includes('p:14')) color = '#e74c3c';
              if (wire.from.includes('gnd') || wire.to.includes('gnd') || wire.from.includes('p:7') || wire.to.includes('p:7')) color = '#111';
              return (
                <path 
                  key={idx} 
                  d={`M ${start.x} ${start.y} C ${start.x} ${start.y + 120}, ${end.x} ${end.y - 120}, ${end.x} ${end.y}`} 
                  fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" 
                  className={`pointer-events-auto cursor-pointer hover:stroke-white transition-all opacity-85 ${isHigh ? 'wire-active' : ''}`} 
                  onClick={() => setWires(wires.filter((_, i) => i !== idx))} 
                  style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' }}
                />
              );
            })}
            {activePin && pinPositions[activePin] && (
              <line x1={pinPositions[activePin].x} y1={pinPositions[activePin].y} x2={mousePos.x} y2={mousePos.y} stroke="rgba(255,255,255,0.7)" strokeWidth="3" strokeDasharray="10,5" />
            )}
          </svg>
        </div>
      </main>
    </div>
  );
}
