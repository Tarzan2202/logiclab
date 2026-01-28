
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { GateType, EntityType, CircuitEntity } from './types';
import SwitchInput from './components/SwitchInput';
import Bulb from './components/Bulb';
import { GATE_DATASHEET } from './gateData';

interface Wire {
  from: string; 
  to: string;   
}

export default function App() {
  const [entities, setEntities] = useState<CircuitEntity[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [activePin, setActivePin] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<{title: string, desc: string, tt: string} | null>(null);
  const [pinPositions, setPinPositions] = useState<Record<string, {x: number, y: number}>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [errorFlash, setErrorFlash] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const errorTimeoutRef = useRef<number | null>(null);

  const CHANNELS_PER_IC = 4;

  const playErrorSound = useCallback((message: string) => {
    if (errorTimeoutRef.current) window.clearTimeout(errorTimeoutRef.current);
    
    setErrorMessage(message);
    setErrorFlash(true);
    
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(120, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
      gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {}

    errorTimeoutRef.current = window.setTimeout(() => {
      setErrorFlash(false);
      setErrorMessage(null);
    }, 3000);
  }, []);

  useEffect(() => {
    if (entities.length === 0) {
      setEntities([
        { id: 'pwr-0', type: EntityType.POWER, position: { x: 100, y: 100 } },
        { id: 'sw-0', type: EntityType.SWITCH_PANEL, position: { x: 100, y: 300 }, state: [false, false, false, false, false] },
        { id: 'led-0', type: EntityType.LED_PANEL, position: { x: 900, y: 300 } }
      ]);
    }
  }, []);

  const updatePinPositions = useCallback(() => {
    const positions: Record<string, {x: number, y: number}> = {};
    const pins = document.querySelectorAll('[data-pin-id]');
    const workspaceRect = workspaceRef.current?.getBoundingClientRect();

    if (workspaceRect && workspaceRef.current) {
      const scrollLeft = workspaceRef.current.scrollLeft;
      const scrollTop = workspaceRef.current.scrollTop;
      
      pins.forEach(pin => {
        const id = pin.getAttribute('data-pin-id');
        if (id) {
          const rect = pin.getBoundingClientRect();
          positions[id] = {
            x: rect.left + rect.width / 2 - workspaceRect.left + scrollLeft,
            y: rect.top + rect.height / 2 - workspaceRect.top + scrollTop
          };
        }
      });
      setPinPositions(positions);
    }
  }, []);

  useEffect(() => {
    updatePinPositions();
  }, [entities, wires, updatePinPositions]);

  const getPinInfo = (pinId: string) => {
    const parts = pinId.split(':');
    const type = parts[1]; 
    let functionalType: 'POWER' | 'GROUND' | 'INPUT' | 'OUTPUT' = 'INPUT';
    let label = "พิน";

    if (type === 'vcc') { functionalType = 'POWER'; label = "VCC (5V)"; }
    else if (type === 'gnd') { functionalType = 'GROUND'; label = "GND (กราวด์)"; }
    else if (type === 'sw') { functionalType = 'OUTPUT'; label = "เอาต์พุตสวิตช์"; }
    else if (type === 'ch' && parts[3] === 'out') { functionalType = 'OUTPUT'; label = "เอาต์พุตไอซี"; }
    else if (type === 'ch' && parts[3] === 'in') { functionalType = 'INPUT'; label = "อินพุตไอซี"; }
    else if (type === 'in') { functionalType = 'INPUT'; label = "อินพุตหลอดไฟ"; }

    return { type, functionalType, label };
  };

  const onPinClick = (pinId: string) => {
    if (!activePin) {
      setActivePin(pinId);
    } else {
      if (activePin === pinId) {
        setActivePin(null);
        return;
      }

      const pinA = getPinInfo(activePin);
      const pinB = getPinInfo(pinId);

      // 1. Check GND wire limit
      if (pinB.functionalType === 'GROUND') {
        const existingWire = wires.find(w => w.from === pinId || w.to === pinId);
        if (existingWire) {
          playErrorSound("พิน GND นี้ถูกเชื่อมต่อแล้ว (จำกัด 1 เส้นต่อพิน เพื่อความระเบียบ)");
          setActivePin(null);
          return;
        }
      }
      if (pinA.functionalType === 'GROUND') {
        const existingWire = wires.find(w => w.from === activePin || w.to === activePin);
        if (existingWire) {
          playErrorSound("พิน GND นี้ถูกเชื่อมต่อแล้ว (จำกัด 1 เส้นต่อพิน เพื่อความระเบียบ)");
          setActivePin(null);
          return;
        }
      }

      // 2. Validate dangerous connections
      const isA_Source = (pinA.functionalType === 'OUTPUT' || pinA.functionalType === 'POWER');
      const isB_Source = (pinB.functionalType === 'OUTPUT' || pinB.functionalType === 'POWER');
      const isA_Gnd = pinA.functionalType === 'GROUND';
      const isB_Gnd = pinB.functionalType === 'GROUND';

      // Source to Ground = Short Circuit
      if ((isA_Source && isB_Gnd) || (isB_Source && isA_Gnd)) {
        playErrorSound("อันตราย! ห้ามต่อแหล่งจ่ายไฟหรือเอาต์พุตลงกราวด์โดยตรง เพราะจะทำให้ไฟลัดวงจร");
        setActivePin(null);
        return;
      }

      // Source to Source = Contention
      if (isA_Source && isB_Source) {
        if (pinA.type === 'vcc' && pinB.type === 'vcc') {
          // Allow VCC to VCC
        } else {
          playErrorSound(`ไม่สามารถต่อ ${pinA.label} เข้ากับ ${pinB.label} ได้ เพราะเอาต์พุตจะชนกัน (Logic Contention)`);
          setActivePin(null);
          return;
        }
      }

      // Input to Input
      if (pinA.functionalType === 'INPUT' && pinB.functionalType === 'INPUT') {
        playErrorSound("ไม่ควรต่อพินอินพุตเข้าหากัน เพราะไม่มีสัญญาณไฟเลี้ยงวงจร");
        setActivePin(null);
        return;
      }

      setWires([...wires, { from: activePin, to: pinId }]);
      setActivePin(null);
      setErrorMessage(null);
    }
  };

  const circuitState = useMemo(() => {
    const pinStates: Record<string, boolean> = {};
    const channelResults: Record<string, boolean> = {};
    const icPowerStates: Record<string, boolean> = {};

    const isConnectedToGnd = (pinId: string, visited = new Set<string>()): boolean => {
      const [entId, pinType] = pinId.split(':');
      const ent = entities.find(e => e.id === entId);
      if (ent?.type === EntityType.POWER && pinType === 'gnd') return true;
      if (visited.has(pinId)) return false;
      visited.add(pinId);
      const connectedWires = wires.filter(w => w.to === pinId || w.from === pinId);
      for (const wire of connectedWires) {
        const otherSide = wire.to === pinId ? wire.from : wire.to;
        if (isConnectedToGnd(otherSide, visited)) return true;
      }
      return false;
    };

    const isConnectedToVcc = (pinId: string, visited = new Set<string>()): boolean => {
      const [entId, pinType] = pinId.split(':');
      const ent = entities.find(e => e.id === entId);
      if (ent?.type === EntityType.POWER && pinType === 'vcc') return true;
      if (visited.has(pinId)) return false;
      visited.add(pinId);
      const connectedWires = wires.filter(w => w.to === pinId || w.from === pinId);
      for (const wire of connectedWires) {
        const otherSide = wire.to === pinId ? wire.from : wire.to;
        if (isConnectedToVcc(otherSide, visited)) return true;
      }
      return false;
    };

    const evaluateGateChannel = (gateId: string, channel: number): boolean => {
      const key = `${gateId}:${channel}`;
      if (channelResults[key] !== undefined) return channelResults[key];
      const ent = entities.find(e => e.id === gateId);
      if (!ent || ent.type !== EntityType.GATE) return false;
      const hasPower = isConnectedToVcc(`${gateId}:vcc`) && isConnectedToGnd(`${gateId}:gnd`);
      icPowerStates[gateId] = hasPower;
      if (!hasPower) {
        channelResults[key] = false;
        return false;
      }
      const inputValues = [0, 1].map(i => getSignalState(`${gateId}:ch:${channel}:in:${i}`));
      let res = false;
      switch (ent.gateType) {
        case GateType.AND: res = inputValues[0] && inputValues[1]; break;
        case GateType.OR: res = inputValues[0] || inputValues[1]; break;
        case GateType.NOT: res = !inputValues[0]; break;
        case GateType.NAND: res = !(inputValues[0] && inputValues[1]); break;
        case GateType.NOR: res = !(inputValues[0] || inputValues[1]); break;
        case GateType.XOR: res = inputValues[0] !== inputValues[1]; break;
        case GateType.BUFFER: res = inputValues[0]; break;
      }
      channelResults[key] = res;
      return res;
    };

    const getSignalState = (pinId: string, visited = new Set<string>()): boolean => {
      if (pinStates[pinId] !== undefined) return pinStates[pinId];
      const parts = pinId.split(':');
      const entId = parts[0];
      const pinType = parts[1];
      const ent = entities.find(e => e.id === entId);
      if (ent) {
        if (ent.type === EntityType.POWER && pinType === 'vcc') return true;
        if (ent.type === EntityType.POWER && pinType === 'gnd') return false;
        if (ent.type === EntityType.SWITCH_PANEL && pinType === 'sw') {
          const swIdx = parseInt(parts[2]);
          return ent.state ? ent.state[swIdx] : false;
        }
        if (ent.type === EntityType.GATE && pinType === 'ch' && parts[3] === 'out') {
          const chIdx = parseInt(parts[2]);
          return evaluateGateChannel(entId, chIdx);
        }
      }
      if (visited.has(pinId)) return false;
      visited.add(pinId);
      const connectedWires = wires.filter(w => w.to === pinId || w.from === pinId);
      for (const wire of connectedWires) {
        const otherSide = wire.to === pinId ? wire.from : wire.to;
        if (getSignalState(otherSide, visited)) {
          pinStates[pinId] = true;
          return true;
        }
      }
      pinStates[pinId] = false;
      return false;
    };

    const ledStates: Record<string, boolean> = {};
    entities.forEach(ent => {
       if (ent.type === EntityType.LED_PANEL) {
         ledStates[ent.id] = getSignalState(`${ent.id}:in`);
       }
       if (ent.type === EntityType.GATE) {
         icPowerStates[ent.id] = isConnectedToVcc(`${ent.id}:vcc`) && isConnectedToGnd(`${ent.id}:gnd`);
       }
    });

    const wireStates = wires.map(w => getSignalState(w.from) || getSignalState(w.to));
    return { ledStates, wireStates, icPowerStates };
  }, [entities, wires]);

  const addEntity = (type: EntityType, gateType?: GateType) => {
    const id = Math.random().toString(36).substr(2, 6);
    setEntities([...entities, {
      id, type, gateType,
      position: { x: 400 + (entities.length % 4) * 40, y: 250 + (entities.length % 4) * 40 },
      state: type === EntityType.SWITCH_PANEL ? [false, false, false, false, false] : undefined
    }]);
  };

  const toggleSwitch = (entId: string, idx: number) => {
    setEntities(entities.map(e => (e.id === entId && e.state) ? { ...e, state: e.state.map((s: boolean, i: number) => i === idx ? !s : s) } : e));
  };

  const handleGateInfo = (type: GateType) => {
    const info = GATE_DATASHEET[type];
    setExplanation({
      title: info.title,
      desc: info.description,
      tt: info.truthTable,
    });
  };

  const onMouseDown = (e: React.MouseEvent, id: string) => {
    const ent = entities.find(g => g.id === id);
    if (ent && workspaceRef.current) {
      const rect = workspaceRef.current.getBoundingClientRect();
      setDraggingId(id);
      setDragOffset({ x: e.clientX - rect.left - ent.position.x, y: e.clientY - rect.top - ent.position.y });
    }
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (workspaceRef.current) {
      const rect = workspaceRef.current.getBoundingClientRect();
      const currentX = e.clientX - rect.left + workspaceRef.current.scrollLeft;
      const currentY = e.clientY - rect.top + workspaceRef.current.scrollTop;
      setMousePos({ x: currentX, y: currentY });
      if (draggingId) {
        setEntities(entities.map(g => g.id === draggingId ? { ...g, position: { x: e.clientX - rect.left - dragOffset.x, y: e.clientY - rect.top - dragOffset.y } } : g));
        updatePinPositions();
      }
    }
  };

  return (
    <div className={`h-screen w-screen flex flex-col bg-[#0d0f14] text-gray-300 font-mono select-none overflow-hidden transition-all duration-300 ${errorFlash ? 'brightness-125' : ''}`} onMouseMove={onMouseMove} onMouseUp={() => setDraggingId(null)}>
      
      {/* Dynamic Error Notification */}
      {errorMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-bounce pointer-events-none">
          <div className="bg-red-600/90 text-white px-6 py-3 rounded-2xl shadow-2xl border-2 border-white/20 flex items-center gap-4 backdrop-blur-md">
            <i className="fa-solid fa-triangle-exclamation text-xl"></i>
            <span className="text-xs font-bold">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* Navbar */}
      <nav className="h-14 bg-[#141b26] border-b border-white/5 flex items-center justify-between px-6 z-50 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/10 p-2 rounded-lg border border-blue-500/20">
            <i className="fa-solid fa-microchip text-blue-400 text-xl"></i>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-widest text-white uppercase">LogicLab Realistic</span>
            <span className="text-[9px] text-blue-400/60 uppercase font-bold">Simulator v4.5 Pro Edition (Offline)</span>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={() => { setEntities([]); setWires([]); }} className="text-[10px] font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 px-4 py-2 rounded-md border border-red-500/20 uppercase transition-all flex items-center gap-2">
            <i className="fa-solid fa-rotate-left"></i> รีเซ็ตวงจร
          </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-[#141b26] border-r border-white/5 p-5 flex flex-col gap-8 overflow-y-auto z-40 shadow-2xl">
          <div>
            <h3 className="text-[10px] text-blue-400/70 uppercase mb-4 font-black tracking-widest flex items-center gap-2">
              <i className="fa-solid fa-plus-circle"></i> อุปกรณ์ลอจิก (IC)
            </h3>
            <div className="grid grid-cols-1 gap-2">
              {Object.values(GateType).map(gt => (
                <button 
                  key={gt} 
                  onClick={() => addEntity(EntityType.GATE, gt)} 
                  className="bg-white/5 hover:bg-white/10 border border-white/5 p-2.5 rounded-lg text-[10px] font-bold text-left flex justify-between items-center transition-all group"
                >
                  <span className="group-hover:text-blue-400">{GATE_DATASHEET[gt].model}</span>
                  <span className="text-[8px] px-2 py-0.5 bg-black/40 rounded text-gray-500 group-hover:text-blue-400/60">{gt}</span>
                </button>
              ))}
            </div>
          </div>
          
          <div>
             <h3 className="text-[10px] text-blue-400/70 uppercase mb-4 font-black tracking-widest flex items-center gap-2">
               <i className="fa-solid fa-bolt"></i> แหล่งจ่าย & แสดงผล
             </h3>
             <div className="grid grid-cols-1 gap-2">
                <button onClick={() => addEntity(EntityType.POWER)} className="bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 p-2.5 rounded-lg text-[10px] font-bold text-red-400/80 transition-all flex items-center gap-3">
                  <i className="fa-solid fa-car-battery"></i> แหล่งจ่ายไฟ 5V
                </button>
                <button onClick={() => addEntity(EntityType.SWITCH_PANEL)} className="bg-blue-500/5 hover:bg-blue-500/10 border border-blue-500/10 p-2.5 rounded-lg text-[10px] font-bold text-blue-400/80 transition-all flex items-center gap-3">
                  <i className="fa-solid fa-toggle-on"></i> แผงสวิตช์อินพุต
                </button>
                <button onClick={() => addEntity(EntityType.LED_PANEL)} className="bg-green-500/5 hover:bg-green-500/10 border border-green-500/10 p-2.5 rounded-lg text-[10px] font-bold text-green-400/80 transition-all flex items-center gap-3">
                  <i className="fa-solid fa-lightbulb"></i> โมดูลหลอดไฟ LED
                </button>
             </div>
          </div>

          <div className="mt-auto pt-6 border-t border-white/5">
             <div className="glass-panel rounded-xl p-4 min-h-[160px]">
                <h4 className="text-[10px] text-blue-400 font-black uppercase tracking-widest mb-3">ข้อมูลไอซี</h4>
                {explanation ? (
                  <div className="space-y-2">
                    <div className="text-[11px] text-white font-bold leading-tight">{explanation.title}</div>
                    <div className="text-[9px] text-gray-400 leading-relaxed italic">{explanation.desc}</div>
                    <div className="text-[8px] bg-black/60 p-2 rounded-lg font-mono text-green-400 whitespace-pre border border-white/5 shadow-inner">
                      {explanation.tt}
                    </div>
                  </div>
                ) : (
                  <div className="text-[9px] text-gray-500 leading-relaxed text-center py-4 flex flex-col gap-2">
                    <i className="fa-solid fa-circle-question text-xl opacity-20"></i>
                    คลิกที่เครื่องหมาย (?) บนตัวไอซี<br/>เพื่อดูตารางความจริง
                  </div>
                )}
             </div>
          </div>
        </aside>

        {/* Workspace */}
        <main ref={workspaceRef} className="flex-1 relative wokwi-grid overflow-auto scrollbar-hide cursor-crosshair">
          {/* Layer: Wires (Frontmost z-30) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-30 min-w-[2000px] min-h-[2000px]">
            {wires.map((wire, idx) => {
              const start = pinPositions[wire.from];
              const end = pinPositions[wire.to];
              if (!start || !end) return null;
              const isHigh = circuitState.wireStates[idx];
              let color = isHigh ? '#fb923c' : '#2d3748';
              if (wire.from.includes(':vcc') || wire.to.includes(':vcc')) color = isHigh ? '#f87171' : '#7f1d1d';
              if (wire.from.includes(':gnd') || wire.to.includes(':gnd')) color = '#1a202c';
              
              return (
                <g key={idx}>
                  <path 
                    d={`M ${start.x} ${start.y} C ${start.x + 40} ${start.y}, ${end.x - 40} ${end.y}, ${end.x} ${end.y}`} 
                    fill="none" 
                    stroke={color} 
                    strokeWidth={isHigh ? "4" : "3"} 
                    className={`transition-all duration-300 pointer-events-auto cursor-pointer hover:stroke-blue-400 ${isHigh ? 'wire-active' : ''}`} 
                    onClick={() => setWires(wires.filter((_, i) => i !== idx))} 
                  />
                  {isHigh && <circle cx={start.x} cy={start.y} r="3" fill="#fb923c" className="animate-ping" />}
                </g>
              );
            })}
            {activePin && pinPositions[activePin] && (
              <line x1={pinPositions[activePin].x} y1={pinPositions[activePin].y} x2={mousePos.x} y2={mousePos.y} stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeDasharray="6,4" />
            )}
          </svg>

          {/* Layer: Components (Mid-ground z-20) */}
          <div className="relative w-full h-full min-h-[2000px] min-w-[2000px] p-20">
            {entities.map(ent => (
              <div key={ent.id} className="absolute ic-body rounded-xl border border-white/5 shadow-2xl z-20 overflow-hidden min-w-[120px]" style={{ left: ent.position.x, top: ent.position.y }}>
                <div onMouseDown={(e) => onMouseDown(e, ent.id)} className="bg-[#1a1a1a] px-3 py-1.5 flex justify-between items-center cursor-move border-b border-white/5">
                  <div className="flex items-center gap-2">
                    {ent.type === EntityType.GATE && (
                      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${circuitState.icPowerStates[ent.id] ? 'bg-green-500 shadow-[0_0_10px_#22c55e]' : 'bg-red-900 shadow-none'}`} title="IC Power Status"></div>
                    )}
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">{ent.gateType ? GATE_DATASHEET[ent.gateType].model : ent.type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex gap-2">
                    {ent.gateType && <button onClick={() => handleGateInfo(ent.gateType!)} className="w-4 h-4 rounded-full bg-blue-500/10 text-blue-400 text-[9px] flex items-center justify-center hover:bg-blue-500/20">?</button>}
                    <button onClick={() => setEntities(entities.filter(x => x.id !== ent.id))} className="w-4 h-4 rounded-full bg-red-500/10 text-red-500 text-[9px] flex items-center justify-center hover:bg-red-500/20">×</button>
                  </div>
                </div>

                <div className="p-5 flex flex-col gap-4 bg-[#121212]/80">
                  {ent.type === EntityType.POWER && (
                    <div className="flex gap-10 justify-center py-2">
                      <div className="flex flex-col items-center gap-2">
                        <div data-pin-id={`${ent.id}:vcc`} onClick={() => onPinClick(`${ent.id}:vcc`)} className="w-6 h-6 rounded-full border-2 border-black/50 bg-red-600 cursor-pointer hover:scale-125 transition-transform shadow-lg shadow-red-900/20"></div>
                        <span className="text-[7px] text-red-500 font-black">5V VCC</span>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <div data-pin-id={`${ent.id}:gnd`} onClick={() => onPinClick(`${ent.id}:gnd`)} className="w-6 h-6 rounded-full border-2 border-white/5 bg-[#0a0a0a] cursor-pointer hover:scale-125 transition-transform shadow-lg"></div>
                        <span className="text-[7px] text-gray-500 font-black">GND</span>
                      </div>
                    </div>
                  )}

                  {ent.type === EntityType.GATE && (
                    <>
                      <div className="flex justify-between items-center px-1">
                        <div data-pin-id={`${ent.id}:vcc`} onClick={() => onPinClick(`${ent.id}:vcc`)} className="w-3.5 h-3.5 bg-red-600 rounded-sm border border-black cursor-pointer hover:brightness-150 transition-all" title="Pin 14: VCC"></div>
                        <div data-pin-id={`${ent.id}:gnd`} onClick={() => onPinClick(`${ent.id}:gnd`)} className="w-3.5 h-3.5 bg-black rounded-sm border border-white/10 cursor-pointer hover:brightness-150 transition-all" title="Pin 7: GND"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {[...Array(CHANNELS_PER_IC)].map((_, ch) => (
                          <div key={ch} className="border border-white/5 p-2 rounded-lg bg-black/40 shadow-inner">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[6px] text-gray-600 font-black">UNIT {ch+1}</span>
                              <div data-pin-id={`${ent.id}:ch:${ch}:out`} onClick={() => onPinClick(`${ent.id}:ch:${ch}:out`)} className="w-3 h-3 bg-blue-500 rounded-sm border border-black cursor-pointer hover:brightness-150"></div>
                            </div>
                            <div className="flex gap-2 justify-center">
                              {[0, 1].map(i => (ent.gateType === GateType.NOT && i > 0) ? null : (
                                <div key={i} data-pin-id={`${ent.id}:ch:${ch}:in:${i}`} onClick={() => onPinClick(`${ent.id}:ch:${ch}:in:${i}`)} className="w-3 h-3 bg-orange-400 rounded-sm border border-black cursor-pointer hover:brightness-150" title={`Input ${i+1}`}></div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {ent.type === EntityType.SWITCH_PANEL && (
                    <div className="flex gap-3 justify-center">
                       {ent.state?.map((val: boolean, idx: number) => (
                         <div key={idx} className="flex flex-col items-center gap-1">
                            <div data-pin-id={`${ent.id}:sw:${idx}:out`} onClick={() => onPinClick(`${ent.id}:sw:${idx}:out`)} className="w-3.5 h-2.5 bg-blue-400 rounded-t-md mb-[-2px] border border-black/50 cursor-pointer hover:bg-white shadow-lg shadow-blue-500/10"></div>
                            <SwitchInput index={idx} isOn={val} onToggle={() => toggleSwitch(ent.id, idx)} />
                         </div>
                       ))}
                    </div>
                  )}

                  {ent.type === EntityType.LED_PANEL && (
                    <div className="flex flex-col items-center p-2">
                       <div data-pin-id={`${ent.id}:in`} onClick={() => onPinClick(`${ent.id}:in`)} className="w-5 h-4 bg-gray-800 rounded-md mb-[-12px] relative z-20 cursor-pointer hover:bg-gray-700 border border-black/50 shadow-2xl"></div>
                       <Bulb isOn={circuitState.ledStates[ent.id] || false} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
