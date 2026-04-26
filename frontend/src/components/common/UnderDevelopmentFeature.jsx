import React from 'react';
import { HiOutlineCode, HiOutlineClock, HiOutlineLockClosed } from 'react-icons/hi';

const UnderDevelopmentFeature = ({ title, description, plannedFeatures }) => {
  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-start">
        <div>
           <div className="flex items-center gap-3 mb-2">
             <h2 className="text-2xl font-bold text-white">{title}</h2>
             <span className="bg-primary-500/20 text-primary-400 border border-primary-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1">
               <HiOutlineClock /> Coming Soon
             </span>
           </div>
           <p className="text-dark-400 text-sm">{description}</p>
        </div>
        <button disabled className="btn-ghost opacity-50 cursor-not-allowed group relative px-6 text-sm">
           <HiOutlineLockClosed className="inline mr-1" /> Module Locked
           <div className="hidden group-hover:block absolute top-full mt-2 w-max bg-dark-800 text-xs text-white p-2 rounded -translate-x-1/2 left-1/2 border border-surface-border">
              Available in upcoming update
           </div>
        </button>
      </div>

      <div className="bg-dark-950/50 border border-surface-border rounded-xl p-8 text-center flex flex-col items-center justify-center min-h-[300px]">
         <div className="w-16 h-16 bg-dark-900 border border-dark-800 rounded-2xl flex items-center justify-center mb-4">
             <HiOutlineCode className="text-4xl text-neon-cyan/50" />
         </div>
         <h3 className="text-xl font-bold text-white mb-2">In Active Development</h3>
         <p className="text-dark-400 text-sm max-w-md mx-auto mb-8">
            Our engineers are polishing the architecture for this Enterprise module to ensure it can handle massive loads and professional e-sports standards without failure.
         </p>

         <div className="w-full max-w-lg bg-dark-900 rounded-xl border border-surface-border p-5 text-left">
            <p className="text-xs text-primary-400 font-bold uppercase tracking-wider mb-4 border-b border-surface-border pb-2">Planned Architecture Deliverables</p>
            <ul className="space-y-3">
               {plannedFeatures.map((f, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-sm text-dark-300">
                     <span className="text-neon-cyan mt-0.5">▪</span>
                     <span>{f}</span>
                  </li>
               ))}
            </ul>
         </div>
      </div>
    </div>
  );
};

export default UnderDevelopmentFeature;
