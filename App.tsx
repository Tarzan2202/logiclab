
import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { GateType, EntityType, CircuitEntity } from './types';
import SwitchInput from './components/SwitchInput';
import Bulb from './components/Bulb';
import { GATE_DATASHEET } from './gateData';
import { getGateExplanation } from './services/geminiService';

interface Wire {
  from: string; // pin ID (e.g., 'pwr-0:vcc', 'gate-abc:ch:0:out')
  to: string;   // pin ID
}

export default function App() {
  const [entities, setEntities] = useState<CircuitEntity[]>([]);
  const [wires, setWires] = useState<Wire[]>([]);
  const [activePin, setActivePin] = useState<string | null>(null);
  const [explanation, setExplanation] = useState<{title: string, desc: string, tt: string} | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [pinPositions, setPinPositions] = useState<Record<string, {x: number, y: number}>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const workspaceRef = useRef<HTMLDivElement>(null);

  const CHANNELS_PER_IC = 4;

  useEffect(() => {
    if (entities.length === 0) {
      setEntities([
        { id: 'pwr-0', type: EntityType.POWER, position: { x: 50, y: 50 } },
        { id: 'sw-0', type: EntityType.SWITCH_PANEL, position: { x: 50, y: 200 }, state: [false, false, false, false, false] },
        { id: 'led-0', type: EntityType.LED_PANEL, position: { x: 800, y: 200 } }
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

      // Power check
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

      // 1. Check if this pin is a source
      if (ent) {
        if (ent.type === EntityType.POWER && pinType === 'vcc') return true;
        if (ent.type === EntityType.POWER && pinType === 'gnd') return false;
        if (ent.type === EntityType.SWITCH_PANEL && pinType === 'sw') {
          const swIdx = parseInt(parts[2]);
          return ent.state ? ent.state[swIdx] : false;
        }
        // FIX: index 3 is 'out' for 'entId:ch:0:out'
        if (ent.type === EntityType.GATE && pinType === 'ch' && parts[3] === 'out') {
          const chIdx = parseInt(parts[2]);
          return evaluateGateChannel(entId, chIdx);
        }
      }

      // 2. Propagate via wires
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
         // Force power check for IC indicators
         icPowerStates[ent.id] = isConnectedToVcc(`${ent.id}:vcc`) && isConnectedToGnd(`${ent.id}:gnd`);
       }
    });

    const wireStates = wires.map(w => getSignalState(w.from) || getSignalState(w.to));

    return { ledStates, wireStates, icPowerStates };
  }, [entities, wires]);

  const onPinClick = (pinId: string) => {
    if (!activePin) {
      setActivePin(pinId);
    } else {
      if (activePin !== pinId) {
        setWires([...wires, { from: activePin, to: pinId }]);
      }
      setActivePin(null);
    }
  };

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

  const handleGateInfo = async (type: GateType) => {
    setIsSearching(true);
    setExplanation(null);
    const info = await getGateExplanation(type);
    setExplanation(info ? { title: info.title, desc: info.description, tt: info.truthTable } : {
      title: GATE_DATASHEET[type].title,
      desc: GATE_DATASHEET[type].description,
      tt: GATE_DATASHEET[type].truthTable,
    });
    setIsSearching(false);
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
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0a] text-gray-300 font-mono select-none overflow-hidden" onMouseMove={onMouseMove} onMouseUp={() => setDraggingId(null)}>
      <nav className="h-12 bg-[#1a1a1a] border-b border-[#333] flex items-center justify-between px-4 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <i className="fa-solid fa-microchip text-blue-500 text-lg"></i>
          <span className="text-sm font-bold tracking-widest text-white uppercase">LogicLab Realistic v4.2</span>
        </div>
        <div className="flex gap-4">
          <button onClick={() => { setEntities([]); setWires([]); }} className="text-[10px] bg-red-900/30 hover:bg-red-900/50 text-red-400 px-3 py-1 rounded border border-red-900/50 uppercase transition-all">Reset Circuit</button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-56 bg-[#151515] border-r border-[#222] p-4 flex flex-col gap-6 overflow-y-auto z-40">
          <div>
            <h3 className="text-[9px] text-gray-500 uppercase mb-4 font-bold tracking-widest">Logic Components</h3>
            <div className="grid grid-cols-1 gap-2">
              {Object.values(GateType).map(gt => (
                <button key={gt} onClick={() => addEntity(EntityType.GATE, gt)} className="bg-[#222] hover:bg-[#2a2a2a] border border-[#333] p-2 rounded text-[10px] font-bold text-left hover:text-blue-400 transition-all">Quad {gt} IC</button>
              ))}
            </div>
          </div>
          <div>
             <h3 className="text-[9px] text-gray-500 uppercase mb-4 font-bold tracking-widest">Input/Output</h3>
             <div className="grid grid-cols-1 gap-2">
                <button onClick={() => addEntity(EntityType.POWER)} className="bg-[#222] hover:bg-[#2a2a2a] border border-[#333] p-2 rounded text-[10px] font-bold text-red-400">Battery / 5V</button>
                <button onClick={() => addEntity(EntityType.SWITCH_PANEL)} className="bg-[#222] hover:bg-[#2a2a2a] border border-[#333] p-2 rounded text-[10px] font-bold text-blue-400">Switch Array</button>
                <button onClick={() => addEntity(EntityType.LED_PANEL)} className="bg-[#222] hover:bg-[#2a2a2a] border border-[#333] p-2 rounded text-[10px] font-bold text-green-400">LED Module</button>
             </div>
          </div>
          <div className="mt-auto border-t border-[#222] pt-4">
             <div className="bg-black/50 rounded-lg p-3 min-h-[140px] border border-[#222]">
                <h4 className="text-[9px] text-blue-500 mb-2 font-bold uppercase tracking-widest">Debugger</h4>
                {isSearching ? <div className="text-[8px] animate-pulse">ANALYZING...</div> : explanation ? <div className="space-y-1"><div className="text-[10px] text-white font-bold">{explanation.title}</div><div className="text-[8px] text-gray-400 leading-tight">{explanation.desc}</div></div> : <div className="text-[8px] text-gray-600">Click (?) on modules to view truth tables.</div>}
             </div>
          </div>
        </aside>

        <main ref={workspaceRef} className="flex-1 relative wokwi-grid overflow-auto scrollbar-hide cursor-crosshair">
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 min-w-[2000px] min-h-[2000px]">
            {wires.map((wire, idx) => {
              const start = pinPositions[wire.from];
              const end = pinPositions[wire.to];
              if (!start || !end) return null;
              const isHigh = circuitState.wireStates[idx];
              let color = isHigh ? '#f97316' : '#262626';
              if (wire.from.includes(':vcc') || wire.to.includes(':vcc')) color = isHigh ? '#ef4444' : '#450a0a';
              if (wire.from.includes(':gnd') || wire.to.includes(':gnd')) color = '#000000';
              return (
                <g key={idx}>
                  <path d={`M ${start.x} ${start.y} C ${start.x + 40} ${start.y}, ${end.x - 40} ${end.y}, ${end.x} ${end.y}`} fill="none" stroke={color} strokeWidth={isHigh ? "3" : "2"} className="transition-all duration-300 pointer-events-auto cursor-pointer hover:stroke-yellow-400" onClick={() => setWires(wires.filter((_, i) => i !== idx))} />
                  {isHigh && <circle cx={start.x} cy={start.y} r="3" fill="#fb923c" className="animate-pulse" />}
                </g>
              );
            })}
            {activePin && pinPositions[activePin] && <line x1={pinPositions[activePin].x} y1={pinPositions[activePin].y} x2={mousePos.x} y2={mousePos.y} stroke="white" strokeWidth="1" strokeDasharray="4" />}
          </svg>

          <div className="relative w-full h-full min-h-[2000px] min-w-[2000px]">
            {entities.map(ent => (
              <div key={ent.id} className="absolute ic-body rounded-md border-t border-white/10 shadow-2xl z-20 overflow-hidden" style={{ left: ent.position.x, top: ent.position.y }}>
                <div onMouseDown={(e) => onMouseDown(e, ent.id)} className="bg-[#111] px-3 py-1 flex justify-between items-center cursor-move border-b border-white/5">
                  <div className="flex items-center gap-2">
                    {ent.type === EntityType.GATE && (
                      <div className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${circuitState.icPowerStates[ent.id] ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-red-900'}`} title="IC Power Status"></div>
                    )}
                    <span className="text-[7px] font-bold text-gray-500 uppercase tracking-widest">{ent.gateType || ent.type.replace('_', ' ')}</span>
                  </div>
                  <div className="flex gap-2">
                    {ent.gateType && <button onClick={() => handleGateInfo(ent.gateType!)} className="text-[9px] text-blue-500 hover:text-white">?</button>}
                    <button onClick={() => setEntities(entities.filter(x => x.id !== ent.id))} className="text-[9px] text-red-900 hover:text-red-500">×</button>
                  </div>
                </div>

                <div className="p-4 flex flex-col gap-4 bg-[#1a1a1a]">
                  {ent.type === EntityType.POWER && (
                    <div className="flex gap-8 justify-center py-2">
                      <div className="flex flex-col items-center gap-1">
                        <div data-pin-id={`${ent.id}:vcc`} onClick={() => onPinClick(`${ent.id}:vcc`)} className="w-5 h-5 rounded-full border-2 border-black bg-red-600 cursor-pointer hover:scale-110 transition-transform shadow-inner"></div>
                        <span className="text-[6px] text-red-600 font-bold">5V</span>
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div data-pin-id={`${ent.id}:gnd`} onClick={() => onPinClick(`${ent.id}:gnd`)} className="w-5 h-5 rounded-full border-2 border-white/10 bg-black cursor-pointer hover:scale-110 transition-transform shadow-inner"></div>
                        <span className="text-[6px] text-gray-600 font-bold">GND</span>
                      </div>
                    </div>
                  )}

                  {ent.type === EntityType.GATE && (
                    <>
                      <div className="flex justify-between items-center mb-1">
                        <div data-pin-id={`${ent.id}:vcc`} onClick={() => onPinClick(`${ent.id}:vcc`)} className="w-3 h-3 bg-red-600 rounded-sm border border-black cursor-pointer hover:bg-white" title="IC VCC (Pin 14)"></div>
                        <div data-pin-id={`${ent.id}:gnd`} onClick={() => onPinClick(`${ent.id}:gnd`)} className="w-3 h-3 bg-black rounded-sm border border-white/10 cursor-pointer hover:bg-white" title="IC GND (Pin 7)"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {[...Array(CHANNELS_PER_IC)].map((_, ch) => (
                          <div key={ch} className="border border-white/5 p-2 rounded bg-black/20">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[5px] text-gray-600 uppercase">Unit {ch+1}</span>
                              <div data-pin-id={`${ent.id}:ch:${ch}:out`} onClick={() => onPinClick(`${ent.id}:ch:${ch}:out`)} className="w-2.5 h-2.5 bg-blue-600 rounded-sm border border-black cursor-pointer hover:bg-white" title="Output"></div>
                            </div>
                            <div className="flex gap-1.5 justify-center">
                              {[0, 1].map(i => (ent.gateType === GateType.NOT && i > 0) ? null : (
                                <div key={i} data-pin-id={`${ent.id}:ch:${ch}:in:${i}`} onClick={() => onPinClick(`${ent.id}:ch:${ch}:in:${i}`)} className="w-2.5 h-2.5 bg-orange-500 rounded-sm border border-black cursor-pointer hover:bg-white" title={`In ${i+1}`}></div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {ent.type === EntityType.SWITCH_PANEL && (
                    <div className="grid grid-cols-5 gap-2">
                       {ent.state?.map((val: boolean, idx: number) => (
                         <div key={idx} className="flex flex-col items-center gap-1">
                            <div data-pin-id={`${ent.id}:sw:${idx}:out`} onClick={() => onPinClick(`${ent.id}:sw:${idx}:out`)} className="w-3 h-2 bg-blue-400 rounded-t-sm mb-[-2px] border border-black/50 cursor-pointer hover:bg-white" title="SW Out"></div>
                            <SwitchInput index={idx} isOn={val} onToggle={() => toggleSwitch(ent.id, idx)} />
                         </div>
                       ))}
                    </div>
                  )}

                  {ent.type === EntityType.LED_PANEL && (
                    <div className="flex flex-col items-center">
                       <div data-pin-id={`${ent.id}:in`} onClick={() => onPinClick(`${ent.id}:in`)} className="w-4 h-3 bg-gray-700 rounded-sm mb-[-10px] relative z-20 cursor-pointer hover:bg-white border border-black/50"></div>
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
