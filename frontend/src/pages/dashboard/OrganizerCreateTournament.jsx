import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { HiPlus, HiArrowLeft, HiCheckCircle, HiCash, HiShieldCheck, HiOutlineSpeakerphone, HiOutlinePhotograph, HiOutlineX } from 'react-icons/hi';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const OrganizerCreateTournament = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerInputRef = useRef(null);

  // Massive Data Payload State matching the Backend Scheme
  const [formData, setFormData] = useState({
    // Step 1
    title: '', subtitle: '', shortDescription: '', description: '',
    game: 'BGMI', tournamentType: 'Custom', format: 'squad', mode: 'tpp',
    region: 'India', platformType: 'Mobile', visibility: 'Public',

    // Step 2
    schedule: {
      registrationOpen: '', registrationClose: '', checkInOpen: '', checkInClose: '',
      matchStartDate: '', reportingDeadline: '', resultVerificationDeadline: '', prizePayoutDate: '',
      timezone: 'Asia/Kolkata', isMultiDay: false, numberOfDays: 1
    },

    // Step 3
    participation: {
      maxTeams: 100, minPlayersPerTeam: 4, maxPlayersPerTeam: 5,
      allowSubstitutes: true, maxSubstitutes: 1, teamsPerGroup: 20
    },

    // Step 4
    finance: {
      entryFee: 0, currency: 'INR', prizePoolType: 'Guaranteed', totalPrizePool: 0,
      platformFeePercent: 7, organizerFeePercent: 0, paymentMode: 'manual',
      requirePaymentProof: false, autoApproveAfterPayment: false, isRefundable: false
    },

    // Step 5 (Rules)
    rules: {
      regionRestrictions: '', minAccountLevel: 0, allowedDevices: 'Mobile',
      bannedBehavior: 'Standard anti-cheat applies.', vpnAllowed: false,
      lateJoinPenalty: 'Disqualification', noShowPolicy: 'Zero points'
    },

    // Step 6 (Ops)
    operations: {
      primaryChannel: 'discord', supportContact: '', autoSendRoomDetails: false,
      roomReleaseTimeMinutes: 15, resultSubmissionType: 'screenshot',
      requireVideoProof: false, provisionalResultPublish: true, disputesEnabled: true
    },

    // Step 7 (Social)
    socialRequirements: {
      requireFollow: false, requireScreenshot: false,
      instagram: '', youtube: '', discord: '', custom: ''
    }
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;

    if (name.includes('.')) {
      const [category, field] = name.split('.');
      setFormData({
        ...formData,
        [category]: { ...formData[category], [field]: val }
      });
    } else {
      setFormData({ ...formData, [name]: val });
    }
  };

  const handleBannerSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB.');

    // Show local preview immediately
    setBannerPreview(URL.createObjectURL(file));
    setBannerUploading(true);

    try {
      const fd = new FormData();
      fd.append('banner', file);
      const res = await api.post('/tournaments/upload-banner', fd);
      if (res.success) {
        setFormData(prev => ({ ...prev, banner: res.url }));
        toast.success('Banner uploaded!');
      }
    } catch (err) {
      toast.error('Upload failed. Try again.');
      setBannerPreview(null);
    } finally {
      setBannerUploading(false);
    }
  };

  const removeBanner = () => {
    setBannerPreview(null);
    setFormData(prev => ({ ...prev, banner: '' }));
    if (bannerInputRef.current) bannerInputRef.current.value = '';
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handlePrev = () => setStep(prev => prev - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Transform socialRequirements to nest socialLinks
    const payload = {
      ...formData,
      socialRequirements: {
        requireFollow: formData.socialRequirements.requireFollow,
        requireScreenshot: formData.socialRequirements.requireScreenshot,
        socialLinks: {
          instagram: formData.socialRequirements.instagram,
          youtube: formData.socialRequirements.youtube,
          discord: formData.socialRequirements.discord,
          custom: formData.socialRequirements.custom
        }
      }
    };

    try {
      // Create Tournament & Rules in the backend sequentially via API
      const res = await api.post('/tournaments/enterprise', payload); 
      if (res.success) {
        toast.success('Professional Tournament Framework Built successfully!');
        navigate('/organizer/tournaments');
      }
    } catch (error) {
       console.error(error);
       toast.error(error.response?.data?.message || 'Failed to setup tournament enterprise block.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepper = () => (
    <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-4 custom-scrollbar">
      {['Basic Config', 'Scheduling', 'Scaffolding', 'Finance', 'Review'].map((label, index) => {
        const s = index + 1;
        return (
          <div key={s} className="flex flex-col items-center min-w-[80px] flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${step === s ? 'bg-neon-cyan text-dark-950 scale-110 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : step > s ? 'bg-primary-500 text-white' : 'bg-dark-800 text-dark-400'}`}>
              {step > s ? '✓' : s}
            </div>
            <span className={`text-[10px] mt-2 text-center ${step === s ? 'text-neon-cyan' : 'text-dark-400'}`}>{label}</span>
          </div>
        );
      })}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto pb-20">
        <div className="mb-6">
          <button onClick={() => navigate('/organizer/tournaments')} className="btn-ghost flex items-center gap-2 mb-4 text-xs font-semibold py-1">
            <HiArrowLeft /> Exit Wizard
          </button>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight flex items-center gap-3">
             <span className="bg-gradient-to-r from-neon-cyan to-primary-500 text-transparent bg-clip-text">Enterprise</span>
             Tournament Assembly
          </h1>
          <p className="text-dark-400 text-sm mt-1">Design scalable, multi-stage events with strict compliance and operations engines.</p>
        </div>

        {renderStepper()}

        <form onSubmit={step === 5 ? handleSubmit : (e) => { e.preventDefault(); handleNext(); }} className="space-y-6">
          
          {step === 1 && (
            <div className="card animate-fade-in space-y-6 border border-surface-border">
              <h2 className="text-xl font-semibold text-white border-b border-surface-border pb-3 flex items-center gap-2"><div className="w-2 h-6 bg-neon-cyan rounded-full"></div> Phase 1: Identity & Parameters</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="col-span-2">
                   <label className="text-sm font-bold text-dark-200 block mb-1">Official Tournament Title <span className="text-red-500">*</span></label>
                   <input required type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g. ScrimX Global Championship 2026" className="input-field py-3 text-lg font-semibold" />
                 </div>
                 
                 <div className="col-span-2">
                   <label className="text-sm font-medium text-dark-300 block mb-1">Subtitle / Tagline</label>
                   <input type="text" name="subtitle" value={formData.subtitle} onChange={handleChange} placeholder="e.g. The Ultimate Showdown" className="input-field" />
                 </div>

                 <div className="col-span-2">
                    <label className="text-sm font-medium text-dark-300 block mb-1">Short Description (Max 200 chars)</label>
                    <textarea name="shortDescription" value={formData.shortDescription} onChange={handleChange} maxLength="200" rows="2" className="input-field" />
                 </div>

                 <div>
                    <label className="text-sm font-medium text-dark-300 block mb-1">Game Engine</label>
                    <select name="game" value={formData.game} onChange={handleChange} className="input-field border-dark-600 bg-dark-900">
                       <option value="BGMI">BGMI</option>
                       <option value="PUBG">PUBG Mobile</option>
                    </select>
                 </div>

                 <div>
                    <label className="text-sm font-medium text-dark-300 block mb-1">Format</label>
                    <select name="format" value={formData.format} onChange={handleChange} className="input-field bg-dark-900">
                       <option value="squad">Squad (4v4)</option>
                       <option value="duo">Duo (2v2)</option>
                       <option value="solo">Solo (1v1)</option>
                    </select>
                 </div>

                 <div>
                    <label className="text-sm font-medium text-dark-300 block mb-1">Visibility</label>
                    <select name="visibility" value={formData.visibility} onChange={handleChange} className="input-field bg-dark-900">
                       <option value="Public">Public (Marketplace Listed)</option>
                       <option value="Private">Private (URL Only)</option>
                    </select>
                 </div>

                 {/* Banner Upload — Full Width */}
                 <div className="col-span-2">
                    <label className="text-sm font-medium text-dark-300 block mb-2">Tournament Banner</label>
                    
                    {bannerPreview ? (
                       <div className="relative rounded-xl overflow-hidden border border-surface-border group">
                          <img src={bannerPreview} alt="Banner preview" className="w-full h-40 object-cover" />
                          {bannerUploading && (
                             <div className="absolute inset-0 bg-dark-950/70 flex items-center justify-center">
                                <div className="w-6 h-6 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-white text-sm ml-3">Uploading to CDN...</span>
                             </div>
                          )}
                          {!bannerUploading && (
                             <button type="button" onClick={removeBanner} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <HiOutlineX className="text-sm" />
                             </button>
                          )}
                          {formData.banner && (
                             <div className="absolute bottom-2 left-2 bg-green-500/80 text-white text-[10px] font-bold px-2 py-1 rounded">
                                ✓ Uploaded to CDN
                             </div>
                          )}
                       </div>
                    ) : (
                       <button
                          type="button"
                          onClick={() => bannerInputRef.current?.click()}
                          className="w-full h-36 border-2 border-dashed border-surface-border rounded-xl flex flex-col items-center justify-center gap-2 text-dark-400 hover:border-neon-cyan/50 hover:text-neon-cyan hover:bg-neon-cyan/5 transition-all cursor-pointer"
                       >
                          <HiOutlinePhotograph className="text-4xl" />
                          <span className="text-sm font-medium">Click to upload tournament banner</span>
                          <span className="text-xs">PNG, JPG, WebP — max 5MB · Recommended: 1920×400px</span>
                       </button>
                    )}

                    <input
                       ref={bannerInputRef}
                       type="file"
                       accept="image/png,image/jpeg,image/jpg,image/webp"
                       onChange={handleBannerSelect}
                       className="hidden"
                    />
                 </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card animate-fade-in space-y-6 border border-surface-border">
              <h2 className="text-xl font-semibold text-white border-b border-surface-border pb-3 flex items-center gap-2"><div className="w-2 h-6 bg-primary-500 rounded-full"></div> Phase 2: Operations Timeline</h2>
              <p className="text-dark-400 text-xs">Dates strictly lock functionality in the backend Cron services.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-dark-900 p-5 rounded-xl border border-dark-800">
                 <div>
                    <label className="text-sm font-bold text-neon-cyan block mb-1">Registration Opens <span className="text-red-500">*</span></label>
                    <input type="datetime-local" name="schedule.registrationOpen" value={formData.schedule.registrationOpen} onChange={handleChange} required className="input-field bg-dark-950 border-neon-cyan/30" />
                 </div>
                 <div>
                    <label className="text-sm font-bold text-red-400 block mb-1">Registration Closes <span className="text-red-500">*</span></label>
                    <input type="datetime-local" name="schedule.registrationClose" value={formData.schedule.registrationClose} onChange={handleChange} required className="input-field bg-dark-950 border-red-500/30" />
                 </div>

                 <div className="col-span-2 my-2 border-t border-dark-800"></div>

                 <div>
                    <label className="text-sm font-medium text-dark-300 block mb-1">Check-in Window Opens</label>
                    <input type="datetime-local" name="schedule.checkInOpen" value={formData.schedule.checkInOpen} onChange={handleChange} className="input-field" />
                 </div>
                 <div>
                    <label className="text-sm font-medium text-dark-300 block mb-1">Check-in Closes</label>
                    <input type="datetime-local" name="schedule.checkInClose" value={formData.schedule.checkInClose} onChange={handleChange} className="input-field" />
                 </div>

                 <div className="col-span-2 my-2 border-t border-dark-800"></div>

                 <div className="col-span-2">
                    <label className="text-base font-bold text-purple-400 block mb-1">Match / Stage 1 Start Time <span className="text-red-500">*</span></label>
                    <input type="datetime-local" name="schedule.matchStartDate" value={formData.schedule.matchStartDate} onChange={handleChange} required className="input-field py-3 text-lg border-purple-500/50 bg-dark-950" />
                 </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card animate-fade-in space-y-6 border border-surface-border">
              <h2 className="text-xl font-semibold text-white border-b border-surface-border pb-3 flex items-center gap-2"><div className="w-2 h-6 bg-purple-500 rounded-full"></div> Phase 3: Structural Limits</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <label className="text-lg font-bold text-white block mb-1">Max Teams (Total Slots) <span className="text-red-500">*</span></label>
                    <input type="number" name="participation.maxTeams" value={formData.participation.maxTeams} onChange={handleChange} required min="2" max="10000" className="input-field py-3 font-mono text-xl text-neon-cyan" />
                 </div>
                 <div>
                    <label className="text-lg font-bold text-white block mb-1">Teams Per Group <span className="text-red-500">*</span></label>
                    <input type="number" name="participation.teamsPerGroup" value={formData.participation.teamsPerGroup} onChange={handleChange} required min="2" max="100" className="input-field py-3 font-mono text-xl" />
                 </div>
              </div>

              <div className="p-5 rounded-xl bg-gradient-to-r from-dark-900 to-dark-800 border border-dark-700 flex justify-between items-center text-sm">
                <div>
                  <p className="text-dark-300">Backend Math Generation Preview:</p>
                  <p className="font-bold text-white mt-1">If {formData.participation.maxTeams} teams register into groups of {formData.participation.teamsPerGroup}...</p>
                </div>
                <div className="text-right">
                   <p className="text-3xl font-display font-bold text-neon-cyan">{Math.ceil((formData.participation.maxTeams || 0) / (formData.participation.teamsPerGroup || 1))}</p>
                   <p className="text-xs text-dark-400 uppercase tracking-wider">Total Lobby Groups Created</p>
                </div>
              </div>

            </div>
          )}

          {step === 4 && (
            <div className="card animate-fade-in space-y-6 border border-surface-border">
              <h2 className="text-xl font-semibold text-white border-b border-surface-border pb-3 flex items-center gap-2"><div className="w-2 h-6 bg-green-500 rounded-full"></div> Phase 4: Financial Economics</h2>
              
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-sm font-semibold text-dark-200 block mb-1">Entry Fee</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">₹</span>
                      <input type="number" name="finance.entryFee" value={formData.finance.entryFee} onChange={handleChange} min="0" className="input-field pl-8 font-mono text-lg" />
                    </div>
                 </div>
                 <div>
                    <label className="text-sm font-semibold text-dark-200 block mb-1">Total Prize Pool Declared</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400">₹</span>
                      <input type="number" name="finance.totalPrizePool" value={formData.finance.totalPrizePool} onChange={handleChange} min="0" className="input-field pl-8 font-mono text-lg border-green-500/50" />
                    </div>
                 </div>
                 
                 <div>
                    <label className="text-sm text-dark-300 block mb-1">Payment Mode Verification</label>
                    <select name="finance.paymentMode" value={formData.finance.paymentMode} onChange={handleChange} className="input-field">
                       <option value="manual">Manual Screenshot Verification</option>
                    </select>
                 </div>
                 
                 <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer bg-dark-900 p-3 rounded-lg border border-surface-border hover:bg-dark-800 transition-colors">
                      <input type="checkbox" name="finance.requirePaymentProof" checked={formData.finance.requirePaymentProof} onChange={handleChange} className="w-4 h-4 text-neon-cyan bg-dark-950 border-dark-600 rounded" />
                      <span className="text-sm text-dark-200">Enforce Screenshot Uploads</span>
                    </label>
                 </div>
              </div>

              <div className="p-4 bg-dark-900/50 border border-green-500/20 rounded-xl mt-4">
                 <p className="text-sm text-green-400 font-semibold mb-2"><HiCash className="inline mr-1" /> Dynamic Economic Calculation</p>
                 <div className="flex justify-between text-sm text-dark-300 mb-1">
                   <span>Max Revenue ({formData.participation.maxTeams} slots × ₹{formData.finance.entryFee})</span>
                   <span className="font-mono">₹{(formData.participation.maxTeams || 0) * (formData.finance.entryFee || 0)}</span>
                 </div>
                 <div className="flex justify-between text-sm text-dark-300">
                   <span>Declared Prize Commitment</span>
                   <span className="font-mono text-white">₹{formData.finance.totalPrizePool}</span>
                 </div>
              </div>
            </div>
          )}



          {step === 5 && (
            <div className="card animate-fade-in space-y-6 border border-neon-cyan/50 shadow-[0_0_20px_rgba(34,211,238,0.1)]">
              <h2 className="text-2xl font-bold text-white border-b border-surface-border pb-3 flex items-center gap-2">Final Review & Initialization</h2>
              
              {/* Social Requirements Block */}
              <div className="bg-dark-900 border border-surface-border rounded-xl p-5 mb-4">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <HiOutlineSpeakerphone className="text-neon-cyan" /> Social Requirements (Optional)
                </h3>
                <p className="text-sm text-dark-300 mb-4">Require players to follow your social accounts before registering.</p>
                
                <div className="space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer bg-dark-950 p-3 rounded-lg border border-surface-border hover:bg-dark-800 transition-colors">
                    <input type="checkbox" name="socialRequirements.requireFollow" checked={formData.socialRequirements.requireFollow} onChange={handleChange} className="w-5 h-5 text-neon-cyan bg-dark-950 border-dark-600 rounded" />
                    <div>
                      <span className="text-sm font-bold text-white block">Require players to follow before registration</span>
                      <span className="text-xs text-dark-400">If ON, player must complete verification before joining</span>
                    </div>
                  </label>

                  {formData.socialRequirements.requireFollow && (
                    <div className="pl-8 space-y-4 animate-fade-in">
                      <label className="flex items-center gap-3 cursor-pointer bg-dark-950 p-3 rounded-lg border border-surface-border hover:bg-dark-800 transition-colors">
                        <input type="checkbox" name="socialRequirements.requireScreenshot" checked={formData.socialRequirements.requireScreenshot} onChange={handleChange} className="w-5 h-5 text-neon-cyan bg-dark-950 border-dark-600 rounded" />
                        <div>
                          <span className="text-sm font-bold text-white block">Require Screenshot Proof</span>
                          <span className="text-xs text-dark-400">Players must upload a screenshot as proof of follow</span>
                        </div>
                      </label>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="text-xs font-semibold text-dark-300 block mb-1">Instagram URL</label>
                          <input type="url" name="socialRequirements.instagram" value={formData.socialRequirements.instagram} onChange={handleChange} placeholder="https://instagram.com/yourpage" className="input-field text-sm" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-dark-300 block mb-1">YouTube URL</label>
                          <input type="url" name="socialRequirements.youtube" value={formData.socialRequirements.youtube} onChange={handleChange} placeholder="https://youtube.com/c/yourchannel" className="input-field text-sm" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-dark-300 block mb-1">Discord Invite Link</label>
                          <input type="url" name="socialRequirements.discord" value={formData.socialRequirements.discord} onChange={handleChange} placeholder="https://discord.gg/invite" className="input-field text-sm" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-dark-300 block mb-1">Custom Link</label>
                          <input type="url" name="socialRequirements.custom" value={formData.socialRequirements.custom} onChange={handleChange} placeholder="Any other platform URL" className="input-field text-sm" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm bg-dark-950 p-4 rounded-xl">
                <div className="space-y-2">
                  <p><span className="text-dark-400">Title:</span> <span className="font-semibold text-white">{formData.title || 'UNSET'}</span></p>
                  <p><span className="text-dark-400">Game:</span> <span className="text-neon-cyan">{formData.game} {formData.format.toUpperCase()}</span></p>
                  <p><span className="text-dark-400">Max Teams:</span> <span className="font-mono text-white">{formData.participation.maxTeams}</span></p>
                  <p><span className="text-dark-400">Entry:</span> <span className="text-green-400">₹{formData.finance.entryFee}</span></p>
                </div>
                <div className="space-y-2 border-l border-surface-border pl-4">
                  <p><span className="text-dark-400">Reg Opens:</span> <span className="text-white">{formData.schedule.registrationOpen ? new Date(formData.schedule.registrationOpen).toLocaleString() : 'UNSET'}</span></p>
                  <p><span className="text-dark-400">Match Starts:</span> <span className="text-purple-400 font-semibold">{formData.schedule.matchStartDate ? new Date(formData.schedule.matchStartDate).toLocaleString() : 'UNSET'}</span></p>
                  <p><span className="text-dark-400">Verification:</span> <span className="text-white">{formData.operations.requireVideoProof ? 'STRICT POV' : 'STANDARD'}</span></p>
                </div>
              </div>

              {!formData.title || !formData.schedule.matchStartDate || !formData.schedule.registrationOpen ? (
                 <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl text-sm font-bold flex items-center gap-2">
                    ERROR: Cannot initialize. Missing Title or mandatory Date properties. Go back!
                 </div>
              ) : (
                 <div className="bg-green-500/10 border border-green-500/50 text-green-400 p-4 rounded-xl text-sm font-bold flex items-center gap-2">
                    <HiCheckCircle className="text-xl" /> Architecture Payload Valid. Ready for Draft Creation.
                 </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-6 border-t border-surface-border mt-8">
             {step > 1 ? (
                <button type="button" onClick={handlePrev} className="btn-ghost px-6 py-2">Back to Previous</button>
             ) : <div></div>}
             
             {step < 5 ? (
                <button type="submit" className="btn-primary px-10 border border-neon-cyan/50 shadow-[0_0_10px_rgba(34,211,238,0.2)]">Proceed Forward →</button>
             ) : (
                <button type="submit" disabled={loading || !formData.title || !formData.schedule.matchStartDate} className="btn-neon flex items-center gap-2 px-10 text-lg">
                  {loading ? 'Compiling Architecture...' : 'Save Draft & Compile Backend'}
                </button>
             )}
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default OrganizerCreateTournament;
