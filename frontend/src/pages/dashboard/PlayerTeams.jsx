import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import EmptyState from '../../components/ui/EmptyState';
import LoadingButton from '../../components/ui/LoadingButton';
import { HiUserGroup, HiPlus, HiTrash } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const SkeletonTeamCard = () => (
  <div className="card animate-pulse">
    <div className="flex items-center gap-4 mb-4">
      <div className="w-16 h-16 rounded-xl bg-dark-800" />
      <div className="space-y-2 flex-1">
        <div className="h-5 bg-dark-800 rounded w-32" />
        <div className="h-3 bg-dark-800 rounded w-20" />
      </div>
    </div>
    <div className="h-16 bg-dark-800 rounded-lg mb-4" />
    <div className="h-4 bg-dark-800 rounded w-24" />
  </div>
);

const PlayerTeams = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const data = await api.get('/teams/manage/my');
        setTeams(data.teams || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  const handleDelete = async (teamId) => {
    setDeleting(true);
    try {
      await api.delete(`/teams/${teamId}`);
      toast.success('Team deleted successfully');
      setTeams(teams.filter(t => t._id !== teamId));
      setConfirmDelete(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete team');
      setConfirmDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const isCaptain = (team) => {
    if (!user) return false;
    const captainId = team.captain?._id || team.captain;
    return captainId === user.id || captainId === user._id;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">My Teams</h1>
            <p className="text-dark-400">Manage your rosters and view stats</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <SkeletonTeamCard key={i} />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">My Teams</h1>
          <p className="text-dark-400">Manage your rosters and view stats</p>
        </div>
        <Link to="/dashboard/teams/create" className="btn-primary flex items-center gap-2">
          <HiPlus /> Create Team
        </Link>
      </div>

      {teams.length === 0 ? (
        <EmptyState
          icon={<HiUserGroup className="text-4xl text-dark-500" />}
          title="No teams yet"
          description="You aren't part of any teams. Create one or ask a captain to invite you."
          action={{ label: 'Create Team', href: '/dashboard/teams/create' }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map(team => {
            const members = team.members || [];
            const memberCount = members.length;
            const totalSlots = 4;
            const allZero = (team.totalScrims || 0) === 0 && (team.wins || 0) === 0 && (team.totalKills || 0) === 0;
            const isConfirming = confirmDelete === team._id;

            return (
              <div key={team._id} className="card hover:border-neon-cyan transition-colors group relative">
                {/* Delete button (captain only) */}
                {isCaptain(team) && !isConfirming && (
                  <button 
                    onClick={(e) => { e.preventDefault(); setConfirmDelete(team._id); }}
                    className="absolute top-4 right-4 p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors z-10"
                    title="Delete Team"
                  >
                    <HiTrash />
                  </button>
                )}

                <Link to={`/teams/${team._id}`} className="block">
                  <div className="flex items-center gap-4 mb-4 pr-10">
                    <div className="w-16 h-16 rounded-xl bg-dark-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {team.logo ? <img src={team.logo} className="w-full h-full object-cover" /> : <HiUserGroup className="text-2xl text-dark-500" />}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-neon-cyan transition-colors">{team.name}</h3>
                      <p className="text-xs text-neon-cyan/70 font-mono tracking-widest">{team.tag}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  {allZero ? (
                    <p className="text-xs text-dark-500 italic mb-4 px-1">No matches played yet</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-dark-900 rounded-lg text-center mb-4 border border-surface-border">
                      <div>
                        <p className="text-[10px] text-dark-400 uppercase tracking-wider mb-1">Matches</p>
                        <p className="font-bold text-white">{team.totalScrims || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-dark-400 uppercase tracking-wider mb-1">Wins</p>
                        <p className="font-bold text-yellow-400">{team.wins || 0}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-dark-400 uppercase tracking-wider mb-1">Kills</p>
                        <p className="font-bold text-red-400">{team.totalKills || 0}</p>
                      </div>
                    </div>
                  )}

                  {/* Member Avatars */}
                  <div className="mb-3">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {Array.from({ length: totalSlots }).map((_, i) => {
                        const member = members[i];
                        if (member) {
                          const initial = (member.username || member.ign || '?')[0].toUpperCase();
                          return (
                            <div key={i} className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center text-xs font-bold text-white" title={member.username || member.ign}>
                              {initial}
                            </div>
                          );
                        }
                        return (
                          <div key={i} className="w-8 h-8 rounded-full border-2 border-dashed border-dark-700 flex items-center justify-center text-dark-600 text-xs">
                            +
                          </div>
                        );
                      })}
                      <span className={`text-xs ml-1 ${memberCount === totalSlots ? 'text-green-400' : 'text-dark-400'}`}>
                        {memberCount}/{totalSlots} members
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className={`text-xs font-medium ${memberCount === totalSlots ? 'text-green-400' : 'text-orange-400'}`}>
                      {memberCount === totalSlots ? '✓ Squad ready' : `${totalSlots - memberCount} slot${totalSlots - memberCount > 1 ? 's' : ''} open`}
                    </span>
                    <span className="text-neon-cyan text-xs font-medium">View Profile &rarr;</span>
                  </div>
                </Link>

                {/* Inline Delete Confirmation */}
                {isConfirming && (
                  <div className="mt-3 pt-3 border-t border-surface-border">
                    <p className="text-sm text-white mb-3">Are you sure you want to permanently delete <span className="font-bold text-red-400">{team.name}</span>?</p>
                    <div className="flex gap-2">
                      <LoadingButton
                        loading={deleting}
                        onClick={() => handleDelete(team._id)}
                        variant="danger"
                        className="flex-1 text-xs px-3 py-2"
                      >
                        Yes, Delete
                      </LoadingButton>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        disabled={deleting}
                        className="btn-ghost flex-1 text-xs px-3 py-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PlayerTeams;
