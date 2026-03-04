
import React from 'react';

interface SevenSegmentProps {
  segments: {
    a: boolean; b: boolean; c: boolean; d: boolean;
    e: boolean; f: boolean; g: boolean; dp: boolean;
  };
}

const SevenSegment: React.FC<SevenSegmentProps> = ({ segments }) => {
  const activeColor = "bg-red-600 shadow-[0_0_8px_rgba(255,0,0,0.6)]";
  const inactiveColor = "bg-red-950/30";

  return (
    <div className="bg-[#1a0505] p-2 rounded-sm border border-black shadow-inner flex flex-col items-center">
      <div className="relative w-10 h-16">
        {/* Segment a */}
        <div className={`absolute top-0 left-1.5 right-1.5 h-1.5 rounded-sm transition-all ${segments.a ? activeColor : inactiveColor}`}></div>
        {/* Segment f */}
        <div className={`absolute top-1.5 left-0 w-1.5 h-6 rounded-sm transition-all ${segments.f ? activeColor : inactiveColor}`}></div>
        {/* Segment b */}
        <div className={`absolute top-1.5 right-0 w-1.5 h-6 rounded-sm transition-all ${segments.b ? activeColor : inactiveColor}`}></div>
        {/* Segment g */}
        <div className={`absolute top-7.5 left-1.5 right-1.5 h-1.5 rounded-sm transition-all ${segments.g ? activeColor : inactiveColor}`}></div>
        {/* Segment e */}
        <div className={`absolute bottom-1.5 left-0 w-1.5 h-6 rounded-sm transition-all ${segments.e ? activeColor : inactiveColor}`}></div>
        {/* Segment d */}
        <div className={`absolute bottom-0 left-1.5 right-1.5 h-1.5 rounded-sm transition-all ${segments.d ? activeColor : inactiveColor}`}></div>
        {/* Segment c */}
        <div className={`absolute bottom-1.5 right-0 w-1.5 h-6 rounded-sm transition-all ${segments.c ? activeColor : inactiveColor}`}></div>
        {/* Dot */}
        <div className={`absolute bottom-0 -right-2 w-1.5 h-1.5 rounded-full transition-all ${segments.dp ? activeColor : inactiveColor}`}></div>
      </div>
    </div>
  );
};

export default SevenSegment;
