import React from 'react';
import { HiOutlineUserGroup, HiOutlineShieldCheck } from 'react-icons/hi';

const GroupSystemView = ({ groups, activeGroupId, onGroupSelect, stage }) => {
   if (!groups || groups.length === 0) return null;

   return (
      <div className="bg-dark-900/80 backdrop-blur-xl border border-surface-border rounded-3xl overflow-hidden shadow-2xl mb-6">
         {/* Qualification Logic Bar */}
         {stage && stage.promotionCount > 0 && (
            <div className="bg-gradient-to-r from-primary-500/10 to-transparent px-6 py-3 border-b border-surface-border flex items-center gap-3">
               <HiOutlineShieldCheck className="text-primary-400 text-lg" />
               <p className="text-sm font-medium text-white">
                  Qualification Logic: <span className="text-primary-400 font-bold">Top {stage.promotionCount} teams from each group advance to the next stage.</span>
               </p>
            </div>
         )}
         
         {/* Group Tabs */}
         <div className="flex overflow-x-auto custom-scrollbar border-b border-surface-border bg-dark-950/50">
            {groups.map(group => {
               const isActive = group._id === activeGroupId;
               return (
                  <button
                     key={group._id}
                     onClick={() => onGroupSelect(group._id)}
                     className={`flex items-center gap-2 px-6 py-4 text-sm font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
                        isActive 
                           ? 'text-neon-cyan border-b-2 border-neon-cyan bg-neon-cyan/5' 
                           : 'text-dark-400 hover:text-dark-200 hover:bg-dark-800'
                     }`}
                  >
                     <HiOutlineUserGroup className={isActive ? 'text-neon-cyan' : 'text-dark-500'} />
                     {group.name}
                  </button>
               );
            })}
         </div>
      </div>
   );
};

export default GroupSystemView;
