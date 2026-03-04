
import React from 'react';

interface SevenSegmentProps {
  segments: {
    a: boolean; b: boolean; c: boolean; d: boolean;
    e: boolean; f: boolean; g: boolean; dp: boolean;
  };
}

const SevenSegment: React.FC<SevenSegmentProps> = ({ segments }) => {
  const activeColor = "bg-red-500 shadow-[0_0_10px_#ef4444]";
  const inactiveColor = "bg-red-950/20";

  return (
    <div className="bg-[#1a1a1a] p-3 rounded-md border border-[#333] shadow-inner flex flex-col items-center">
      <div className="relative w-12 h-20">
        {/* Segment a */}
        <div className={`absolute top-0 left-2 right-2 h-2 rounded-full transition-all ${segments.a ? activeColor : inactiveColor}`}></div>
        {/* Segment f */}
        <div className={`absolute top-2 left-0 w-2 h-7 rounded-full transition-all ${segments.f ? activeColor : inactiveColor}`}></div>
        {/* Segment b */}
        <div className={`absolute top-2 right-0 w-2 h-7 rounded-full transition-all ${segments.b ? activeColor : inactiveColor}`}></div>
        {/* Segment g */}
        <div className={`absolute top-9 left-2 right-2 h-2 rounded-full transition-all ${segments.g ? activeColor : inactiveColor}`}></div>
        {/* Segment e */}
        <div className={`absolute bottom-2 left-0 w-2 h-7 rounded-full transition-all ${segments.e ? activeColor : inactiveColor}`}></div>
        {/* Segment d */}
        <div className={`absolute bottom-0 left-2 right-2 h-2 rounded-full transition-all ${segments.d ? activeColor : inactiveColor}`}></div>
        {/* Segment c */}
        <div className={`absolute bottom-2 right-0 w-2 h-7 rounded-full transition-all ${segments.c ? activeColor : inactiveColor}`}></div>
        {/* Dot */}
        <div className={`absolute bottom-0 -right-3 w-2 h-2 rounded-full transition-all ${segments.dp ? activeColor : inactiveColor}`}></div>
      </div>
    </div>
  );
};

export default SevenSegment;
