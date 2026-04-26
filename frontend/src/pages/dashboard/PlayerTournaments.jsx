import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/ui/Loader';
import EmptyState from '../../components/ui/EmptyState';
import { HiFlag, HiCollection, HiUserGroup, HiLightningBolt, HiCash, HiCalendar } from 'react-icons/hi';

const STATUS_CONFIG = {
  draft:               { label: 'Draft',              color: 'text-dark-400 bg-dark-800 border-dark-700' },
  published:           { label: 'Published',          color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  registrations_open:  { label: 'Reg. Open',          color: 'text-green-400 bg-green-500/10 border-green-500/30' },
  registrations_closed:{ label: 'Reg. Closed',        color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  check_in:            { label: 'Check-In',           color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
  live:                { label: 'Live',               color: 'text-red-400 bg-red-500/10 border-red-500/30' },
  completed:           { label: 'Completed',          color: 'text-dark-500 bg-dark-900 border-dark-700' },
};

const PlayerTournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const data = await api.get('/tournaments/my-participating');
        setTournaments(data.tournaments || []);
      } catch (err) {
        console.error('Failed to fetch tournaments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTournaments();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-white">My Joined Tournaments</h1>
          <p className="text-dark-400">Manage your tournament participation and check-ins</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse rounded-2xl bg-dark-900 border border-surface-border overflow-hidden">
              <div className="h-32 bg-dark-800" />
              <div className="p-4 space-y-3">
                <div className="h-5 bg-dark-800 rounded w-3/4" />
                <div className="h-4 bg-dark-800 rounded w-1/2 mb-4" />
                <div className="flex gap-4">
                  <div className="h-4 bg-dark-800 rounded w-16" />
                  <div className="h-4 bg-dark-800 rounded w-16" />
                </div>
                <div className="mt-4 h-10 w-full bg-dark-800 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-white">My Joined Tournaments</h1>
        <p className="text-dark-400">Manage your tournament participation and check-ins</p>
      </div>

      {tournaments.length === 0 ? (
        <EmptyState 
          icon={<HiFlag className="text-4xl text-dark-500" />}
          title="No tournaments joined"
          description="You haven't registered for any tournaments yet. Head over to the tournaments page to find some action!"
          action={{ label: 'Explore Tournaments', href: '/tournaments' }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map(tournament => {
            const sc = STATUS_CONFIG[tournament.status] || STATUS_CONFIG.draft;
            return (
              <div
                key={tournament._id}
                onClick={() => navigate(`/tournaments/${tournament._id}/my-portal`)}
                className="group bg-dark-900 border border-surface-border rounded-2xl overflow-hidden hover:border-neon-cyan/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.08)] transition-all cursor-pointer"
              >
                {/* Banner */}
                <div className="relative h-32 bg-gradient-to-br from-dark-800 to-dark-700 overflow-hidden">
                  {tournament.banner ? (
                    <img
                      src={tournament.banner}
                      alt={tournament.title}
                      className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <HiCollection className="text-5xl text-dark-700" />
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider border px-2 py-1 rounded-full ${sc.color}`}>
                      {sc.label}
                    </span>
                  </div>
                  {/* Entry Fee */}
                  {tournament.finance?.entryFee > 0 && (
                    <div className="absolute top-3 right-3 bg-dark-950/80 text-neon-cyan text-xs font-bold px-2 py-1 rounded-lg">
                      ₹{tournament.finance.entryFee}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight group-hover:text-neon-cyan transition-colors">{tournament.title}</h3>
                      {tournament.subtitle && <p className="text-xs text-dark-400 mt-0.5">{tournament.subtitle}</p>}
                    </div>
                    <span className="shrink-0 text-[10px] bg-dark-800 border border-surface-border text-dark-300 px-2 py-1 rounded uppercase tracking-wider">
                      {tournament.game}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-dark-400 mt-3">
                    <span className="flex items-center gap-1">
                      <HiUserGroup className="text-neon-cyan" />
                      {tournament.participation?.maxTeams || '—'} Teams
                    </span>
                    <span className="flex items-center gap-1">
                      <HiLightningBolt className="text-yellow-400" />
                      {tournament.format?.toUpperCase() || 'SQUAD'}
                    </span>
                    {tournament.schedule?.matchStartDate && (
                      <span className="flex items-center gap-1">
                        <HiCalendar className="text-primary-400" />
                        {new Date(tournament.schedule.matchStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={e => { e.stopPropagation(); navigate(`/tournaments/${tournament._id}/my-portal`); }}
                    className="mt-4 w-full py-2 rounded-xl bg-neon-cyan/10 hover:bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/20 text-sm font-bold transition-all"
                  >
                    Open Player Portal →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PlayerTournaments;
