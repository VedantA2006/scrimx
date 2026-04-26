import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { HiUser, HiDeviceMobile, HiSave, HiIdentification, HiPhone, HiClipboardCopy, HiLightningBolt, HiCollection, HiStar, HiTrendingUp, HiUserGroup, HiDesktopComputer, HiCamera, HiPhotograph } from 'react-icons/hi';
import LoadingButton from '../../components/ui/LoadingButton';
import Badge from '../../components/ui/Badge';
import { Link } from 'react-router-dom';

const PlayerProfile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [statsData, setStatsData] = useState({ stats: null, teams: [] });
  const [loadingStats, setLoadingStats] = useState(true);

  const [formData, setFormData] = useState({
    username: user?.username || '',
    realName: user?.realName || '',
    phone: user?.phone || '',
    ign: user?.ign || '',
    uid: user?.uid || '',
    device: user?.device || '',
    preferredRole: user?.preferredRole || '',
    playStyle: user?.playStyle || '',
    sensitivity: user?.sensitivity || '',
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
  const [bannerPreview, setBannerPreview] = useState(user?.banner || '');

  useEffect(() => {
    if (user?._id) {
      api.get(`/users/${user._id}/stats`)
        .then(res => setStatsData(res))
        .catch(() => {})
        .finally(() => setLoadingStats(false));
    }
  }, [user?._id]);

  const handleChange = (e) => {
    setIsDirty(true);
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        if (val !== undefined && val !== null) fd.append(key, val);
      });
      if (avatarFile) fd.append('avatar', avatarFile);
      if (bannerFile) fd.append('banner', bannerFile);

      const { user: updatedUser } = await api.put('/auth/profile', fd);
      updateUser(updatedUser);
      setAvatarFile(null);
      setBannerFile(null);
      setIsDirty(false);
      toast.success('Player profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setIsDirty(true);
  };

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setIsDirty(true);
  };

  const getDeviceIcon = (device) => {
    if (device === 'mobile') return <HiDeviceMobile />;
    if (device === 'tablet') return <HiDeviceMobile className="w-5 h-5 rotate-90" />;
    if (device === 'emulator') return <HiDesktopComputer />;
    return null;
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* LEFT PANEL */}
        <div className="w-full lg:w-1/3 space-y-6 lg:sticky lg:top-8">
          
          {/* Profile Card */}
          <div className="card text-center relative overflow-hidden">
            {/* Banner */}
            <div className="absolute top-0 left-0 w-full h-28 group/banner">
              {bannerPreview ? (
                <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-neon-cyan/20 to-primary-600/20" />
              )}
              <div className="absolute inset-0 bg-dark-950/40" />
              <label className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/banner:opacity-100 transition-opacity cursor-pointer bg-dark-950/50">
                <div className="flex items-center gap-2 text-white text-xs font-bold bg-dark-900/80 px-3 py-1.5 rounded-lg border border-surface-border">
                  <HiPhotograph /> Change Banner
                </div>
                <input type="file" accept="image/*" onChange={handleBannerChange} className="hidden" />
              </label>
            </div>

            <div className="relative z-10 pt-10 flex flex-col items-center">
              {/* Avatar */}
              <label className="relative cursor-pointer group/avatar mb-4">
                <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-dark-950 shadow-xl shadow-neon-cyan/20">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-neon-cyan to-primary-600 flex items-center justify-center text-dark-950 font-display font-black text-4xl">
                      {user?.username?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute inset-0 rounded-full flex items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity bg-dark-950/60">
                  <HiCamera className="text-white text-xl" />
                </div>
                <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              </label>

              <h2 className="text-xl font-bold text-white">{user?.username}</h2>
              <p className="text-dark-400 font-mono text-sm mt-1">{user?.ign || 'No IGN Set'}</p>
              
              <div className="mt-3 flex items-center justify-center gap-2 bg-dark-900 px-3 py-1.5 rounded-lg border border-surface-border">
                <span className="font-mono text-neon-cyan font-bold text-xs">UID: {user?.uid || 'Not Set'}</span>
                <button 
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(user?.uid || '');
                    toast.success('UID copied!');
                  }}
                  className="text-dark-400 hover:text-white transition-colors"
                >
                  <HiClipboardCopy />
                </button>
              </div>

              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Badge variant="neon">Player</Badge>
                {user?.device && (
                  <Badge className="bg-dark-800 text-dark-300 border-surface-border flex items-center gap-1">
                    {getDeviceIcon(user.device)} <span className="capitalize">{user.device}</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Kill Stats */}
          <div className="card">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><HiLightningBolt className="text-neon-cyan" /> Player Statistics</h3>
            {loadingStats ? (
              <div className="space-y-4 animate-pulse">
                <div className="h-16 bg-dark-800 rounded-xl w-full" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-16 bg-dark-800 rounded-xl" />
                  <div className="h-16 bg-dark-800 rounded-xl" />
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-dark-900 border border-red-500/20 rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-dark-400 font-bold uppercase tracking-wider mb-1">Total Kills</div>
                    <div className="text-3xl font-display font-black text-red-400">{statsData.stats?.totalKills || 0}</div>
                  </div>
                  <HiLightningBolt className="text-4xl text-red-500/20" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-dark-900 border border-surface-border rounded-xl p-3">
                    <div className="text-[10px] text-dark-400 font-bold uppercase tracking-wider mb-1">Scrims Played</div>
                    <div className="text-xl font-bold text-white">{statsData.stats?.totalScrims || 0}</div>
                  </div>
                  <div className="bg-dark-900 border border-surface-border rounded-xl p-3">
                    <div className="text-[10px] text-dark-400 font-bold uppercase tracking-wider mb-1">Best Finish</div>
                    <div className="text-xl font-bold text-yellow-400">{statsData.stats?.bestPlace ? `#${statsData.stats.bestPlace}` : '—'}</div>
                  </div>
                  <div className="bg-dark-900 border border-surface-border rounded-xl p-3">
                    <div className="text-[10px] text-dark-400 font-bold uppercase tracking-wider mb-1">Top 3 Finishes</div>
                    <div className="text-xl font-bold text-green-400">{statsData.stats?.totalTopThree || 0}</div>
                  </div>
                  <div className="bg-dark-900 border border-surface-border rounded-xl p-3">
                    <div className="text-[10px] text-dark-400 font-bold uppercase tracking-wider mb-1">Team Wins</div>
                    <div className="text-xl font-bold text-primary-400">{statsData.stats?.totalWins || 0}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Teams */}
          <div className="card">
            <h3 className="text-white font-bold mb-4 flex items-center gap-2"><HiUserGroup className="text-neon-cyan" /> My Teams</h3>
            {loadingStats ? (
              <div className="space-y-3 animate-pulse">
                {[1,2].map(i => <div key={i} className="h-12 bg-dark-800 rounded-xl" />)}
              </div>
            ) : statsData.teams?.length > 0 ? (
              <div className="space-y-3">
                {statsData.teams.slice(0, 4).map(team => (
                  <Link key={team._id} to={`/teams/${team._id}`} className="flex items-center gap-3 p-3 bg-dark-900 border border-surface-border hover:border-neon-cyan/50 rounded-xl transition-colors group">
                    <div className="w-10 h-10 rounded bg-dark-800 overflow-hidden flex-shrink-0">
                      {team.logo ? <img src={team.logo} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-dark-400 font-bold text-xs">{team.tag}</div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-white truncate group-hover:text-neon-cyan transition-colors">{team.name}</div>
                      <div className="text-xs text-dark-400">
                        {team.role === 'captain' ? '👑 Captain' : team.role === 'co-captain' ? 'Co-Captain' : 'Player'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-dark-900 rounded-xl border border-surface-border border-dashed">
                <p className="text-sm text-dark-400 mb-3">No teams yet</p>
                <Link to="/dashboard/teams" className="text-neon-cyan text-xs font-bold hover:underline">Find or Create Team</Link>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-full lg:w-2/3 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Real Identity */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <HiIdentification className="text-neon-cyan" />
                <h3 className="text-lg font-semibold text-white">Real Identity</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Username (Display)</label>
                  <input type="text" name="username" value={formData.username} onChange={handleChange} placeholder="e.g. Mortal" required className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Real Name</label>
                  <input type="text" name="realName" value={formData.realName} onChange={handleChange} placeholder="e.g. Naman Mathur" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91..." className="input-field" />
                </div>
              </div>
            </div>

            {/* Gaming Profile */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <HiDeviceMobile className="text-neon-cyan" />
                <h3 className="text-lg font-semibold text-white">Gaming Profile</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">In-Game Name (IGN)</label>
                  <input type="text" name="ign" value={formData.ign} onChange={handleChange} placeholder="SOULMortal" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Game Custom UID</label>
                  <input type="text" name="uid" value={formData.uid} onChange={handleChange} placeholder="e.g. 512345678" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Primary Device</label>
                  <select name="device" value={formData.device} onChange={handleChange} className="input-field">
                    <option value="">Select a device</option>
                    <option value="mobile">Mobile / Phone</option>
                    <option value="tablet">iPad / Tablet</option>
                    <option value="emulator">Emulator / PC</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Competitive Info */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <HiStar className="text-neon-cyan" />
                <h3 className="text-lg font-semibold text-white">Competitive Info</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Preferred Role</label>
                  <select name="preferredRole" value={formData.preferredRole} onChange={handleChange} className="input-field">
                    <option value="">Select Role</option>
                    <option value="Assaulter">Assaulter</option>
                    <option value="Sniper">Sniper</option>
                    <option value="Support">Support</option>
                    <option value="In-Game Leader (IGL)">In-Game Leader (IGL)</option>
                    <option value="Entry Fragger">Entry Fragger</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Play Style</label>
                  <select name="playStyle" value={formData.playStyle} onChange={handleChange} className="input-field">
                    <option value="">Select Play Style</option>
                    <option value="Aggressive">Aggressive</option>
                    <option value="Supportive">Supportive</option>
                    <option value="Balanced">Balanced</option>
                    <option value="Rush">Rush</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Sensitivity / HUD Setup</label>
                  <input type="text" name="sensitivity" value={formData.sensitivity} onChange={handleChange} placeholder="e.g. 3-3-3 (gyro off)" className="input-field" />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end gap-4 sticky bottom-6 z-20 bg-dark-950/80 backdrop-blur p-4 rounded-2xl border border-surface-border">
              {isDirty && (
                <div className="text-xs text-amber-400 flex items-center gap-2">
                  <span className="animate-pulse">●</span> Unsaved changes
                </div>
              )}
              <LoadingButton type="submit" loading={loading} variant="primary" className="px-8 py-3 text-sm font-semibold inline-flex items-center gap-2 w-full sm:w-auto">
                <HiSave /> Save Profile
              </LoadingButton>
            </div>

          </form>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PlayerProfile;
