import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { HiOutlineTrendingUp, HiOutlineLockClosed } from 'react-icons/hi';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const TournamentStagesTab = () => {
  const { id } = useParams();
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStages();
  }, [id]);

  const fetchStages = async () => {
    try {
      const res = await api.get(`/tournaments/${id}/stages`);
      if (res.success) setStages(res.data);
    } catch (err) {
      toast.error('Failed to load stages');
    } finally {
      setLoading(false);
    }
  };

  const advanceStage = async (stageId) => {
    if (!window.confirm("WARNING: This irreversibly locks the current stage results and migrates qualified teams. Proceed?")) return;
    try {
      const res = await api.post(`/tournaments/${id}/stages/advance`, { currentStageId: stageId });
      if (res.success) {
        toast.success(res.message);
        fetchStages();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to lock stage logic.');
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><div className="w-8 h-8 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="animate-fade-in space-y-6">
       <div className="flex justify-between items-center mb-6 border-b border-surface-border pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Qualification pipelines</h2>
            <p className="text-sm text-dark-400">Lock completed phases and mathematically escalate teams to the next architectural tier.</p>
          </div>
       </div>

       {stages.length === 0 ? (
          <div className="p-10 text-center bg-dark-900 border border-surface-border rounded-xl">
             <p className="text-dark-300">No Stage Logic arrays generated. Please execute Auto-Seeding from the Slots tab first.</p>
          </div>
       ) : (
          <div className="relative">
             {/* Visual pipeline connector line */}
             <div className="absolute left-[23px] top-0 bottom-0 w-0.5 bg-dark-800 z-0"></div>

             <div className="space-y-8 relative z-10">
                {stages.map((stage, idx) => (
                   <div key={stage._id} className={`bg-dark-900 border ${stage.isCompleted ? 'border-dark-700' : 'border-neon-cyan/50 shadow-[0_0_15px_rgba(34,211,238,0.1)]'} rounded-xl p-5 flex gap-4 ml-8 relative`}>
                      <div className={`absolute -left-11 w-6 h-6 rounded-full flex items-center justify-center border-4 border-dark-950 ${stage.isCompleted ? 'bg-dark-600' : 'bg-neon-cyan'}`}>
                         <div className="w-2 h-2 bg-dark-950 rounded-full"></div>
                      </div>

                      <div className="flex-1">
                         <div className="flex justify-between items-start mb-3">
                            <div>
                               <h3 className={`text-xl font-bold ${stage.isCompleted ? 'text-dark-400 line-through decoration-dark-500' : 'text-white'}`}>{stage.name}</h3>
                               <p className="text-xs text-dark-400 font-mono tracking-widest uppercase mt-1">Tier {idx + 1} Physics Runtime</p>
                            </div>
                            <span className={`px-3 py-1 rounded text-xs font-bold uppercase ${stage.isCompleted ? 'bg-dark-800 text-dark-400' : 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'}`}>
                               {stage.isCompleted ? 'Locked / Final' : 'Active State'}
                            </span>
                         </div>
                         
                         <div className="grid grid-cols-3 gap-4 text-sm mt-4">
                            <div className="p-3 bg-dark-950 rounded-lg border border-dark-800 opacity-80">
                               <p className="text-dark-400 text-xs mb-1">Incoming Teams</p>
                               <p className="font-bold text-white">{stage.groupCount * 20}</p>
                            </div>
                            <div className="p-3 bg-dark-950 rounded-lg border border-dark-800 opacity-80">
                               <p className="text-dark-400 text-xs mb-1">Target Elimination</p>
                               <p className="font-bold text-red-400">Bottom 50%</p>
                            </div>
                            <div className="flex items-center justify-end">
                               {!stage.isCompleted ? (
                                  <button onClick={() => advanceStage(stage._id)} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all">
                                    <HiOutlineTrendingUp /> Lock & Advance Pipeline
                                  </button>
                               ) : (
                                  <button disabled className="btn-ghost flex items-center gap-2 text-dark-500 cursor-not-allowed">
                                    <HiOutlineLockClosed /> Sealed Ledger
                                  </button>
                               )}
                            </div>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
       )}
    </div>
  );
};

export default TournamentStagesTab;
