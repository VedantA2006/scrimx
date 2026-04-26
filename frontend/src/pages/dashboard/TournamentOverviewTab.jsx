import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const TournamentOverviewTab = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
  }, [id]);

  const fetchOverview = async () => {
    try {
      const res = await api.get(`/tournaments/${id}/overview`);
      if (res.success) setData(res.data);
    } catch (err) {
      toast.error('Failed to load operational ledger');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><div className="w-8 h-8 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="animate-fade-in space-y-6">
       <h2 className="text-2xl font-bold text-white mb-6">Operations Overview</h2>
       
       <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-dark-800 border border-surface-border">
             <p className="text-sm text-dark-400 mb-1">State & Internal Matrix</p>
             <p className="text-xl font-bold uppercase tracking-widest flex items-center gap-2">
                <span className="text-yellow-500">{data?.status}</span>
                <span className="text-xs text-dark-400 bg-dark-950 px-2 py-1 rounded cursor-copy" title="Copy Identifier" onClick={() => navigator.clipboard.writeText(data?.shortCode)}>{data?.shortCode || 'SYNCHRONIZING'}</span>
             </p>
          </div>
          <div className="p-5 rounded-2xl bg-dark-800 border border-surface-border">
             <p className="text-sm text-dark-400 mb-1">Total Registrations</p>
             <p className="text-xl font-bold text-white">
                {data?.totalRegs} / {data?.maxTeams} <span className="text-xs font-normal text-green-500">[{data?.approvedRegs} Approved]</span>
             </p>
          </div>
          <div className="p-5 rounded-2xl bg-dark-800 border border-surface-border">
             <p className="text-sm text-dark-400 mb-1">Waitlist Queue</p>
             <p className="text-xl font-bold text-red-400">{data?.waitlistRegs} Teams</p>
          </div>
          <div className="p-5 rounded-2xl bg-dark-800 border border-surface-border">
             <p className="text-sm text-dark-400 mb-1">Physical Scale</p>
             <p className="text-xl font-bold text-neon-cyan">{data?.activeGroups} Lobbies</p>
          </div>
       </div>

       {/* Tournament Lifecycle Control */}
       {data?.status !== 'completed' && (
          <div className="mt-6 bg-red-500/5 border border-red-500/20 rounded-2xl p-6">
             <h3 className="font-bold text-red-400 mb-2">Close Tournament</h3>
             <p className="text-xs text-dark-400 mb-4">Formally close this tournament. All provisional results will be finalized. This action is permanent.</p>
             <button
                onClick={async () => {
                   if (!window.confirm('Permanently close this tournament and finalize all results?')) return;
                   try {
                      const res = await api.post(`/tournaments/${id}/close`, { winnerNote: 'Tournament concluded by organizer.' });
                      if (res.success) { toast.success(res.message); fetchOverview(); }
                   } catch (err) { toast.error('Close sequence failed.'); }
                }}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 px-6 py-2 rounded-lg text-sm font-bold transition-all"
             >
                Close & Finalize Tournament
             </button>
          </div>
       )}
       {data?.status === 'completed' && (
          <div className="mt-6 bg-green-500/10 border border-green-500/20 rounded-2xl p-5 text-center">
             <p className="text-green-400 font-bold">✓ Tournament Completed & Finalized</p>
          </div>
       )}

    </div>
  );
};

export default TournamentOverviewTab;
