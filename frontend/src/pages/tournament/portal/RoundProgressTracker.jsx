import React from 'react';
import { HiOutlineCheck, HiOutlineLockClosed, HiOutlineLightningBolt } from 'react-icons/hi';

const RoundProgressTracker = ({ stages, activeStageId, onStageSelect }) => {
   if (!stages || stages.length === 0) return null;

   return (
      <div className="bg-dark-900/80 backdrop-blur-xl border border-surface-border rounded-3xl p-6 shadow-2xl mb-6">
         <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-6">Tournament Progress</h2>
         
         <div className="flex items-center justify-between relative">
            {/* Connecting line background */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-dark-800 -translate-y-1/2 rounded-full z-0"></div>
            
            {stages.map((stage, idx) => {
               const isActive = stage._id === activeStageId;
               // simple logic for past vs future: if order is less than active stage order (assuming sorted)
               const activeIdx = stages.findIndex(s => s._id === activeStageId);
               const isPast = idx < activeIdx;
               
               let nodeColor = 'bg-dark-800 border-dark-700 text-dark-500';
               if (isActive) nodeColor = 'bg-primary-500/20 border-primary-500 text-primary-400 shadow-[0_0_15px_rgba(var(--primary-500),0.3)]';
               else if (isPast) nodeColor = 'bg-green-500/20 border-green-500 text-green-400';

               return (
                  <div 
                     key={stage._id} 
                     onClick={() => onStageSelect(stage._id)}
                     className="relative z-10 flex flex-col items-center cursor-pointer group"
                  >
                     <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${nodeColor} group-hover:scale-110`}>
                        {isPast ? <HiOutlineCheck /> : (isActive ? <HiOutlineLightningBolt /> : <HiOutlineLockClosed />)}
                     </div>
                     <span className={`absolute -bottom-6 text-[10px] font-bold uppercase tracking-wider whitespace-nowrap ${isActive ? 'text-white' : 'text-dark-500'} transition-colors`}>
                        {stage.name}
                     </span>
                  </div>
               );
            })}
         </div>
      </div>
   );
};

export default RoundProgressTracker;
