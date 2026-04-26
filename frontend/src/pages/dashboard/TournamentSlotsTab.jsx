import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { HiOutlineLightningBolt, HiOutlineRefresh } from 'react-icons/hi';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const TournamentSlotsTab = () => {
  const { id } = useParams();
  const [data, setData] = useState({ stages: [], groups: [], slots: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSlots();
  }, [id]);

  const fetchSlots = async () => {
    try {
      const res = await api.get(`/tournaments/${id}/slots`);
      if (res.success) setData(res.data);
    } catch (err) {
      toast.error('Failed to load slots');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoSeed = async () => {
    try {
      const res = await api.post(`/tournaments/${id}/slots/auto-seed`);
      if (res.success) {
        toast.success(res.message);
        fetchSlots();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed auto-seeding');
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><div className="w-8 h-8 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="animate-fade-in space-y-6">
       <div className="flex justify-between items-center mb-6 border-b border-surface-border pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Lobby & Slot Configuration</h2>
            <p className="text-sm text-dark-400">Map approved teams natively into backend structural physics arrays.</p>
          </div>
          <div className="flex gap-3">
             <button onClick={fetchSlots} className="btn-ghost flex items-center gap-2 text-sm"><HiOutlineRefresh /> Sync State</button>
             <button onClick={handleAutoSeed} className="bg-neon-cyan text-dark-950 font-bold px-6 py-2 flex items-center gap-2 rounded-xl text-sm shadow-[0_0_15px_rgba(34,211,238,0.4)] hover:scale-105 transition-all">
                <HiOutlineLightningBolt /> Auto-Seed Approved
             </button>
          </div>
       </div>

       {data.groups.length === 0 ? (
          <div className="p-10 text-center bg-dark-900 border border-surface-border rounded-xl">
             <p className="text-dark-300">Phase 3 Math Calculation Extrapolator has not been initialized. No Groups exist yet.</p>
          </div>
       ) : (
          <div className="space-y-8">
             {data.groups.map(group => {
                const groupSlots = data.slots.filter(s => s.groupId === group._id);
                return (
                   <div key={group._id} className="bg-dark-900 border border-surface-border rounded-xl p-6">
                      <div className="flex justify-between items-center mb-4 border-b border-dark-800 pb-2">
                         <h3 className="text-lg font-bold text-white">{group.groupName}</h3>
                         <span className="text-xs text-dark-400">{groupSlots.filter(s => s.occupyingTeam).length} / {groupSlots.length} Slotted</span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                         {groupSlots.map((slot, idx) => (
                            <div key={slot._id} className={`p-3 rounded-lg border flex items-center gap-3 text-sm transition-colors ${
                               slot.occupyingTeam 
                               ? 'bg-dark-950 border-neon-cyan/30 text-white shadow-[inset_0_0_10px_rgba(34,211,238,0.05)]' 
                               : 'bg-dark-950 border-surface-border text-dark-500 hover:border-dark-600'
                            }`}>
                               <span className="font-mono text-[10px] w-6 opacity-50">#{idx + 1}</span>
                               <span className="font-semibold truncate">
                                  {slot.occupyingTeam ? slot.occupyingTeam.name : 'Empty Slot'}
                               </span>
                            </div>
                         ))}
                      </div>
                   </div>
                )
             })}
          </div>
       )}
    </div>
  );
};

export default TournamentSlotsTab;
