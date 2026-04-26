import { useState, useEffect } from 'react';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import EmptyState from '../../components/ui/EmptyState';
import { HiMail, HiCheck, HiX, HiUserGroup } from 'react-icons/hi';
import toast from 'react-hot-toast';
import LoadingButton from '../../components/ui/LoadingButton';

const PlayerInvites = () => {
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState(null);

  const fetchInvites = async () => {
    try {
      const data = await api.get('/teams/invites/my');
      setInvites(data.invites);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvites();
  }, []);

  const handleRespond = async (inviteId, status) => {
    setRespondingId(inviteId);
    try {
      await api.put(`/teams/invites/${inviteId}`, { status });
      toast.success(status === 'accepted' ? 'You have joined the team!' : 'Invite declined.');
      setInvites(invites.filter(i => i._id !== inviteId));
    } catch (err) {
      toast.error(err.message || 'Failed to respond to invite');
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-primary-600/20 border border-neon-cyan/20 flex items-center justify-center">
                <HiMail className="text-neon-cyan text-lg" />
              </div>
              Team Invites
            </h1>
            <p className="text-dark-400 mt-1">Pending team invitations from captains</p>
          </div>
          <div className="space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse card flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-dark-700 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-dark-700 rounded w-1/3" />
                  <div className="h-3 bg-dark-700 rounded w-1/4" />
                </div>
                <div className="flex gap-2">
                  <div className="h-9 w-20 bg-dark-700 rounded-lg" />
                  <div className="h-9 w-20 bg-dark-700 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-cyan/20 to-primary-600/20 border border-neon-cyan/20 flex items-center justify-center">
              <HiMail className="text-neon-cyan text-lg" />
            </div>
            Team Invites
          </h1>
          <p className="text-dark-400 mt-1">Pending team invitations from captains</p>
        </div>

        {invites.length === 0 ? (
          <EmptyState
            icon={<HiMail className="text-4xl text-dark-500" />}
            title="No pending invites"
            description="When a team captain sends you an invite, it will appear here."
          />
        ) : (
          <div className="space-y-4">
            {invites.map(invite => (
              <div key={invite._id} className="card border-primary-500/20 hover:border-primary-500/40 transition-all">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-dark-800 border border-surface-border flex items-center justify-center overflow-hidden flex-shrink-0">
                      {invite.team?.logo ? (
                        <img src={invite.team.logo} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <HiUserGroup className="text-2xl text-dark-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{invite.team?.name || 'Unknown Team'}</h3>
                      <p className="text-xs text-dark-400">
                        Invited by <span className="text-neon-cyan">{invite.from?.username || 'Unknown'}</span>
                        {invite.team?.tag && <span className="ml-2 font-mono text-primary-400">[{invite.team.tag}]</span>}
                      </p>
                      <p className="text-xs text-dark-500 mt-1">{invite.team?.members?.length || 0} members currently</p>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <LoadingButton
                      onClick={() => handleRespond(invite._id, 'accepted')}
                      loading={respondingId === invite._id}
                      disabled={respondingId && respondingId !== invite._id}
                      className="btn-neon text-sm px-5 py-2 flex items-center gap-2 flex-1 sm:flex-none justify-center"
                    >
                      <HiCheck /> Accept
                    </LoadingButton>
                    <LoadingButton
                      onClick={() => handleRespond(invite._id, 'rejected')}
                      loading={respondingId === invite._id}
                      disabled={respondingId && respondingId !== invite._id}
                      className="px-5 py-2 text-sm border border-surface-border text-dark-300 hover:text-red-400 hover:border-red-500/30 rounded-lg transition-colors flex items-center gap-2 flex-1 sm:flex-none justify-center"
                    >
                      <HiX /> Decline
                    </LoadingButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PlayerInvites;
