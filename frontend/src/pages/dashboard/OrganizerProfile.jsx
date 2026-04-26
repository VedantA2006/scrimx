import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { HiUser, HiPhotograph, HiSave, HiUpload, HiCreditCard, HiChat, HiStar, HiCurrencyRupee, HiCheckCircle, HiLightningBolt, HiTrendingUp } from 'react-icons/hi';
import QRCode from 'react-qr-code';
import LoadingButton from '../../components/ui/LoadingButton';
import Badge from '../../components/ui/Badge';
import { Link } from 'react-router-dom';

const OrganizerProfile = () => {
  const { user, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const org = user?.organizerProfile || {};

  const [formData, setFormData] = useState({
    displayName: org.displayName || '',
    realName: user?.realName || '',
    phone: user?.phone || '',
    bio: org.bio || '',
    upiId: org.upiId || '',
  });

  // File states
  const [logoFile, setLogoFile] = useState(null);
  const [bannerFile, setBannerFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(org.logo || '');
  const [bannerPreview, setBannerPreview] = useState(org.banner || '');
  const logoRef = useRef(null);
  const bannerRef = useRef(null);

  // Telegram States
  const [telegramStatus, setTelegramStatus] = useState({ verified: false, username: '' });
  const [tgInput, setTgInput] = useState('');
  const [tgChatId, setTgChatId] = useState('');
  const [tgOtp, setTgOtp] = useState('');
  const [tgStep, setTgStep] = useState(0); // 0=init, 1=otp_sent, 2=verified
  const [tgLoading, setTgLoading] = useState(false);

  useEffect(() => {
    fetchTelegramStatus();
  }, []);

  const fetchTelegramStatus = async () => {
    try {
      const res = await api.get('/telegram/status');
      setTelegramStatus(res.data || res);
      if (res.data?.verified || res.verified) setTgStep(2);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendTelegramOtp = async () => {
    setTgLoading(true);
    try {
      const res = await api.post('/telegram/send-otp', {});
      setTgOtp(res.otp || res.data?.otp);
      setTgStep(1);
      toast.success('Linking code generated!');
    } catch (err) {
      toast.error(err.message || 'Failed to generate code');
    } finally {
      setTgLoading(false);
    }
  };

  const handleVerifyTelegramOtp = async () => {
    setTgLoading(true);
    try {
      const res = await api.get('/telegram/status');
      setTelegramStatus(res.data || res);
      if (res.data?.verified || res.verified) {
        setTgStep(2);
        toast.success('Telegram linked successfully!');
      } else {
        toast.error('Not linked yet. Please send the code to the bot first.');
      }
    } catch (err) {
      toast.error(err.message || 'Verification failed');
    } finally {
      setTgLoading(false);
    }
  };

  const handleChange = (e) => {
    setIsDirty(true);
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File must be under 5MB');
      return;
    }
    setIsDirty(true);
    const preview = URL.createObjectURL(file);
    if (type === 'logo') {
      setLogoFile(file);
      setLogoPreview(preview);
    } else {
      setBannerFile(file);
      setBannerPreview(preview);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const fd = new FormData();
      Object.keys(formData).forEach(key => {
        fd.append(key, formData[key]);
      });
      if (logoFile) fd.append('logo', logoFile);
      if (bannerFile) fd.append('banner', bannerFile);

      const { user: updatedUser } = await api.put('/organizers/profile', fd);
      updateUser(updatedUser);
      setIsDirty(false);
      toast.success('Profile updated successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const getTrustScoreColor = (score) => {
    if (score >= 70) return 'text-green-400 bg-green-400';
    if (score >= 40) return 'text-amber-400 bg-amber-400';
    return 'text-red-400 bg-red-400';
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8 items-start">
        {/* LEFT PANEL */}
        <div className="w-full lg:w-1/3 space-y-6 lg:sticky lg:top-8">
          
          {/* Organizer Card */}
          <div className="card text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-neon-cyan/20 to-primary-600/20">
              {bannerPreview && <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover opacity-50 mix-blend-overlay" />}
            </div>
            <div className="relative z-10 pt-8 flex flex-col items-center">
              <div className="w-24 h-24 rounded-2xl bg-dark-800 flex items-center justify-center text-dark-950 font-display font-black text-4xl mb-4 border-4 border-dark-950 shadow-xl overflow-hidden">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-neon-cyan to-primary-600 flex items-center justify-center">
                    {(formData.displayName || user?.username)?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold text-white">{formData.displayName || user?.username || 'Organizer Name'}</h2>
              <p className="text-dark-400 font-mono text-sm mt-1">@{user?.username}</p>

              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {org.isVerified && <Badge variant="success"><HiCheckCircle className="inline mr-1" />Verified</Badge>}
                <Badge className={org.plan === 'elite' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' : 'bg-dark-800 text-dark-300'}>
                  {org.plan === 'elite' ? 'Elite Plan' : 'Free Plan'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="card space-y-4">
            <h3 className="text-white font-bold flex items-center gap-2"><HiTrendingUp className="text-neon-cyan" /> Organizer Stats</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-dark-900 border border-surface-border rounded-xl p-3">
                <div className="text-[10px] text-dark-400 font-bold uppercase tracking-wider mb-1">Hosted</div>
                <div className="text-xl font-bold text-white">{org.totalScrimsHosted || 0}</div>
              </div>
              <div className="bg-dark-900 border border-surface-border rounded-xl p-3">
                <div className="text-[10px] text-dark-400 font-bold uppercase tracking-wider mb-1">Prize Dist.</div>
                <div className="text-xl font-bold text-green-400">₹{org.totalPrizeDistributed?.toLocaleString() || 0}</div>
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-dark-400 font-bold uppercase tracking-wider">Completion Rate</span>
                  <span className="text-white font-bold">{org.completionRate || 100}%</span>
                </div>
                <div className="h-1.5 w-full bg-dark-800 rounded-full overflow-hidden">
                  <div className="h-full bg-neon-cyan rounded-full" style={{ width: `${org.completionRate || 100}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-dark-400 font-bold uppercase tracking-wider">Trust Score</span>
                  <span className={`font-bold ${getTrustScoreColor(org.trustScore || 50).split(' ')[0]}`}>{org.trustScore || 50}/100</span>
                </div>
                <div className="h-1.5 w-full bg-dark-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${getTrustScoreColor(org.trustScore || 50).split(' ')[1]}`} style={{ width: `${org.trustScore || 50}%` }} />
                </div>
              </div>

              <div>
                <div className="text-xs text-dark-400 font-bold uppercase tracking-wider mb-1.5">Rating</div>
                {org.ratingCount > 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="flex text-yellow-400 text-lg">
                      {[1,2,3,4,5].map(star => (
                        <HiStar key={star} className={star <= Math.round(org.rating || 0) ? 'text-yellow-400' : 'text-dark-700'} />
                      ))}
                    </div>
                    <span className="text-xs text-dark-300">({org.ratingCount} reviews)</span>
                  </div>
                ) : (
                  <span className="text-xs text-dark-500">No ratings yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Points Wallet */}
          <div className="card bg-gradient-to-br from-primary-900/20 to-dark-900 border-primary-500/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <div className="text-xs text-dark-400 font-bold uppercase tracking-wider mb-1">Available Points</div>
                <div className="text-3xl font-display font-black text-white flex items-center gap-2">
                  <HiLightningBolt className="text-primary-500" />
                  {org.pointsWallet?.balance || 0}
                </div>
                <div className="text-[10px] text-primary-400 mt-1">30 points per scrim publish</div>
              </div>
              <Link to="/organizer/points" className="bg-primary-500/20 text-primary-400 hover:bg-primary-500 hover:text-white transition-colors text-xs font-bold px-3 py-2 rounded-lg border border-primary-500/30">
                Top Up
              </Link>
            </div>
          </div>

        </div>

        {/* RIGHT PANEL */}
        <div className="w-full lg:w-2/3 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Basic Information */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <HiUser className="text-neon-cyan" />
                <h3 className="text-lg font-semibold text-white">Basic Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Display Name / Storefront Name</label>
                  <input type="text" name="displayName" value={formData.displayName} onChange={handleChange} placeholder="e.g. ScrimX Tournaments" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Real Name</label>
                  <input type="text" name="realName" value={formData.realName} onChange={handleChange} placeholder="e.g. Naman Mathur" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="+91..." className="input-field" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Organizer Bio</label>
                  <textarea name="bio" value={formData.bio} onChange={handleChange} placeholder="Describe your organization, tournament styles, rules, etc." rows={4} className="input-field resize-y" />
                </div>
              </div>
            </div>

            {/* Branding Media */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <HiPhotograph className="text-neon-cyan" />
                <h3 className="text-lg font-semibold text-white">Branding & Media</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Logo Image <span className="text-xs font-normal text-dark-500">• 200×200px recommended</span></label>
                  <input type="file" ref={logoRef} accept="image/*" onChange={(e) => handleFileSelect(e, 'logo')} className="hidden" />
                  <div onClick={() => logoRef.current?.click()} className="group cursor-pointer border-2 border-dashed border-surface-border hover:border-neon-cyan/50 rounded-xl p-6 text-center transition-all bg-dark-900/50 hover:bg-dark-900">
                    {logoPreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={logoPreview} alt="Logo preview" className="w-20 h-20 rounded-xl object-cover border border-surface-border" />
                        <span className="text-xs text-dark-400 group-hover:text-neon-cyan transition-colors">Click to change</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <HiUpload className="text-2xl text-dark-500 group-hover:text-neon-cyan transition-colors" />
                        <span className="text-sm text-dark-400">Upload Logo</span>
                        <span className="text-xs text-dark-600">Square image, 200×200px • Max 5MB</span>
                        <span className="text-xs text-dark-600">JPG, PNG or WebP</span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Banner Image <span className="text-xs font-normal text-dark-500">• 1200×400px recommended</span></label>
                  <input type="file" ref={bannerRef} accept="image/*" onChange={(e) => handleFileSelect(e, 'banner')} className="hidden" />
                  <div onClick={() => bannerRef.current?.click()} className="group cursor-pointer border-2 border-dashed border-surface-border hover:border-neon-cyan/50 rounded-xl p-6 text-center transition-all bg-dark-900/50 hover:bg-dark-900">
                    {bannerPreview ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={bannerPreview} alt="Banner preview" className="w-full h-20 rounded-lg object-cover border border-surface-border" />
                        <span className="text-xs text-dark-400 group-hover:text-neon-cyan transition-colors">Click to change</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <HiUpload className="text-2xl text-dark-500 group-hover:text-neon-cyan transition-colors" />
                        <span className="text-sm text-dark-400">Upload Banner</span>
                        <span className="text-xs text-dark-600">Wide image, 1200×400px • Max 5MB</span>
                        <span className="text-xs text-dark-600">JPG, PNG or WebP</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Settings */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <HiCreditCard className="text-neon-cyan" />
                <h3 className="text-lg font-semibold text-white">Payment Settings</h3>
              </div>
              <p className="text-sm text-dark-400">Players will pay the entry fee directly to this UPI ID. A QR code is auto-generated from it.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    UPI ID <span className="text-xs text-dark-500 font-normal">e.g. yourname@ybl or 9999999999@upi</span>
                  </label>
                  <input type="text" name="upiId" value={formData.upiId} onChange={handleChange} placeholder="yourname@upi" className="input-field font-mono" />
                  {formData.upiId && <p className="text-xs text-green-400 mt-1.5 flex items-center gap-1">✓ Players will see this UPI ID when joining paid scrims</p>}
                </div>
                {formData.upiId ? (
                  <div className="flex flex-col items-center gap-3 bg-dark-900/60 border border-surface-border rounded-xl p-4">
                    <p className="text-xs text-dark-400 font-medium uppercase tracking-wider">QR Preview</p>
                    <div className="bg-white p-3 rounded-xl">
                      <QRCode value={`upi://pay?pa=${formData.upiId}&pn=${encodeURIComponent(formData.displayName || user?.username || 'Organizer')}&cu=INR`} size={120} />
                    </div>
                    <p className="text-xs text-neon-cyan font-mono font-bold">{formData.upiId}</p>
                    <p className="text-[10px] text-dark-500 text-center">Entry fee amount is filled in automatically when a player joins</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center bg-dark-900/40 border border-dashed border-surface-border rounded-xl p-8 text-center">
                    <HiCreditCard className="text-dark-600 text-3xl mb-2" />
                    <p className="text-xs text-dark-500">Enter your UPI ID to see the QR preview</p>
                  </div>
                )}
              </div>
            </div>

            {/* Telegram Linking */}
            <div className="card space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <HiChat className="text-neon-cyan" />
                <h3 className="text-lg font-semibold text-white">Telegram Bot Linking</h3>
              </div>
              <p className="text-sm text-dark-400">Link your Telegram account to receive instant notifications when players request to join your paid scrims.</p>
              <div className="bg-dark-900 border border-surface-border rounded-xl p-5">
                {tgStep === 2 ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                      <HiChat className="text-green-500 text-xl" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold">Telegram Linked</h4>
                      <p className="text-sm text-dark-400">Connected as @{telegramStatus.username || tgInput}</p>
                    </div>
                  </div>
                ) : tgStep === 1 ? (
                  <div className="space-y-4">
                    <div className="flex flex-col md:flex-row items-center gap-4 bg-primary-500/10 p-5 rounded-lg border border-primary-500/20">
                      <div className="flex-1 text-center md:text-left">
                        <p className="text-sm text-dark-300 mb-2">Message our bot and send this exact 6-digit code to link your account:</p>
                        <div className="bg-dark-900 border border-surface-border rounded-lg p-3 inline-block mb-3">
                          <span className="text-2xl font-mono font-bold tracking-widest text-neon-cyan">{tgOtp}</span>
                        </div>
                        <p className="text-xs text-dark-400">1. Open Telegram and search for <strong>@scrimx6bot</strong></p>
                        <p className="text-xs text-dark-400">2. Press Start and type the code above.</p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <a href={`https://t.me/scrimx6bot?start=${tgOtp}`} target="_blank" rel="noreferrer" className="btn-primary py-2 px-4 text-xs whitespace-nowrap text-center flex items-center justify-center gap-2">
                          <HiChat /> Open Telegram
                        </a>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center bg-dark-800 p-4 rounded-xl border border-surface-border">
                      <p className="text-xs text-dark-400">Once you have sent the code, click verify to confirm.</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setTgStep(0)} className="btn-ghost py-2 text-xs px-4">Cancel</button>
                        <button type="button" onClick={handleVerifyTelegramOtp} disabled={tgLoading} className="btn-neon py-2 text-xs px-4">
                          {tgLoading ? 'Checking...' : 'I have sent the code'}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center py-4">
                    <HiChat className="text-dark-600 text-4xl mb-3" />
                    <p className="text-sm text-dark-300 mb-4 max-w-md">Linking your Telegram allows you to instantly receive notifications when players register for your paid scrims.</p>
                    <button type="button" onClick={handleSendTelegramOtp} disabled={tgLoading} className="btn-primary py-2 px-6">
                      {tgLoading ? 'Generating...' : 'Generate Linking Code'}
                    </button>
                  </div>
                )}
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

export default OrganizerProfile;
