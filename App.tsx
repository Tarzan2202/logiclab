
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
  const [hoveredPin, setHoveredPin] = useState<string | null>(null);
  const [pinPositions, setPinPositions] = useState<Record<string, {x: number, y: number}>>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [shortCircuitAlert, setShortCircuitAlert] = useState(false);
  const [selectedGateInfo, setSelectedGateInfo] = useState<GateType | null>(null);
  const [powerOn, setPowerOn] = useState(false);
  
  // Logic Probe States
  const [probeConnectedPin, setProbeConnectedPin] = useState<string | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  
  const [clockFreq, setClockFreq] = useState(2); // Hz
  const [clockState, setClockState] = useState(false);
  const [pulseStates, setPulseStates] = useState({ p1: false, p2: false });
  const [switches, setSwitches] = useState<boolean[]>(Array(8).fill(false));
  const [voltageValue, setVoltageValue] = useState(2.5); // 0-5V
  
  const workspaceRef = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const buzzerOscRef = useRef<OscillatorNode | null>(null);
  const buzzerGainRef = useRef<GainNode | null>(null);
  
  const BOARD_WIDTH = 1920;
  const BOARD_HEIGHT = 1080;

  // Initialize Audio
  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        buzzerGainRef.current = audioCtxRef.current.createGain();
        buzzerGainRef.current.gain.value = 0;
        buzzerGainRef.current.connect(audioCtxRef.current.destination);
      }
    };
    window.addEventListener('mousedown', initAudio, { once: true });
    return () => window.removeEventListener('mousedown', initAudio);
  }, []);

  const playAlertSound = (type: 'short' | 'beep' | 'probe') => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);
    
    if (type === 'short') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, audioCtxRef.current.currentTime);
      osc.frequency.exponentialRampToValueAtTime(40, audioCtxRef.current.currentTime + 0.3);
      gain.gain.setValueAtTime(0.3, audioCtxRef.current.currentTime);
      gain.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 0.3);
    } 
    
    osc.start();
    osc.stop(audioCtxRef.current.currentTime + 0.3);
  };

  useEffect(() => {
    const interval = setInterval(() => setClockState(p => !p), 1000 / (clockFreq * 2));
    return () => clearInterval(interval);
  }, [clockFreq]);

  useEffect(() => {
    const handleResize = () => {
      const sidebarWidth = isSidebarOpen ? 256 : 0;
      const availableWidth = window.innerWidth - sidebarWidth;
      const availableHeight = window.innerHeight;
      const margin = 100;
      const scaleX = (availableWidth - margin) / BOARD_WIDTH;
      const scaleY = (availableHeight - margin) / BOARD_HEIGHT;
      setScale(Math.min(scaleX, scaleY, 1.0));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

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
    const timer = setInterval(updatePositions, 100);
    return () => clearInterval(timer);
  }, [updatePositions]);

  const getPinValue = useCallback((pid: string, visited = new Set<string>()): number => {
    if (!powerOn) return 0;
    
    const basePid = pid.replace(/:[ab]$/, '');
    if (visited.has(basePid)) return 0;
    visited.add(basePid);

    const [eid, type, sub] = basePid.split(':');
    if (type === 'vcc') return 5;
    if (type === 'gnd') return 0;
    if (type === 'clk') return clockState ? 5 : 0;
    if (type === 'pls') return (sub === '1' ? pulseStates.p1 : pulseStates.p2) ? 5 : 0;
    if (type === 'sw') return switches[parseInt(sub)] ? 5 : 0;
    if (type === 'vadj') return voltageValue;
    
    const ent = entities.find(e => e.id === eid);
    if (type === 'p' && ent?.gateType) {
      const pinNum = parseInt(sub);
      const ds = GATE_DATASHEET[ent.gateType];
      const hasVcc = wires.some(w => (w.from === `${eid}:p:${ds.pins.vcc}` || w.to === `${eid}:p:${ds.pins.vcc}`));
      const hasGnd = wires.some(w => (w.from === `${eid}:p:${ds.pins.gnd}` || w.to === `${eid}:p:${ds.pins.gnd}`));
      
      if (pinNum === ds.pins.vcc) return 5;
      if (pinNum === ds.pins.gnd) return 0;
      
      if (ds.pins.outputs.includes(pinNum)) {
        if (!hasVcc || !hasGnd) return 0;
        const outIdx = ds.pins.outputs.indexOf(pinNum);
        const inPins = ds.pins.inputs[outIdx];
        const inVals = inPins.map(p => getPinValue(`${eid}:p:${p}`, new Set([...visited, pid])));
        const bInVals = inVals.map(v => v >= 2.5);

        let result = false;
        switch(ent.gateType) {
          case GateType.AND: result = bInVals[0] && bInVals[1]; break;
          case GateType.OR: result = bInVals[0] || bInVals[1]; break;
          case GateType.NOT: result = !bInVals[0]; break;
          case GateType.NAND: result = !(bInVals[0] && bInVals[1]); break;
          case GateType.NOR: result = !(bInVals[0] || bInVals[1]); break;
          case GateType.XOR: result = bInVals[0] !== bInVals[1]; break;
          case GateType.BUFFER: result = bInVals[0]; break;
          case GateType.DRIVER_4CH: result = !bInVals[0]; break;
          default: result = false;
        }
        return result ? 5 : 0;
      }
    }

    // 4-CH Driver Panel Logic (ULN2003 Sinking)
    if (eid === 'drv4' && type === 'out') {
      const idx = parseInt(sub);
      const inVal = getPinValue(`drv4:in:${idx}`, new Set([...visited, pid]));
      return Math.max(0, 5 - inVal);
    }

    // Follow wires
    const equivalentPids = pid.endsWith(':a') || pid.endsWith(':b') 
      ? [basePid + ':a', basePid + ':b'] 
      : [pid];
    
    let maxVal = 0;
    for (const p of equivalentPids) {
      for (const w of wires) {
        const other = w.from === p ? w.to : (w.to === p ? w.from : null);
        if (other) {
          maxVal = Math.max(maxVal, getPinValue(other, visited));
        }
      }
    }
    return maxVal;
  }, [entities, wires, clockState, pulseStates, switches, voltageValue, powerOn]);

  const circuitStatus = useMemo(() => {
    const ledStates = Array(8).fill(0).map((_, i) => getPinValue(`led-unit:in:${i}:a`));
    const segStates = [
      { a: getPinValue('seg:0:a') >= 2.5, b: getPinValue('seg:0:b') >= 2.5, c: getPinValue('seg:0:c') >= 2.5, d: getPinValue('seg:0:d') >= 2.5, e: getPinValue('seg:0:e') >= 2.5, f: getPinValue('seg:0:f') >= 2.5, g: getPinValue('seg:0:g') >= 2.5, dp: getPinValue('seg:0:dp') >= 2.5 },
      { a: getPinValue('seg:1:a') >= 2.5, b: getPinValue('seg:1:b') >= 2.5, c: getPinValue('seg:1:c') >= 2.5, d: getPinValue('seg:1:d') >= 2.5, e: getPinValue('seg:1:e') >= 2.5, f: getPinValue('seg:1:f') >= 2.5, g: getPinValue('seg:1:g') >= 2.5, dp: getPinValue('seg:1:dp') >= 2.5 }
    ];
    const buzzerActive = getPinValue('buz:in');
    const probeVal = probeConnectedPin ? getPinValue(probeConnectedPin) : -1;
    return { ledStates, segStates, buzzerActive, probeVal, wireStatus: wires.map(w => getPinValue(w.from) >= 2.5 || getPinValue(w.to) >= 2.5) };
  }, [getPinValue, wires, probeConnectedPin]);

  // Handle Buzzer Sound
  useEffect(() => {
    if (!audioCtxRef.current || !buzzerGainRef.current) return;
    
    if (circuitStatus.buzzerActive > 0.1) {
      if (!buzzerOscRef.current) {
        buzzerOscRef.current = audioCtxRef.current.createOscillator();
        buzzerOscRef.current.type = 'square';
        buzzerOscRef.current.frequency.setValueAtTime(1000, audioCtxRef.current.currentTime);
        buzzerOscRef.current.connect(buzzerGainRef.current);
        buzzerOscRef.current.start();
      }
      // Volume based on voltage
      const volume = (circuitStatus.buzzerActive / 5) * 0.1;
      buzzerGainRef.current.gain.setTargetAtTime(volume, audioCtxRef.current.currentTime, 0.01);
    } else {
      if (buzzerGainRef.current) {
        buzzerGainRef.current.gain.setTargetAtTime(0, audioCtxRef.current.currentTime, 0.01);
      }
      setTimeout(() => {
        if (circuitStatus.buzzerActive <= 0.1 && buzzerOscRef.current) {
          buzzerOscRef.current.stop();
          buzzerOscRef.current = null;
        }
      }, 50);
    }
  }, [circuitStatus.buzzerActive]);

  const handlePinClick = (pinId: string) => {
    if (isProbing) {
      setProbeConnectedPin(pinId);
      setIsProbing(false);
      return;
    }

    if (!activePin) {
      setActivePin(pinId);
    } else {
      if (activePin === pinId) { setActivePin(null); return; }

      const isVcc = (p: string) => p.includes('vcc') || p.includes('p:14');
      const isGnd = (p: string) => p.includes('gnd') || p.includes('p:7');

      if ((isVcc(activePin) && isGnd(pinId)) || (isGnd(activePin) && isVcc(pinId))) {
        setShortCircuitAlert(true);
        playAlertSound('short'); 
        setTimeout(() => setShortCircuitAlert(false), 800);
        setActivePin(null);
        return;
      }

      setWires([...wires, { from: activePin, to: pinId }]);
      setActivePin(null);
    }
  };

  const addIC = (type: GateType) => {
    const id = `ic-${Math.random().toString(36).substr(2, 4)}`;
    setEntities([...entities, {
      id, type: EntityType.GATE, gateType: type,
      position: { x: 100, y: BOARD_HEIGHT / 2 - 120 } 
    }]);
  };

  const startDrag = (e: React.MouseEvent, id: string) => {
    const ent = entities.find(x => x.id === id);
    if (ent && workspaceRef.current && ent.type === EntityType.GATE) {
      const rect = workspaceRef.current.getBoundingClientRect();
      const curX = (e.clientX - rect.left) / scale;
      const curY = (e.clientY - rect.top) / scale;
      setDraggingId(id);
      setDragOffset({ x: curX - ent.position.x, y: curY - ent.position.y });
    }
  };

  const BreadboardUnit = () => (
    <div className="breadboard-unit relative">
      {/* Column Numbers */}
      <div className="flex pl-6 gap-[3px] mb-1">
        {Array(60).fill(0).map((_, i) => (
          <div key={i} className="w-[12px] text-[8px] text-black/60 text-center font-bold">
            {(i + 1) % 5 === 0 || i === 0 ? i + 1 : ''}
          </div>
        ))}
      </div>

      <div className="power-rail pl-6">
        <div className="rail-line-red"></div>
        <div className="rail-holes">{Array(60).fill(0).map((_, i) => <div key={i} className="hole"></div>)}</div>
        <div className="rail-line-blue"></div>
        <div className="rail-holes">{Array(60).fill(0).map((_, i) => <div key={i} className="hole"></div>)}</div>
      </div>

      <div className="flex gap-2">
        {/* Row Letters A-E */}
        <div className="flex flex-col gap-[3px] pt-[2px]">
          {['A', 'B', 'C', 'D', 'E'].map(l => (
            <div key={l} className="h-[12px] w-[12px] text-[8px] text-black/60 flex items-center justify-center font-bold">{l}</div>
          ))}
        </div>
        <div className="hole-grid">{Array(60 * 5).fill(0).map((_, i) => <div key={i} className="hole"></div>)}</div>
      </div>

      <div className="h-6 bg-black/5 rounded-sm mx-6 flex items-center">
        <div className="w-full h-[1px] bg-black/10"></div>
      </div>

      <div className="flex gap-2">
        {/* Row Letters F-J */}
        <div className="flex flex-col gap-[3px] pt-[2px]">
          {['F', 'G', 'H', 'I', 'J'].map(l => (
            <div key={l} className="h-[12px] w-[12px] text-[8px] text-black/60 flex items-center justify-center font-bold">{l}</div>
          ))}
        </div>
        <div className="hole-grid">{Array(60 * 5).fill(0).map((_, i) => <div key={i} className="hole"></div>)}</div>
      </div>

      <div className="power-rail pl-6">
        <div className="rail-line-red"></div>
        <div className="rail-holes">{Array(60).fill(0).map((_, i) => <div key={i} className="hole"></div>)}</div>
        <div className="rail-line-blue"></div>
        <div className="rail-holes">{Array(60).fill(0).map((_, i) => <div key={i} className="hole"></div>)}</div>
      </div>
    </div>
  );

  return (
    <div className={`h-screen w-screen bg-black flex flex-row overflow-hidden transition-colors duration-200 ${shortCircuitAlert ? 'bg-red-950/40' : ''}`}>
      
      {/* IC Info Modal */}
      {selectedGateInfo && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-black">
          <div className="w-full max-w-lg bg-[#0f0f0f] border border-emerald-500/20 rounded-2xl shadow-[0_0_50px_rgba(16,185,129,0.1)] overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-emerald-500/10 flex justify-between items-center bg-gradient-to-r from-emerald-500/5 to-transparent">
              <div>
                <h2 className="text-emerald-400 font-black text-2xl italic tracking-tighter">DATA SHEET: {GATE_DATASHEET[selectedGateInfo].model}</h2>
                <p className="text-emerald-500/60 text-sm font-mono">{GATE_DATASHEET[selectedGateInfo].title}</p>
              </div>
              <button onClick={() => { setSelectedGateInfo(null); }} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-red-600 transition-all text-white">
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div>
                <label className="text-[12px] font-black text-emerald-500/40 uppercase mb-2 block">Description</label>
                <p className="text-white/80 leading-relaxed text-base">{GATE_DATASHEET[selectedGateInfo].description}</p>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="text-[12px] font-black text-emerald-500/40 uppercase mb-2 block">Truth Table</label>
                  <pre className="p-4 rounded-lg border border-white/5 font-mono text-emerald-400 text-sm leading-relaxed">
                    {GATE_DATASHEET[selectedGateInfo].truthTable}
                  </pre>
                </div>
                <div>
                  <label className="text-[12px] font-black text-emerald-500/40 uppercase mb-2 block">Pinout (74 Series)</label>
                  <ul className="space-y-2 text-white/60 text-[13px] font-mono">
                    <li className="flex justify-between"><span className="text-emerald-500">VCC (Pin 14)</span> <span>+5V</span></li>
                    <li className="flex justify-between"><span className="text-emerald-500">GND (Pin 7)</span> <span>Common</span></li>
                    {GATE_DATASHEET[selectedGateInfo].pins.outputs.map((out, idx) => (
                      <li key={idx} className="flex justify-between">
                        <span>Gate {idx + 1} Out:</span>
                        <span className="text-white">Pin {out}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Short Circuit Overlay */}
      {shortCircuitAlert && (
        <div className="fixed inset-0 z-[1000] pointer-events-none flex items-center justify-center bg-red-600/10 animate-pulse">
           <div className="bg-red-600 text-white px-10 py-5 rounded-full font-black text-4xl shadow-[0_0_100px_red] border-4 border-white uppercase italic tracking-tighter">
             Short Circuit Detected!
           </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar-transition h-full bg-[#0a0a0a] border-r border-white/5 flex flex-col z-[100] relative ${isSidebarOpen ? 'w-64' : 'w-0 opacity-0'}`}>
        <div className="p-6 border-b border-white/5">
            <h1 className="text-emerald-500 font-black text-xl italic"> </h1>
            <p className="text-[12px] text-white/20 uppercase tracking-widest font-black">Digital Trainer</p>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="text-[12px] font-black text-white/20 uppercase mb-4 px-2 tracking-widest">Logic Components</div>
            {Object.values(GateType).filter(gt => gt !== GateType.DRIVER_4CH).map(gt => (
                <div key={gt} className="flex gap-2 group">
                  <button onClick={() => addIC(gt)} className="flex-1 flex justify-between items-center p-3 rounded-lg bg-white/5 hover:bg-emerald-600 transition-all group-active:scale-95">
                    <div className="text-left">
                      <div className="text-sm font-black text-white">{GATE_DATASHEET[gt].model}</div>
                      <div className="text-[11px] text-white/30">{gt}</div>
                    </div>
                  </button>
                  <button onClick={() => setSelectedGateInfo(gt)} className="w-12 rounded-lg bg-white/5 flex items-center justify-center text-white/20 hover:text-emerald-400 hover:bg-white/10 transition-all border border-transparent hover:border-emerald-500/30">
                    <i className="fas fa-question-circle text-lg"></i>
                  </button>
                </div>
            ))}
            <div className="pt-8 border-t border-white/5 space-y-2">
              <button onClick={() => { setWires([]); setProbeConnectedPin(null); }} className="w-full p-3 rounded bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white text-[11px] font-bold uppercase tracking-wider transition-all">Reset Wires</button>
              <button onClick={() => { setEntities(entities.filter(e => e.type !== EntityType.GATE)); }} className="w-full p-3 rounded bg-white/5 text-white/40 text-[11px] font-bold uppercase tracking-wider transition-all hover:text-white hover:bg-white/10">Clear ICs</button>
            </div>
        </nav>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex items-center justify-center relative overflow-hidden">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="absolute top-4 left-4 z-[110] w-12 h-12 bg-emerald-600 text-white rounded-lg shadow-xl flex items-center justify-center hover:bg-emerald-500 transition-all">
          <i className={`fas ${isSidebarOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
        </button>

        {/* Floating Tooltip */}
        {hoveredPin && !isProbing && (
          <div className="absolute z-[200] pointer-events-none bg-black border border-white/40 p-2 rounded shadow-2xl" 
               style={{ left: mousePos.x * scale + (isSidebarOpen ? 256 : 0) + 20, top: mousePos.y * scale - 40 }}>
            <div className="flex items-center gap-2">
              <div className={`w-4 h-4 rounded-full ${getPinValue(hoveredPin) >= 0.1 ? 'bg-red-500 animate-pulse shadow-[0_0_10px_red]' : 'bg-blue-900'}`} style={{ opacity: Math.max(0.2, getPinValue(hoveredPin) / 5) }}></div>
              <div className="text-[12px] font-black text-white uppercase tracking-widest">
                {getPinValue(hoveredPin).toFixed(1)}V
              </div>
            </div>
            <div className="text-[10px] text-white/40 mt-1 font-mono">{hoveredPin}</div>
          </div>
        )}

        <div className="flex items-center justify-center w-full h-full">
          <div 
            ref={workspaceRef} 
            onMouseMove={(e) => {
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
            }}
            onMouseUp={() => setDraggingId(null)}
            className="pcb-board"
            style={{ width: `${BOARD_WIDTH}px`, height: `${BOARD_HEIGHT}px`, transform: `scale(${scale})` }}
          >
            {/* Top Row: Power & Supply */}
            <div className="absolute left-[80px] top-[60px] flex gap-6">
              <div className="nx-panel p-4 border-l-4 border-emerald-500 w-[220px] h-[160px] flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="bg-emerald-500 text-black px-6 py-1 font-black text-xs mb-4 rounded-sm tracking-widest uppercase">Main Power</div>
                  <div className="flex gap-4">
                    <button 
                      onClick={() => setPowerOn(true)}
                      className={`w-14 h-14 rounded-full font-black text-xs transition-all border-4 flex items-center justify-center ${powerOn ? 'bg-emerald-500 text-white border-emerald-300 shadow-[0_0_25px_#10b981]' : 'bg-emerald-950/20 text-emerald-500/40 border-emerald-900/40'}`}
                    >
                      ON
                    </button>
                    <button 
                      onClick={() => setPowerOn(false)}
                      className={`w-14 h-14 rounded-full font-black text-xs transition-all border-4 flex items-center justify-center ${!powerOn ? 'bg-red-600 text-white border-red-400 shadow-[0_0_25px_red]' : 'bg-red-950/20 text-red-500/40 border-red-950/40'}`}
                    >
                      OFF
                    </button>
                  </div>
              </div>

              <div className="nx-panel p-4 border-t-4 border-red-600 w-[240px] h-[160px] bg-black/40 backdrop-blur-sm">
                  <div className="silk-label text-red-500 text-center mb-4 uppercase text-[10px] tracking-widest font-black">DC Power Supply</div>
                  <div className="flex justify-around items-center h-[70px]">
                    <div className="flex flex-col items-center gap-1">
                      <div data-pin-id="pwr:vcc" onMouseEnter={() => setHoveredPin("pwr:vcc")} onMouseLeave={() => setHoveredPin(null)} onClick={() => handlePinClick("pwr:vcc")} 
                        className={`w-12 h-12 rounded-full border-4 border-red-600/60 cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.3)] flex items-center justify-center font-black text-red-500 drop-shadow-[0_0_5px_#ef4444] text-[10px] hover:scale-110 transition-all ${activePin === 'pwr:vcc' ? 'ring-4 ring-white' : ''}`}>+5V</div>
                      <span className="text-[8px] text-red-500/60 font-bold uppercase">VCC</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div data-pin-id="pwr:gnd" onMouseEnter={() => setHoveredPin("pwr:gnd")} onMouseLeave={() => setHoveredPin(null)} onClick={() => handlePinClick("pwr:gnd")} 
                        className={`w-12 h-12 rounded-full border-4 border-white/20 cursor-pointer shadow-lg flex items-center justify-center font-black text-white/60 drop-shadow-[0_0_3px_rgba(255,255,255,0.5)] text-[10px] hover:scale-110 transition-all ${activePin === 'pwr:gnd' ? 'ring-4 ring-white' : ''}`}>GND</div>
                      <span className="text-[8px] text-white/30 font-bold uppercase">COM</span>
                    </div>
                  </div>
              </div>
            </div>

            {/* Top Row: Logic Monitor */}
            <div className="absolute left-[752px] top-[60px]">
              <div className="nx-panel p-4 border-t-4 border-red-600 w-[580px] h-[210px] bg-black/40 backdrop-blur-sm overflow-hidden">
                  <div className="silk-label mb-4 text-red-500 text-center uppercase text-[10px] tracking-widest font-black">Logic Monitor (LEDs)</div>
                  <div className="grid grid-cols-8 gap-x-2 px-2 items-center">
                    {Array(8).fill(0).map((_, i) => (
                      <div key={i} className="flex flex-col items-center gap-3 pt-2 px-2 pb-[10.5px] rounded border border-red-500/40 bg-red-950/10">
                        <Bulb isOn={circuitStatus.ledStates[i] >= 0.1} brightness={circuitStatus.ledStates[i] / 5} />
                        <div className="flex flex-col gap-1">
                          <div data-pin-id={`led-unit:in:${i}:a`} onMouseEnter={() => setHoveredPin(`led-unit:in:${i}:a`)} onMouseLeave={() => setHoveredPin(null)} onClick={() => handlePinClick(`led-unit:in:${i}:a`)} 
                            className={`w-9 h-6 rounded bg-black/40 cursor-pointer hover:bg-red-900/40 transition-all flex items-center justify-center text-[9px] font-black text-red-500 drop-shadow-[0_0_3px_#ef4444] relative z-10 ${activePin === `led-unit:in:${i}:a` ? 'ring-2 ring-white' : ''}`}>L{i}</div>
                          <div data-pin-id={`led-unit:in:${i}:b`} onMouseEnter={() => setHoveredPin(`led-unit:in:${i}:b`)} onMouseLeave={() => setHoveredPin(null)} onClick={() => handlePinClick(`led-unit:in:${i}:b`)} 
                            className={`w-9 h-6 rounded bg-black/40 cursor-pointer hover:bg-red-900/40 transition-all flex items-center justify-center text-[9px] font-black text-red-500 drop-shadow-[0_0_3px_#ef4444] relative z-10 ${activePin === `led-unit:in:${i}:b` ? 'ring-2 ring-white' : ''}`}>L{i}</div>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
            </div>

            {/* Top Row: Hex Display */}
            <div className="absolute right-[80px] top-[60px]">
              <div className="nx-panel p-4 border-r-4 border-emerald-500 w-[320px] h-[220px] bg-black/40 backdrop-blur-sm">
                  <div className="silk-label mb-2 text-emerald-400 text-center uppercase text-[10px] tracking-widest font-black">Hexadecimal Display</div>
                  <div className="flex gap-4 justify-center mb-2 scale-75">
                    <SevenSegment segments={circuitStatus.segStates[0]} />
                    <SevenSegment segments={circuitStatus.segStates[1]} />
                  </div>
                  <div className="flex gap-2 w-full justify-center scale-75 origin-top">
                     {[0, 1].map(idx => (
                       <div key={idx} className="grid grid-cols-4 gap-1">
                         {['a','b','c','d','e','f','g','dp'].map(s => (
                           <div key={s} data-pin-id={`seg:${idx}:${s}`} onMouseEnter={() => setHoveredPin(`seg:${idx}:${s}`)} onMouseLeave={() => setHoveredPin(null)} onClick={() => handlePinClick(`seg:${idx}:${s}`)} 
                             className={`w-6 h-6 rounded border border-emerald-500/40 text-[8px] font-black text-emerald-400 drop-shadow-[0_0_3px_#10b981] flex items-center justify-center cursor-pointer hover:bg-emerald-900/40 transition-all relative z-10 ${activePin === `seg:${idx}:${s}` ? 'ring-1 ring-white' : ''}`}>{s.toUpperCase()}</div>
                         ))}
                       </div>
                     ))}
                  </div>
              </div>
            </div>

            {/* Middle Left: 4-Channel Driver */}
            <div className="absolute left-[80px] top-[260px] w-[220px]">
               <div className="nx-panel p-4 border-l-4 border-purple-500 h-[240px] bg-black/40 backdrop-blur-sm">
                  <div className="silk-label mb-4 text-purple-400 text-center text-[9px] uppercase tracking-widest font-black">4-CH Driver (ULN2003)</div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="flex flex-col gap-2">
                        <span className="text-[8px] text-white/30 text-center uppercase font-bold">Input</span>
                        {[0,1,2,3].map(i => (
                           <div key={i} data-pin-id={`drv4:in:${i}`} onMouseEnter={() => setHoveredPin(`drv4:in:${i}`)} onMouseLeave={() => setHoveredPin(null)} onClick={() => handlePinClick(`drv4:in:${i}`)} 
                             className={`w-full h-7 rounded border border-purple-500/40 cursor-pointer hover:bg-purple-900/40 transition-all flex items-center justify-center text-[9px] font-black text-purple-400 drop-shadow-[0_0_3px_#a855f7] relative z-10 ${activePin === `drv4:in:${i}` ? 'ring-2 ring-white' : ''}`}>IN{i+1}</div>
                        ))}
                     </div>
                     <div className="flex flex-col gap-2">
                        <span className="text-[8px] text-white/30 text-center uppercase font-bold">Output</span>
                        {[0,1,2,3].map(i => (
                           <div key={i} data-pin-id={`drv4:out:${i}`} onMouseEnter={() => setHoveredPin(`drv4:out:${i}`)} onMouseLeave={() => setHoveredPin(null)} onClick={() => handlePinClick(`drv4:out:${i}`)} 
                             className={`w-full h-7 rounded border border-purple-500/40 cursor-pointer hover:bg-purple-900/40 transition-all flex items-center justify-center text-[9px] font-black text-purple-400 drop-shadow-[0_0_3px_#a855f7] relative z-10 ${activePin === `drv4:out:${i}` ? 'ring-2 ring-white' : ''}`}>OUT{i+1}</div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            {/* Middle Center: Breadboard */}
            <div className="absolute top-[320px] left-1/2 -translate-x-1/2 scale-110">
                <BreadboardUnit />
            </div>

            {/* Middle Right: Logic Probe */}
            <div className="absolute right-[80px] top-[300px]">
              <div className="nx-panel p-4 border-r-4 border-emerald-500 w-[200px] h-[220px] flex flex-col items-center bg-black/40 backdrop-blur-sm">
                  <div className="silk-label mb-4 text-emerald-400 uppercase text-[10px] tracking-widest font-black">Logic Probe</div>
                  <div className="flex gap-4 mb-4 bg-black/60 p-2 rounded-lg border border-white/5">
                    <div className="flex flex-col items-center gap-1">
                       <div className={`w-5 h-5 rounded-full transition-all duration-75 ${circuitStatus.probeVal >= 2.5 ? 'bg-red-500 shadow-[0_0_15px_red]' : 'bg-red-950/20'}`}></div>
                        <span className={`text-[8px] font-black ${circuitStatus.probeVal >= 2.5 ? 'text-red-500' : 'text-red-500/40'}`}>HI</span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                       <div className={`w-5 h-5 rounded-full transition-all duration-75 ${circuitStatus.probeVal >= 0 && circuitStatus.probeVal < 2.5 ? 'bg-green-500 shadow-[0_0_15px_#10b981]' : 'bg-green-950/20'}`}></div>
                        <span className={`text-[8px] font-black ${circuitStatus.probeVal >= 0 && circuitStatus.probeVal < 2.5 ? 'text-green-500' : 'text-green-500/40'}`}>LO</span>
                    </div>
                  </div>
                  <div 
                    data-pin-id="probe:in" 
                    onClick={() => { setIsProbing(true); setProbeConnectedPin(null); }}
                    className={`w-14 h-10 rounded border-2 border-emerald-500/60 cursor-pointer hover:bg-emerald-600 transition-all flex items-center justify-center group ${isProbing ? 'ring-2 ring-white scale-110' : ''}`}
                  >
                    <i className="fas fa-search text-emerald-400 drop-shadow-[0_0_5px_#10b981] group-hover:text-white transition-colors text-lg"></i>
                  </div>
                  <div className="mt-4 text-[8px] text-white/20 italic tracking-widest uppercase font-bold">Probe Input</div>
              </div>
            </div>

            {/* Bottom Right: Debounce Switch */}
            <div className="absolute right-[80px] top-[760px]">
              <div className="nx-panel p-4 border-r-4 border-blue-500 w-[200px] h-[180px] bg-black/40 backdrop-blur-sm">
                  <div className="silk-label mb-4 text-blue-400 text-center uppercase text-[10px] tracking-widest font-black">Debounce Switch</div>
                  <div className="flex justify-around items-center h-[80px]">
                    {[1, 2].map(num => (
                      <div key={num} className="flex flex-col items-center gap-2">
                         <button onMouseDown={() => setPulseStates(p => ({...p, [`p${num}`]: true}))} onMouseUp={() => setPulseStates(p => ({...p, [`p${num}`]: false}))}
                            className="w-10 h-10 bg-blue-600 rounded-full border-4 border-black shadow-lg active:scale-90 active:shadow-inner transition-all flex items-center justify-center text-[7px] font-black text-white uppercase">Push</button>
                         <div data-pin-id={`pls:pls:${num}`} onMouseEnter={() => setHoveredPin(`pls:pls:${num}`)} onMouseLeave={() => setHoveredPin(null)} onClick={() => handlePinClick(`pls:pls:${num}`)} 
                           className={`w-9 h-6 rounded border border-blue-500/40 cursor-pointer hover:bg-blue-900/40 transition-all flex items-center justify-center text-[9px] font-black text-blue-400 drop-shadow-[0_0_3px_#3b82f6] relative z-10 ${activePin === `pls:pls:${num}` ? 'ring-2 ring-white' : ''}`}>P{num}</div>
                      </div>
                    ))}
                  </div>
              </div>
            </div>

            {/* Bottom Left: Voltage Adjuster & Buzzer */}
            <div className="absolute left-[80px] top-[540px] flex flex-col gap-6">
               <div className="nx-panel p-4 border-l-4 border-cyan-500 w-[240px] h-[160px] bg-black/40 backdrop-blur-sm">
                  <div className="silk-label mb-2 text-cyan-400 text-center uppercase text-[10px] tracking-widest font-black">Voltage Adjuster</div>
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-lg font-black text-cyan-400 font-mono tracking-tighter">{voltageValue.toFixed(1)}V</div>
                    <input 
                      type="range" 
                      min="0" 
                      max="5" 
                      step="0.1" 
                      value={voltageValue} 
                      onChange={(e) => setVoltageValue(parseFloat(e.target.value))} 
                      className="w-full h-1 bg-cyan-900 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                    <div className="flex items-center gap-4 mt-2">
                       <div className={`w-4 h-4 rounded-full ${voltageValue >= 0.1 ? 'bg-cyan-400 shadow-[0_0_12px_cyan]' : 'bg-cyan-950/40'}`} style={{ opacity: Math.max(0.2, voltageValue / 5) }}></div>
                       <div 
                         data-pin-id="vadj:vadj:out" 
                         onMouseEnter={() => setHoveredPin("vadj:vadj:out")} 
                         onMouseLeave={() => setHoveredPin(null)} 
                         onClick={() => handlePinClick("vadj:vadj:out")} 
                         className={`w-14 h-7 rounded border border-cyan-500/40 flex items-center justify-center font-black text-cyan-400 text-[9px] drop-shadow-[0_0_4px_#22d3ee] cursor-pointer hover:bg-cyan-900/40 transition-all relative z-10 ${activePin === 'vadj:vadj:out' ? 'ring-2 ring-white' : ''}`}
                       >
                         OUT
                       </div>
                    </div>
                  </div>
               </div>

               <div className="nx-panel p-4 border-l-4 border-amber-500 h-[180px] bg-black/40 backdrop-blur-sm">
                   <div className="silk-label mb-2 text-amber-500 text-center uppercase text-[10px] tracking-widest font-black">Pulse Generator</div>
                   <div className="flex flex-col items-center gap-3">
                      <div className="flex items-center gap-6">
                        <div className={`w-8 h-8 rounded-full transition-all ${clockState ? 'bg-amber-400 shadow-[0_0_15px_#fbbf24]' : 'bg-amber-950/40'}`}></div>
                        <div data-pin-id="clk:clk" onMouseEnter={() => setHoveredPin("clk:clk")} onMouseLeave={() => setHoveredPin(null)} onClick={() => handlePinClick("clk:clk")} 
                          className={`w-14 h-9 rounded border-2 border-amber-500/40 flex items-center justify-center font-black text-amber-500 drop-shadow-[0_0_5px_#f59e0b] text-[10px] shadow-lg cursor-pointer hover:bg-amber-500/20 transition-all ${activePin === 'clk:clk' ? 'ring-2 ring-white' : ''}`}>CLK</div>
                      </div>
                      <div className="w-full space-y-1">
                        <div className="flex justify-between text-[8px] font-black text-white/30 px-1 uppercase"><span>1Hz</span><span className="text-amber-500">{clockFreq}Hz</span><span>20Hz</span></div>
                        <input type="range" min="1" max="20" value={clockFreq} onChange={(e) => setClockFreq(parseInt(e.target.value))} className="w-full h-1 bg-amber-900 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                      </div>
                   </div>
               </div>
            </div>

            {/* Bottom Right: Buzzer */}
            <div className="absolute right-[80px] top-[540px] w-[240px]">
               <div className="nx-panel p-4 border-r-4 border-amber-500 w-[240px] h-[160px] flex flex-col items-center bg-black/40 backdrop-blur-sm">
                  <div className="silk-label mb-3 text-amber-500 uppercase text-[10px] tracking-widest font-black text-center">Buzzer</div>
                  <div className={`w-12 h-12 bg-neutral-900 rounded-full border-4 border-black shadow-inner flex items-center justify-center relative ${circuitStatus.buzzerActive > 0.5 ? 'animate-pulse' : ''}`}>
                    <div className="w-7 h-7 bg-neutral-800 rounded-full flex items-center justify-center">
                      <i className={`fas fa-volume-up transition-colors text-xs ${circuitStatus.buzzerActive > 0.5 ? 'text-amber-500 shadow-[0_0_15px_amber]' : 'text-white/10'}`} style={{ opacity: Math.max(0.1, circuitStatus.buzzerActive / 5) }}></i>
                    </div>
                  </div>
                  <div data-pin-id="buz:in" onMouseEnter={() => setHoveredPin("buz:in")} onMouseLeave={() => setHoveredPin(null)} onClick={() => handlePinClick("buz:in")} 
                    className={`w-10 h-7 rounded border border-amber-500/40 mt-3 cursor-pointer hover:bg-amber-900/40 transition-all flex items-center justify-center text-[9px] font-black text-amber-500 drop-shadow-[0_0_3px_#f59e0b] relative z-10 ${activePin === 'buz:in' ? 'ring-2 ring-white' : ''}`}>IN</div>
               </div>
            </div>

            {/* Bottom Row: Digital Input Switches */}
            <div className="absolute left-1/2 -translate-x-1/2 top-[760px] w-[900px]">
               <div className="nx-panel p-4 border-b-4 border-blue-500 h-[250px] bg-black/40 backdrop-blur-sm overflow-hidden">
                  <div className="silk-label mb-4 text-blue-400 text-center uppercase text-[10px] tracking-widest font-black">Digital Input Switches</div>
                  <div className="grid grid-cols-8 gap-x-2 px-4">
                    {switches.map((val, i) => (
                      <div key={i} className="flex flex-col items-center gap-3 pt-2 px-2 pb-[10.5px] rounded border border-blue-500/40 bg-blue-950/10">
                         <SwitchInput index={i} isOn={val} onToggle={() => { setSwitches(sw => sw.map((s, idx) => idx === i ? !s : s)); }} />
                         <div className="flex flex-col gap-1">
                           <div data-pin-id={`sw-unit:sw:${i}:a`} onMouseEnter={() => setHoveredPin(`sw-unit:sw:${i}:a`)} onMouseLeave={() => setHoveredPin(null)} onClick={() => handlePinClick(`sw-unit:sw:${i}:a`)} 
                             className={`w-10 h-7 rounded bg-black/40 cursor-pointer hover:bg-blue-900/40 transition-all flex items-center justify-center text-[9px] font-black text-blue-400 drop-shadow-[0_0_3px_#3b82f6] relative z-10 ${activePin === `sw-unit:sw:${i}:a` ? 'ring-2 ring-white' : ''}`}>SW{i}</div>
                           <div data-pin-id={`sw-unit:sw:${i}:b`} onMouseEnter={() => setHoveredPin(`sw-unit:sw:${i}:b`)} onMouseLeave={() => setHoveredPin(null)} onClick={() => handlePinClick(`sw-unit:sw:${i}:b`)} 
                             className={`w-10 h-7 rounded bg-black/40 cursor-pointer hover:bg-blue-900/40 transition-all flex items-center justify-center text-[9px] font-black text-blue-400 drop-shadow-[0_0_3px_#3b82f6] relative z-10 ${activePin === `sw-unit:sw:${i}:b` ? 'ring-2 ring-white' : ''}`}>SW{i}</div>
                         </div>
                      </div>
                    ))}
                  </div>
               </div>
            </div>

            {/* ICs Overlay */}
            {entities.filter(e => e.type === EntityType.GATE).map(ent => (
                <div key={ent.id} className="absolute z-40" style={{ left: ent.position.x, top: ent.position.y }}>
                    <div className="ic-realistic w-[120px] h-[240px] p-6 flex flex-col items-center justify-center cursor-move group" onMouseDown={(e) => startDrag(e, ent.id)}>
                        <div className="absolute left-[-30px] top-8 bottom-8 flex flex-col justify-between">
                            {[1,2,3,4,5,6,7].map(p => (
                                <div key={p} data-pin-id={`${ent.id}:p:${p}`} onMouseEnter={() => setHoveredPin(`${ent.id}:p:${p}`)} onMouseLeave={() => setHoveredPin(null)} onClick={(e) => { e.stopPropagation(); handlePinClick(`${ent.id}:p:${p}`); }} className={`w-12 h-10 ic-pin rounded-l flex items-center justify-center text-[12px] text-white font-black transition-all ${activePin === `${ent.id}:p:${p}` ? 'bg-white/20 scale-125 ring-1 ring-white' : ''}`}>{p}</div>
                            ))}
                        </div>
                        <div className="absolute right-[-30px] top-8 bottom-8 flex flex-col justify-between">
                            {[14,13,12,11,10,9,8].map(p => (
                                <div key={p} data-pin-id={`${ent.id}:p:${p}`} onMouseEnter={() => setHoveredPin(`${ent.id}:p:${p}`)} onMouseLeave={() => setHoveredPin(null)} onClick={(e) => { e.stopPropagation(); handlePinClick(`${ent.id}:p:${p}`); }} className={`w-12 h-10 ic-pin rounded-r flex items-center justify-center text-[12px] text-white font-black transition-all ${activePin === `${ent.id}:p:${p}` ? 'bg-white/20 scale-125 ring-1 ring-white' : ''}`}>{p}</div>
                            ))}
                        </div>
                        <div className="rotate-90 text-black font-black tracking-widest text-2xl">{GATE_DATASHEET[ent.gateType!].model}</div>
                        <button onClick={(e) => { e.stopPropagation(); setEntities(entities.filter(x => x.id !== ent.id)); setWires(wires.filter(w => !w.from.includes(ent.id) && !w.to.includes(ent.id))); }} className="absolute -bottom-12 opacity-0 group-hover:opacity-100 bg-red-600 text-white text-[12px] px-5 py-2.5 rounded-full font-bold shadow-lg transition-all hover:bg-red-500">DELETE</button>
                    </div>
                </div>
            ))}

            {/* Wires Layer */}
            <svg className="absolute inset-0 pointer-events-none z-50 w-full h-full">
                {/* Regular Wires */}
                {wires.map((wire, idx) => {
                    const start = pinPositions[wire.from];
                    const end = pinPositions[wire.to];
                    if (!start || !end) return null;
                    const isHigh = circuitStatus.wireStatus[idx];
                    let strokeColor = isHigh ? '#fbbf24' : '#64748b';
                    if (wire.from.includes('vcc') || wire.to.includes('vcc')) strokeColor = '#ef4444';
                    if (wire.from.includes('gnd') || wire.to.includes('gnd')) strokeColor = '#0f172a';
                    return (
                        <path key={idx} d={`M ${start.x} ${start.y} C ${start.x} ${start.y + 120}, ${end.x} ${end.y - 120}, ${end.x} ${end.y}`} 
                            fill="none" stroke={strokeColor} strokeWidth="6" strokeLinecap="round" className={`pointer-events-auto cursor-pointer opacity-80 ${isHigh ? 'wire-active shadow-[0_0_10px_rgba(251,191,36,0.5)]' : ''}`} onClick={() => { setWires(wires.filter((_, i) => i !== idx)); }} />
                    );
                })}
                
                {/* Logic Probe Wire (Single) */}
                {probeConnectedPin && pinPositions["probe:in"] && pinPositions[probeConnectedPin] && (
                    <path 
                       d={`M ${pinPositions["probe:in"].x} ${pinPositions["probe:in"].y} C ${pinPositions["probe:in"].x} ${pinPositions["probe:in"].y + 100}, ${pinPositions[probeConnectedPin].x} ${pinPositions[probeConnectedPin].y - 100}, ${pinPositions[probeConnectedPin].x} ${pinPositions[probeConnectedPin].y}`}
                       fill="none" stroke="#10b981" strokeWidth="4" strokeDasharray="5,3" className="opacity-80 cursor-pointer pointer-events-auto" 
                       onClick={() => setProbeConnectedPin(null)}
                    />
                )}

                {/* Interactive Drag Line */}
                {(activePin || isProbing) && pinPositions[activePin || "probe:in"] && (
                    <line 
                        x1={pinPositions[activePin || "probe:in"].x} 
                        y1={pinPositions[activePin || "probe:in"].y} 
                        x2={mousePos.x} 
                        y2={mousePos.y} 
                        stroke={isProbing ? "#10b981" : "rgba(255,255,255,0.4)"} 
                        strokeWidth="4" 
                        strokeDasharray="10,5" 
                    />
                )}
            </svg>
          </div>
        </div>
      </main>
    </div>
  );
}
