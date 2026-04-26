import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { HiOutlineUserGroup, HiOutlineLockClosed, HiOutlineStar, HiOutlineClipboardList, HiOutlineViewGrid } from 'react-icons/hi';
import '@xyflow/react/dist/style.css';

const StageNodeWrapper = ({ data }) => {
  const getIcon = () => {
    switch(data.type) {
      case 'registration': return <HiOutlineLockClosed className="text-primary-400" />;
      case 'qualifier': return <HiOutlineUserGroup className="text-neon-cyan" />;
      case 'semi': return <HiOutlineViewGrid className="text-purple-400" />;
      case 'final': return <HiOutlineStar className="text-orange-400" />;
      default: return <HiOutlineClipboardList className="text-dark-400" />;
    }
  };

  const getBorderColor = () => {
    switch(data.type) {
      case 'registration': return 'border-primary-500/50';
      case 'qualifier': return 'border-neon-cyan/50';
      case 'semi': return 'border-purple-500/50';
      case 'final': return 'border-orange-500/50';
      case 'wildcard': return 'border-pink-500/50';
      default: return 'border-surface-border';
    }
  };

  const getBgColor = () => {
    switch(data.type) {
      case 'registration': return 'bg-primary-500/10';
      case 'qualifier': return 'bg-neon-cyan/10';
      case 'semi': return 'bg-purple-500/10';
      case 'final': return 'bg-orange-500/10';
      case 'wildcard': return 'bg-pink-500/10';
      default: return 'bg-dark-800';
    }
  };

  return (
    <div className={`w-[260px] bg-dark-950 border ${getBorderColor()} rounded-xl shadow-xl overflow-hidden transition-all hover:shadow-neon-cyan/10 hover:border-white/20`}>
      {/* Input Handle */}
      {data.type !== 'registration' && (
        <Handle 
          type="target" 
          position={Position.Top} 
          className="w-3 h-3 bg-neon-cyan border-2 border-dark-950" 
        />
      )}

      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between border-b ${getBorderColor()} ${getBgColor()}`}>
        <div className="flex items-center gap-2">
          {getIcon()}
          <span className="font-display font-bold text-white text-sm truncate max-w-[150px]">
             {data.name || 'Untitled'}
          </span>
        </div>
        {data.stageCategory === 'paid' && (
          <span className="bg-orange-500/20 text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-500/30">
            PAID
          </span>
        )}
        {data.autoPromote && data.stageCategory !== 'paid' && (
          <span className="text-[9px] font-bold uppercase tracking-wider bg-dark-900 border border-surface-border px-1.5 py-0.5 rounded text-dark-400">
            AUTO
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4 space-y-2.5">
         <div className="flex justify-between items-center text-xs">
           <span className="text-dark-500 font-medium">Type</span>
           <span className="text-dark-300 font-bold uppercase tracking-wide">{data.type}</span>
         </div>
         <div className="flex justify-between items-center text-xs">
           <span className="text-dark-500 font-medium">Groups x Teams</span>
           <span className="text-dark-300 font-bold">{data.groups || 1} x {data.teamsPerGroup || 25}</span>
         </div>
         
         {(data.promotionCount > 0 || data.type === 'registration') && (
           <div className="mt-3 pt-3 border-t border-surface-border">
              <div className="flex justify-between items-center text-xs">
                <span className="text-neon-cyan font-bold">Promoting</span>
                <span className="bg-neon-cyan/10 text-neon-cyan px-2 py-0.5 rounded-full font-bold">
                  {data.type === 'registration' ? (data.totalTeams || 'All') : data.promotionCount} Teams
                </span>
              </div>
           </div>
         )}
      </div>

      {/* Output Handle */}
      {data.type !== 'final' && (
        <Handle 
          type="source" 
          position={Position.Bottom} 
          className="w-3 h-3 bg-neon-cyan border-2 border-dark-950" 
        />
      )}
    </div>
  );
};

export default StageNodeWrapper;
