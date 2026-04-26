import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { HiOutlineUserGroup, HiOutlineLockClosed, HiOutlineStar, HiOutlineClipboardList, HiOutlineViewGrid } from 'react-icons/hi';
import '@xyflow/react/dist/style.css';

const TimelineNodeWrapper = ({ data }) => {
  const getIcon = () => {
    switch(data.type) {
      case 'registration': return <HiOutlineLockClosed className="text-primary-400" />;
      case 'qualifier': return <HiOutlineUserGroup className="text-neon-cyan" />;
      case 'semi': return <HiOutlineViewGrid className="text-purple-400" />;
      case 'final': return <HiOutlineStar className="text-white" />;
      case 'wildcard': return <HiOutlineStar className="text-pink-400" />;
      default: return <HiOutlineClipboardList className="text-dark-400" />;
    }
  };

  const isMainNode = data.type === 'final' || data.type === 'semi';
  const isPaid = data.stageCategory === 'paid';
  
  const getAccentColor = () => {
    if (isPaid) return 'border-orange-500 bg-orange-500/10 text-orange-400';
    if (data.type === 'final') return 'border-white bg-white/10 text-white';
    if (data.type === 'wildcard') return 'border-pink-500 bg-pink-500/10 text-pink-400';
    return 'border-primary-500 bg-primary-500/10 text-primary-400';
  };
  
  const accent = getAccentColor();

  return (
    <div className={`w-[280px] bg-dark-900/80 backdrop-blur-md border ${accent.split(' ')[0]} rounded-2xl shadow-2xl p-1 relative overflow-hidden`}>
      {/* Target Handle */}
      {data.type !== 'registration' && (
        <Handle 
          type="target" 
          position={Position.Top} 
          className="w-1 h-1 opacity-0" 
        />
      )}

      {/* Internal Block */}
      <div className="bg-dark-950 rounded-xl flex flex-col items-center py-5 px-4 relative z-10">
         
         <div className={`p-3 rounded-full mb-3 ${accent.split(' ')[1]}`}>
             {getIcon()}
         </div>

         <div className="text-center w-full">
            <h2 className="font-display font-black text-white text-xl uppercase tracking-wider truncate mb-1">
               {data.name || 'Untitled Stage'}
            </h2>
            <div className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-4 ${accent.split(' ')[2]}`}>
               {data.type.replace('_', ' ')} {isPaid && ' • PAID'}
            </div>
         </div>

         <div className="w-full bg-dark-900 border border-surface-border rounded-lg p-3 flex flex-col items-center">
            <span className="text-xs font-semibold text-dark-400 uppercase tracking-widest mb-1">Capacity</span>
            <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-white leading-none">
                   {(data.groups || 1) * (data.teamsPerGroup || 25)}
                </span>
                <span className="text-xs font-bold text-dark-400">TEAMS</span>
            </div>
         </div>
      </div>

      {/* Source Handle */}
      {data.type !== 'final' && (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="w-1 h-1 opacity-0" 
        />
      )}
    </div>
  );
};

export default TimelineNodeWrapper;
