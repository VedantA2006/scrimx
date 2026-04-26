import React from 'react';

const SlotGrid = ({ slots, myTeamId, maxSlots }) => {
   // Fill empty slots up to maxSlots
   const displaySlots = [];
   for (let i = 1; i <= maxSlots; i++) {
      const slot = slots.find(s => s.slotNumber === i);
      displaySlots.push(slot || { slotNumber: i, status: 'empty' });
   }

   return (
      <div className="bg-dark-900/80 backdrop-blur-xl border border-surface-border rounded-3xl p-6 shadow-2xl mb-6">
         <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4">Starting Grid</h2>
         <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {displaySlots.map(slot => {
               const isMyTeam = slot.occupyingTeam?._id === myTeamId;
               
               if (slot.status === 'filled') {
                  return (
                     <div 
                        key={`slot-${slot.slotNumber}`}
                        className={`relative p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all min-h-[80px] ${
                           isMyTeam 
                              ? 'bg-primary-500/10 border-primary-500 shadow-[0_0_15px_rgba(var(--primary-500),0.2)]' 
                              : slot.isPromoted 
                                 ? 'bg-green-500/5 border-green-500/30'
                                 : 'bg-dark-800 border-dark-700'
                        }`}
                     >
                        <span className={`absolute top-2 left-2 text-[10px] font-bold ${isMyTeam ? 'text-primary-400' : 'text-dark-500'}`}>
                           #{slot.slotNumber}
                        </span>
                        
                        {isMyTeam && (
                           <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(var(--primary-500),1)]" />
                        )}

                        <span className={`text-xs font-bold uppercase tracking-wider mt-2 line-clamp-1 ${isMyTeam ? 'text-primary-400' : 'text-dark-300'}`}>
                           {slot.occupyingTeam?.tag || slot.occupyingTeam?.name}
                        </span>
                        {slot.isPromoted && (
                           <span className="text-[9px] text-green-400 uppercase tracking-widest mt-1">Promoted</span>
                        )}
                     </div>
                  );
               } else {
                  return (
                     <div 
                        key={`slot-${slot.slotNumber}`}
                        className="p-3 rounded-xl border border-dashed border-dark-700 bg-dark-900/50 flex flex-col items-center justify-center min-h-[80px]"
                     >
                        <span className="text-[10px] font-bold text-dark-600">#{slot.slotNumber}</span>
                        <span className="text-[10px] text-dark-500 uppercase tracking-wider mt-1">Empty</span>
                     </div>
                  );
               }
            })}
         </div>
      </div>
   );
};

export default SlotGrid;
