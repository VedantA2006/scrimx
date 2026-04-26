import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { HiFlag, HiPlus, HiCog } from 'react-icons/hi';
import api from '../../lib/api';

const OrganizerTournaments = () => {
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const res = await api.get('/tournaments/my-tournaments');
        if (res.success) setTournaments(res.data);
      } catch (err) {
        console.error('Failed fetching tournaments', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  return (
    <DashboardLayout>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-white mb-2 flex items-center gap-3">
             <HiFlag className="text-primary-500" /> Professional Tournaments
          </h1>
          <p className="text-dark-400">Design, scale, and orchestrate large-stage esports events.</p>
        </div>
        <button onClick={() => navigate('/organizer/tournaments/create')} className="btn-primary flex items-center gap-2">
          <HiPlus /> Setup Enterprise Event
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><div className="w-8 h-8 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin"></div></div>
      ) : tournaments.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 rounded-2xl bg-dark-800 flex items-center justify-center mx-auto mb-4 border border-surface-border">
            <HiFlag className="text-3xl text-dark-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Operations Found</h2>
          <p className="text-dark-400 max-w-sm mx-auto mb-6">
             Initialize an enterprise esports framework with strict logic boundaries.
          </p>
          <button onClick={() => navigate('/organizer/tournaments/create')} className="btn-neon inline-flex items-center gap-2">
            Build Architecture Scaffold
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map(t => (
             <div key={t._id} className="card hover:border-primary-500/50 transition-colors flex flex-col">
                <div className="flex justify-between items-start mb-4">
                   <div>
                      <h3 className="text-lg font-bold text-white truncate max-w-[200px]">{t.title}</h3>
                      <p className="text-xs text-neon-cyan">{t.game} {t.format.toUpperCase()}</p>
                   </div>
                   <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${
                      t.status === 'draft' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'
                   }`}>{t.status}</span>
                </div>
                
                <div className="space-y-2 text-sm mb-6 flex-1 bg-dark-950 p-3 rounded-lg">
                   <div className="flex justify-between text-dark-300">
                     <span>Max Capacity:</span>
                     <span className="text-white font-mono">{t.participation?.maxTeams || t.maxTeams} Teams</span>
                   </div>
                   <div className="flex justify-between text-dark-300">
                     <span>Timeline Starts:</span>
                     <span className="text-white text-xs">{t.schedule?.matchStartDate ? new Date(t.schedule.matchStartDate).toLocaleDateString() : 'Unset'}</span>
                   </div>
                </div>

                <div className="border-t border-surface-border pt-4">
                   <button onClick={() => navigate(`/organizer/tournaments/${t._id}/overview`)} className="btn-ghost w-full flex items-center justify-center gap-2">
                      <HiCog /> Open Enterprise Operations
                   </button>
                </div>
             </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default OrganizerTournaments;
