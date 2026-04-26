import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Loader from '../components/ui/Loader';
import Badge from '../components/ui/Badge';
import { HiUserGroup, HiShieldCheck, HiPlus, HiPencilAlt, HiTrash, HiDeviceMobile, HiIdentification, HiLink, HiStar, HiLightningBolt } from 'react-icons/hi';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import Modal from '../components/ui/Modal';
import { fileToBase64 } from '../utils/imageUtils';

const TeamProfile = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [matchHistory, setMatchHistory] = useState([]);
  
  // Recruitment states
  const [inviteUid, setInviteUid] = useState('');
  const [applying, setApplying] = useState(false);
  const [applications, setApplications] = useState([]);
  const [showApps, setShowApps] = useState(false);
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);

  // Edit states
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', tag: '', bio: '', logo: '', recruitmentMode: 'invite' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    fetchTeam();
  }, [id]);

  const fetchTeam = async () => {
    try {
      const data = await api.get(`/teams/${id}`);
      setTeam(data.team);
      setEditForm({
        name: data.team.name || '',
        tag: data.team.tag || '',
        bio: data.team.bio || '',
        logo: data.team.logo || '',
        recruitmentMode: data.team.recruitmentMode || 'invite'
      });
      // Fetch match history
      try {
        const histRes = await api.get(`/teams/${id}/results`);
        setMatchHistory(histRes.results || []);
      } catch {} 
    } catch (err) {
      setError(err.message || 'Team not found');
    } finally {
      setLoading(false);
    }
  };

  const fetchApps = async () => {
    try {
      const res = await api.get(`/teams/${id}/applications`);
      setApplications(res.applications);
      setShowApps(true);
    } catch (err) {
      toast.error('Could not fetch applications');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteUid) return;
    try {
      await api.post(`/teams/${id}/invite`, { playerId: inviteUid });
      toast.success('Invite sent! The player will see it on their dashboard.');
      setInviteUid('');
      setInviteModalOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to send invite');
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      await api.post(`/teams/${id}/apply`);
      toast.success('Application sent successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  const handleAppStatus = async (appId, status) => {
    try {
      await api.put(`/teams/applications/${appId}`, { status });
      toast.success(`Application ${status}`);
      fetchApps();
      fetchTeam();
    } catch (err) {
      toast.error('Failed to update application');
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setEditForm(prev => ({ ...prev, logo: base64 }));
      } catch (err) {
        toast.error('Failed to read image');
      }
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await api.put(`/teams/${id}`, editForm);
      toast.success('Team updated!');
      setEditModalOpen(false);
      fetchTeam();
    } catch (err) {
      toast.error(err.message || 'Failed to update team');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the team?')) return;
    try {
      await api.delete(`/teams/${id}/members/${userId}`);
      toast.success('Member removed');
      fetchTeam();
    } catch (err) {
      toast.error(err.message || 'Failed to remove member');
    }
  };

  if (loading) return <><Navbar /><div className="min-h-screen pt-20 flex justify-center p-12"><Loader /></div></>;
  if (error || !team) return <><Navbar /><div className="min-h-screen pt-32 text-center text-white">{error}</div></>;

  const captainId = team.captain?._id || team.captain;
  const userId = user?.id || user?._id;
  const isCaptain = user && String(captainId) === String(userId);
  const isMember = user && team.members.some(m => String(m.user?._id || m.user) === String(userId));

  const roleColors = {
    captain: 'text-yellow-400',
    'co-captain': 'text-blue-400',
    player: 'text-dark-300'
  };

  const roleLabels = {
    captain: 'Captain',
    'co-captain': 'Co-Captain',
    player: 'Player'
  };

  return (
    <div className="min-h-screen bg-dark-950">
      <Navbar />

      <div className="pt-24 pb-16 px-4 max-w-5xl mx-auto">
        {/* Header section */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8 mb-12">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-dark-800 border-4 border-surface-border flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xl shadow-neon-cyan/5">
            {team.logo ? <img src={team.logo} className="w-full h-full object-cover" /> : <HiUserGroup className="text-5xl text-dark-500" />}
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <h1 className="text-3xl md:text-4xl font-display font-black text-white">{team.name}</h1>
              <Badge variant="primary" size="lg" className="font-mono tracking-widest uppercase">{team.tag}</Badge>
              {team.recruitmentMode === 'public' && <Badge variant="neon" size="sm">Public</Badge>}
            </div>
            <p className="text-dark-300 max-w-2xl mb-6">{team.bio || 'No bio provided.'}</p>

            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              {isCaptain && (
                <button onClick={() => setEditModalOpen(true)} className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
                  <HiPencilAlt /> Edit Team
                </button>
              )}
              {isCaptain && team.recruitmentMode === 'public' && (
                <button className="btn-ghost text-sm py-2 px-4" onClick={fetchApps}>View Applications</button>
              )}
              {!isMember && team.recruitmentMode === 'public' && user?.role === 'player' && (
                <button className="btn-neon text-sm py-2 px-4" disabled={applying} onClick={handleApply}>
                  {applying ? 'Applying...' : 'Apply to Join'}
                </button>
              )}
              {isCaptain && (
                <button onClick={() => setInviteModalOpen(true)} className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
                  <HiPlus /> Add Member
                </button>
              )}
              {isCaptain && team.inviteCode && (
                <button
                  onClick={() => {
                    const link = `${window.location.origin}/teams/join/${team.inviteCode}`;
                    navigator.clipboard.writeText(link);
                    toast.success('Invite link copied to clipboard!');
                  }}
                  className="btn-ghost text-sm py-2 px-4 flex items-center gap-2 border border-surface-border"
                >
                  <HiLink /> Share Invite Link
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Pending Applications Subview */}
        {showApps && isCaptain && (
          <div className="card mb-8 border-neon-cyan/30">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Pending Applications</h3>
              <button onClick={() => setShowApps(false)} className="text-dark-400 text-sm">Close</button>
            </div>
            {applications.length === 0 ? (
              <p className="text-dark-400 text-sm">No pending applications right now.</p>
            ) : (
              <div className="space-y-3">
                {applications.map(app => (
                  <div key={app._id} className="flex justify-between items-center p-3 border border-surface-border rounded-lg bg-dark-900">
                    <div>
                      <h4 className="font-bold text-white">{app.player.username}</h4>
                      <p className="text-xs text-dark-400">IGN: {app.player.ign || 'N/A'} | Device: {app.player.device || 'N/A'}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAppStatus(app._id, 'accepted')} className="btn-neon text-xs px-3 py-1">Accept</button>
                      <button onClick={() => handleAppStatus(app._id, 'rejected')} className="btn-secondary text-xs px-3 py-1 border border-surface-border text-red-400 hover:text-red-300">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Roster Panel */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
              <HiUserGroup className="text-neon-cyan" /> Team Roster ({team.members.length} members)
            </h3>

            {/* Player Cards */}
            <div className="space-y-3">
              {team.members.map((member, idx) => {
                const memberUser = member.user || {};
                
                // Prioritize the live User object over stale team array data
                const liveIgn = memberUser.ign || member.ign;
                const liveUid = memberUser.uid || member.uid;
                const liveDevice = memberUser.device || member.device;

                const hasIgn = !!liveIgn;
                const displayName = hasIgn ? liveIgn : null;
                const displayUid = liveUid || null;
                const displayDevice = liveDevice || null;
                const isCurrentUserCaptain = isCaptain;
                const isMemberCaptain = member.role === 'captain';

                return (
                  <div
                    key={idx}
                    className="flex items-center gap-4 p-4 rounded-xl border border-surface-border bg-dark-900 hover:bg-dark-850 transition-all group"
                  >
                    {/* Avatar */}
                    <div className="w-14 h-14 rounded-xl bg-dark-800 flex items-center justify-center font-bold text-xl text-dark-400 overflow-hidden flex-shrink-0 border border-surface-border">
                      {memberUser.avatar ? (
                        <img src={memberUser.avatar} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg">{(memberUser.username || '?')[0].toUpperCase()}</span>
                      )}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-bold uppercase tracking-wider ${roleColors[member.role] || 'text-dark-400'}`}>
                          {roleLabels[member.role] || member.role}
                        </span>
                      </div>
                      <h4 className="text-white font-semibold text-base truncate">
                        {displayName || <span className="text-dark-500 italic font-normal">IGN not set</span>}
                      </h4>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                        {displayUid && (
                          <div className="flex items-center gap-1.5 text-xs text-dark-400">
                            <HiIdentification className="text-dark-500" />
                            <span className="text-dark-500">UID:</span>
                            <span className="text-dark-300 font-mono">{displayUid}</span>
                          </div>
                        )}
                        {displayDevice && (
                          <div className="flex items-center gap-1.5 text-xs text-dark-400">
                            <HiDeviceMobile className="text-dark-500" />
                            <span className="text-dark-500">Device:</span>
                            <span className="text-dark-300">{displayDevice}</span>
                          </div>
                        )}
                        {!displayUid && !displayDevice && (
                          <span className="text-xs text-dark-500 italic">Profile incomplete</span>
                        )}
                      </div>
                    </div>

                    {/* Remove button (captain only, can't remove self) */}
                    {isCurrentUserCaptain && !isMemberCaptain && (
                      <button
                        onClick={() => handleRemoveMember(memberUser._id)}
                        className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-all"
                        title="Remove member"
                      >
                        <HiTrash />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Empty Slots */}
              {Array.from({ length: Math.max(0, 4 - team.members.length) }).map((_, i) => {
                const slotNum = team.members.length + i + 1;
                return (
                <div
                  key={`empty-${i}`}
                  onClick={() => { if (isCaptain) setInviteModalOpen(true); }}
                  className={`flex items-center gap-4 p-4 rounded-xl border border-dashed border-surface-border bg-dark-900/50 opacity-50 ${isCaptain ? 'cursor-pointer hover:opacity-80 hover:border-primary-500/50' : ''}`}
                >
                  <div className="w-14 h-14 rounded-xl bg-dark-800 flex items-center justify-center border border-dashed border-dark-600">
                    <HiPlus className="text-dark-500" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-dark-500">
                      Player {slotNum}
                      <span className="text-red-400 ml-2 normal-case">*Required</span>
                    </span>
                    <p className="text-sm text-dark-500 mt-1">{isCaptain ? 'Click to invite a player' : 'Open slot'}</p>
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card">
              <h3 className="text-lg font-bold text-white mb-4 border-b border-surface-border pb-2">Season Stats</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-dark-400">Total Scrims</span>
                  <span className="text-white font-bold">{team.totalScrims}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-dark-400">Wins</span>
                  <span className="text-yellow-400 font-bold">{team.wins}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-dark-400">Total Kills</span>
                  <span className="text-red-400 font-bold">{team.totalKills}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-surface-border">
                  <span className="text-neon-cyan font-medium">Season Points</span>
                  <span className="text-neon-cyan font-black text-xl">{team.seasonPoints}</span>
                </div>
              </div>
            </div>
            
            <div className="card border-primary-500/20 bg-primary-900/10">
              <div className="flex items-center gap-3">
                <HiShieldCheck className="text-3xl text-neon-cyan" />
                <div>
                  <h4 className="text-white font-bold">Verified Roster</h4>
                  <p className="text-xs text-dark-400">{team.members.length === 4 ? 'Complete 4-man roster' : 'Incomplete roster (4 required)'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Match History */}
        {matchHistory.length > 0 && (
          <div className="mt-8">
            <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-4">
              <HiLightningBolt className="text-neon-cyan" /> Recent Match History
            </h3>
            <div className="bg-dark-900 border border-surface-border rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-dark-950/50 border-b border-surface-border">
                    <th className="p-4 text-xs font-semibold text-dark-400 uppercase">Scrim</th>
                    <th className="p-4 text-xs font-semibold text-dark-400 uppercase text-center">Place</th>
                    <th className="p-4 text-xs font-semibold text-dark-400 uppercase text-center">Kills</th>
                    <th className="p-4 text-xs font-semibold text-dark-400 uppercase text-center">Points</th>
                    <th className="p-4 text-xs font-semibold text-dark-400 uppercase text-center">Prize</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {matchHistory.slice(0, 10).map((r, idx) => (
                    <tr key={idx} className="hover:bg-dark-800/50 transition-colors">
                      <td className="p-4">
                        <Link to={`/scrims/${r.scrimId}`} className="text-sm font-semibold text-white hover:text-neon-cyan transition-colors">
                          {r.scrimTitle || 'Scrim'}
                        </Link>
                        <p className="text-[10px] text-dark-500 mt-0.5">{r.date ? new Date(r.date).toLocaleDateString() : ''}</p>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                          r.place === 1 ? 'bg-yellow-500/20 text-yellow-400' :
                          r.place <= 3 ? 'bg-green-500/20 text-green-400' :
                          'bg-dark-800 text-dark-400'
                        }`}>#{r.place}</span>
                      </td>
                      <td className="p-4 text-center text-sm text-red-400 font-bold">{r.totalKillPoints || 0}</td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-bold text-neon-cyan">{r.totalPoints || 0}</span>
                      </td>
                      <td className="p-4 text-center">
                        {r.prizeWon > 0 ? (
                          <span className="text-sm font-bold text-green-400">₹{r.prizeWon}</span>
                        ) : (
                          <span className="text-xs text-dark-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      <Footer />

      {/* Invite Modal */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setInviteModalOpen(false)} title="Send Team Invite">
        <form onSubmit={handleInvite} className="space-y-4">
          <p className="text-sm text-dark-300">Enter the player's Unique Invite ID. They will receive the invite on their dashboard and can choose to accept or decline.</p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Player Invite ID</label>
            <input 
              type="text" 
              value={inviteUid} 
              onChange={e => setInviteUid(e.target.value)} 
              placeholder="Paste the player's Unique ID here" 
              className="input-field w-full"
              required
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={() => setInviteModalOpen(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">Send Invite</button>
          </div>
        </form>
      </Modal>

      {/* Edit Team Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Team Details">
        <form onSubmit={handleSaveEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Team Name</label>
            <input 
              type="text" 
              value={editForm.name} 
              onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              className="input-field w-full" 
              required 
              maxLength={30}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tag</label>
            <input 
              type="text" 
              value={editForm.tag} 
              onChange={e => setEditForm(prev => ({ ...prev, tag: e.target.value.toUpperCase() }))}
              className="input-field w-full" 
              maxLength={6}
              placeholder="e.g. HTR"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Bio</label>
            <textarea 
              value={editForm.bio} 
              onChange={e => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
              className="input-field w-full" 
              rows={3}
              maxLength={500}
              placeholder="Describe your team..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Team Logo</label>
            <div className="flex items-center gap-4">
              {editForm.logo && (
                <img src={editForm.logo} alt="Logo preview" className="w-16 h-16 rounded-xl object-cover border border-surface-border" />
              )}
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleLogoUpload}
                className="input-field cursor-pointer file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-neon-cyan/20 file:text-neon-cyan hover:file:bg-neon-cyan/30 flex-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Recruitment</label>
            <select 
              value={editForm.recruitmentMode} 
              onChange={e => setEditForm(prev => ({ ...prev, recruitmentMode: e.target.value }))}
              className="input-field w-full"
            >
              <option value="invite">Invite Only</option>
              <option value="public">Public (Accept Applications)</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4 border-t border-surface-border">
            <button type="button" onClick={() => setEditModalOpen(false)} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={savingEdit} className="btn-neon flex-1">
              {savingEdit ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeamProfile;
