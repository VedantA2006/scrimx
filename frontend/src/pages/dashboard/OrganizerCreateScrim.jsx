import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { HiFire, HiInformationCircle, HiLocationMarker, HiCurrencyDollar, HiCheckCircle, HiUpload, HiExclamation } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';
import LoadingButton from '../../components/ui/LoadingButton';

const OrganizerCreateScrim = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [showErrors, setShowErrors] = useState(false);

  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const bannerRef = useRef(null);

  const hasUpiId = !!user?.organizerProfile?.upiId;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    startTime: '',
    endTime: '',
    format: 'squad',
    mode: 'tpp',
    numberOfMatches: 1,
    matches: [{ matchNumber: 1, map: 'Erangel', idpTime: '', startTime: '' }],
    slotCount: 20,
    entryFee: 0,
    organizerCut: 0,
    prizeDistribution: [],
    rules: '',
    visibility: 'public'
  });

  // UX B1 - Unsaved changes warning
  useEffect(() => {
    const isDirty = formData.title || formData.date;
    if (!isDirty) return;
    const handler = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [formData.title, formData.date]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleMatchCountChange = (e) => {
    let count = parseInt(e.target.value) || 1;
    if (count > 10) count = 10;
    if (count < 1) count = 1;
    
    setFormData(prev => {
      const newMatches = [...prev.matches];
      if (count > newMatches.length) {
        for (let i = newMatches.length; i < count; i++) {
          newMatches.push({ matchNumber: i + 1, map: 'Erangel', idpTime: '', startTime: '' });
        }
      } else if (count < newMatches.length) {
        newMatches.splice(count);
      }
      return { ...prev, numberOfMatches: count, matches: newMatches };
    });
  };

  const handleMatchChange = (index, field, value) => {
    setFormData(prev => {
      const newMatches = [...prev.matches];
      newMatches[index] = { ...newMatches[index], [field]: value };
      return { ...prev, matches: newMatches };
    });
  };

  const handleAddPrize = () => {
    if (formData.prizeDistribution.length >= 10) return;
    setFormData(prev => ({
      ...prev,
      prizeDistribution: [...prev.prizeDistribution, { position: prev.prizeDistribution.length + 1, percentage: 0, label: '' }]
    }));
  };

  const handleRemovePrize = (index) => {
    setFormData(prev => {
      const newDist = [...prev.prizeDistribution];
      newDist.splice(index, 1);
      newDist.forEach((p, i) => p.position = i + 1);
      return { ...prev, prizeDistribution: newDist };
    });
  };

  const handlePrizeChange = (index, field, value) => {
    setFormData(prev => {
      const newDist = [...prev.prizeDistribution];
      newDist[index] = { ...newDist[index], [field]: field === 'percentage' ? Number(value) : value };
      return { ...prev, prizeDistribution: newDist };
    });
  };

  const handlePrizePreset = (presetType) => {
    let newDist = [];
    if (presetType === 'top3') {
      newDist = [
        { position: 1, percentage: 50, label: 'Winner' },
        { position: 2, percentage: 30, label: 'Runner Up' },
        { position: 3, percentage: 20, label: '3rd Place' }
      ];
    } else if (presetType === 'top5') {
      newDist = [
        { position: 1, percentage: 40, label: 'Winner' },
        { position: 2, percentage: 25, label: 'Runner Up' },
        { position: 3, percentage: 15, label: '3rd Place' },
        { position: 4, percentage: 10, label: '4th Place' },
        { position: 5, percentage: 10, label: '5th Place' }
      ];
    } else if (presetType === 'winner') {
      newDist = [
        { position: 1, percentage: 100, label: 'Winner Takes All' }
      ];
    }
    setFormData(prev => ({ ...prev, prizeDistribution: newDist }));
  };

  const totalPool = (formData.slotCount || 0) * (formData.entryFee || 0);
  const platformFeeAmount = totalPool * 0.07;
  const organizerCutAmount = totalPool * ((formData.organizerCut || 0) / 100);
  const displayPrizePool = totalPool - platformFeeAmount - organizerCutAmount;
  
  const totalPercentageDistributed = formData.prizeDistribution.reduce((acc, curr) => acc + (curr.percentage || 0), 0);
  const isPrizeValid = totalPercentageDistributed <= 100;

  const handleBannerSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Banner must be under 5MB');
      return;
    }
    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
  };

  const handleNextStep1 = () => {
    setShowErrors(true);
    if (formData.title && formData.date && formData.startTime && formData.endTime) {
      setShowErrors(false);
      setStep(2);
    }
  };

  const handleNextStep2 = () => {
    setShowErrors(true);
    const hasMatchErrors = formData.matches.some(m => !m.idpTime || !m.startTime);
    if (!hasMatchErrors) {
      setShowErrors(false);
      setStep(3);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isPrizeValid) {
      toast.error('Prize distribution cannot exceed 100%');
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      Object.keys(formData).forEach(key => {
        const val = formData[key];
        if (Array.isArray(val)) {
          fd.append(key, JSON.stringify(val));
        } else {
          fd.append(key, val);
        }
      });
      if (bannerFile) fd.append('bannerImage', bannerFile);

      await api.post('/scrims', fd);
      toast.success('Scrim created successfully as Draft');
      navigate('/organizer/scrims');
    } catch (err) {
      toast.error(err.message || 'Failed to create scrim');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-display font-bold text-white mb-2">Create New Scrim</h1>
          <p className="text-dark-400 whitespace-pre-wrap">Fill in the details below to launch your next tournament. The scrim will be saved as a draft first.</p>
        </div>

        {/* Progress Tracker (Clickable to go back) */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex-1 flex items-center gap-2 relative">
              <div 
                onClick={() => { if (s < step) setStep(s); }}
                className={`h-2 rounded-full flex-1 transition-all ${s < step ? 'cursor-pointer hover:opacity-80' : ''} ${step >= s ? 'bg-neon-cyan shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-dark-800'}`} 
              />
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 && (
            <div className="card animate-fade-in space-y-6">
              <h2 className="text-lg font-semibold text-white mb-4 border-b border-surface-border pb-2">Basic Details</h2>

              <div>
                <label className="text-sm font-medium text-dark-300 mb-1.5 block">Scrim Title <span className="text-red-500">*</span></label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g., T3 Practice Scrims" className="input-field" />
                {showErrors && !formData.title && <p className="text-xs text-red-400 mt-1">Title is required</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-dark-300 mb-1.5 block">Banner Image <span className="text-xs font-normal text-dark-500">• 1200×400px recommended</span></label>
                <input type="file" ref={bannerRef} accept="image/*" onChange={handleBannerSelect} className="hidden" />
                <div
                  onClick={() => bannerRef.current?.click()}
                  className="group cursor-pointer border-2 border-dashed border-surface-border hover:border-neon-cyan/50 rounded-xl p-5 text-center transition-all bg-dark-900/50 hover:bg-dark-900"
                >
                  {bannerPreview ? (
                    <div className="flex flex-col items-center gap-2">
                      <img src={bannerPreview} alt="Banner preview" className="w-full h-24 rounded-lg object-cover border border-surface-border" />
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

              <div>
                <label className="text-sm font-medium text-dark-300 mb-1.5 block">Description</label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows="4" placeholder="Full details about the scrim..." className="input-field" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-dark-300 mb-1.5 block">Date <span className="text-red-500">*</span></label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} className="input-field" />
                  {showErrors && !formData.date && <p className="text-xs text-red-400 mt-1">Date is required</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-300 mb-1.5 block">Scrim Start Time <span className="text-red-500">*</span> <span className="text-xs text-dark-500 font-normal">(IST)</span></label>
                  <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="input-field" />
                  {showErrors && !formData.startTime && <p className="text-xs text-red-400 mt-1">Start time is required</p>}
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-300 mb-1.5 block">Scrim End Time <span className="text-red-500">*</span> <span className="text-xs text-dark-500 font-normal">(IST)</span></label>
                  <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="input-field" />
                  <p className="text-[10px] text-dark-500 mt-1">Registration closes at this time</p>
                  {showErrors && !formData.endTime && <p className="text-xs text-red-400 mt-1">End time is required</p>}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button type="button" onClick={handleNextStep1} className="btn-primary">
                  Next: Game Config
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="card animate-fade-in space-y-6">
              <h2 className="text-lg font-semibold text-white mb-4 border-b border-surface-border pb-2">Game Configuration</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-dark-300 mb-1.5 block">Format</label>
                  <select name="format" value={formData.format} onChange={handleChange} className="input-field">
                    <option value="squad">Squad (4v4)</option>
                    <option value="duo">Duo (2v2)</option>
                    <option value="solo">Solo (1v1)</option>
                    <option value="tdm">TDM (4v4)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-300 mb-1.5 block">Mode</label>
                  <select name="mode" value={formData.mode} onChange={handleChange} className="input-field">
                    <option value="tpp">TPP</option>
                    <option value="fpp">FPP</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-dark-300 mb-1.5 block">No. of Matches</label>
                <input type="number" name="numberOfMatches" min="1" max="10" value={formData.numberOfMatches} onChange={handleMatchCountChange} className="input-field" />
              </div>

              <div className="space-y-4">
                {formData.matches.map((match, index) => (
                  <div key={index} className="p-4 rounded-xl bg-dark-900 border border-surface-border">
                    <h3 className="text-sm font-semibold text-white mb-3">Match {match.matchNumber}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs text-dark-400 mb-1 block">Map</label>
                        <select value={match.map} onChange={(e) => handleMatchChange(index, 'map', e.target.value)} className="input-field py-2 text-sm">
                          <option value="Erangel">Erangel</option>
                          <option value="Miramar">Miramar</option>
                          <option value="Sanhok">Sanhok</option>
                          <option value="Vikendi">Vikendi</option>
                          <option value="Rondo">Rondo</option>
                          <option value="Livik">Livik</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-dark-400 mb-1 block">IDP Time <span className="text-red-500">*</span></label>
                        <input type="time" value={match.idpTime} onChange={(e) => handleMatchChange(index, 'idpTime', e.target.value)} className="input-field py-2 text-sm" />
                        {showErrors && !match.idpTime && <p className="text-xs text-red-400 mt-1">Required</p>}
                      </div>
                      <div>
                        <label className="text-xs text-dark-400 mb-1 block">Start Time <span className="text-red-500">*</span></label>
                        <input type="time" value={match.startTime} onChange={(e) => handleMatchChange(index, 'startTime', e.target.value)} className="input-field py-2 text-sm" />
                        {showErrors && !match.startTime && <p className="text-xs text-red-400 mt-1">Required</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between pt-4 border-t border-surface-border">
                <button type="button" onClick={() => setStep(1)} className="btn-ghost">Back</button>
                <button type="button" onClick={handleNextStep2} className="btn-primary">
                  Next: Slots & Finance
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="card animate-fade-in space-y-6">
              <h2 className="text-lg font-semibold text-white mb-4 border-b border-surface-border pb-2">Slots & Finance</h2>

              <div>
                <label className="text-sm font-medium text-dark-300 mb-1.5 block">Total Team Slots <span className="text-red-500">*</span></label>
                <input type="number" name="slotCount" min="2" max="100" value={formData.slotCount} onChange={handleChange} className="input-field" />
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-primary-900/40 to-dark-800 border border-primary-500/30">
                <div className="flex items-start gap-3">
                  <HiCurrencyDollar className="text-2xl text-neon-cyan mt-0.5" />
                  <div className="flex-1 grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-dark-300 mb-1.5 block">Entry Fee (₹)</label>
                      <input type="number" name="entryFee" min="0" value={formData.entryFee} onChange={handleChange} className="input-field bg-dark-950" />
                      <p className="text-xs text-dark-400 mt-1">Set 0 for free scrims</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-dark-300 mb-1.5 block">Organizer Cut (%)</label>
                      <input type="number" name="organizerCut" min="0" max="93" value={formData.organizerCut} onChange={handleChange} className="input-field bg-dark-950" />
                    </div>
                  </div>
                </div>
                
                {formData.entryFee > 0 && !hasUpiId && (
                  <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start gap-2">
                    <HiExclamation className="text-amber-500 text-lg shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-amber-400 font-medium">You haven't set a UPI ID</p>
                      <p className="text-xs text-amber-400/80 mb-2">Players won't be able to pay entry fees without a UPI ID in your profile.</p>
                      <Link to="/organizer/profile" className="text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors">Set UPI ID →</Link>
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-surface-border/50 text-sm">
                  <p className="text-dark-400 mb-3 font-medium">💰 Economics Breakdown <span className="text-xs font-normal">(based on full registration)</span></p>
                  
                  <div className="flex justify-between mb-1.5 text-dark-300">
                    <span>Total Collection ({formData.slotCount} slots × ₹{formData.entryFee})</span>
                    <span className="font-semibold">₹{totalPool.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between mb-1.5 text-red-400/80">
                    <span>↳ Platform Fee (7%)</span>
                    <span>-₹{platformFeeAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between mb-1.5 text-orange-400/80">
                    <span>↳ Your Organizer Cut ({formData.organizerCut || 0}%)</span>
                    <span>-₹{organizerCutAmount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-neon-cyan pt-2 mt-2 border-t border-surface-border text-base">
                    <span>= Prize Pool</span>
                    <span>₹{Math.max(0, displayPrizePool).toLocaleString()}</span>
                  </div>
                  <p className="text-[10px] text-dark-500 mt-1.5">↑ Prize distribution % below is applied to this amount</p>
                </div>

                <div className="mt-6 pt-6 border-t border-surface-border/50">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-white block">Prize Pool Distribution</label>
                    {formData.prizeDistribution.length < 10 && (
                      <button type="button" onClick={handleAddPrize} className="text-xs btn-ghost py-1 px-3">
                        + Add Position
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-dark-500 mb-3">Distribute the prize pool (₹{Math.max(0, displayPrizePool).toLocaleString()}) among winners by percentage. Max 10 positions.</p>
                
                  {/* Quick Fill Presets */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <button type="button" onClick={() => handlePrizePreset('top3')} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-dark-800 hover:bg-dark-700 text-dark-300 transition-colors">Top 3 Split</button>
                    <button type="button" onClick={() => handlePrizePreset('top5')} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-dark-800 hover:bg-dark-700 text-dark-300 transition-colors">Top 5 Split</button>
                    <button type="button" onClick={() => handlePrizePreset('winner')} className="text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded bg-dark-800 hover:bg-dark-700 text-dark-300 transition-colors">Winner Takes All</button>
                  </div>

                  {formData.prizeDistribution.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      {formData.prizeDistribution.map((prize, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <div className="w-14">
                            <input type="text" value={`#${prize.position}`} disabled className="input-field bg-dark-900 border-none text-center" />
                          </div>
                          <div className="flex-1">
                            <input type="text" placeholder="e.g. Champion" value={prize.label} onChange={(e) => handlePrizeChange(idx, 'label', e.target.value)} className="input-field" />
                          </div>
                          <div className="w-24 relative">
                            <input type="number" min="0" max="100" value={prize.percentage} onChange={(e) => handlePrizeChange(idx, 'percentage', e.target.value)} className="input-field pr-8 text-right" />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 text-sm font-bold">%</span>
                          </div>
                          <div className="w-24 text-right">
                            <span className="text-xs text-neon-cyan font-semibold">
                              {formData.entryFee > 0 ? `≈ ₹${Math.round(displayPrizePool * ((prize.percentage || 0) / 100)).toLocaleString()}` : '—'}
                            </span>
                          </div>
                          <button type="button" onClick={() => handleRemovePrize(idx)} className="text-red-500 hover:text-red-400 font-bold p-2 transition-colors">
                            ✕
                          </button>
                        </div>
                      ))}
                      
                      {formData.entryFee === 0 && (
                        <p className="text-xs text-dark-400 italic px-2 mt-2">Set an entry fee to preview prize amounts.</p>
                      )}

                      <div className={`text-sm flex justify-between px-2 pt-3 mt-2 border-t border-surface-border/30 ${!isPrizeValid ? 'text-red-400' : 'text-dark-300'}`}>
                        <span>Total Allocated:</span>
                        <span className="font-bold">{totalPercentageDistributed}% / 100%</span>
                      </div>
                      <div className="text-xs text-dark-500 px-2 flex justify-between">
                        <span>Estimated payout (if all slots fill):</span>
                        <span className="font-semibold">₹{Math.round(displayPrizePool * (totalPercentageDistributed / 100)).toLocaleString()}</span>
                      </div>
                      {totalPercentageDistributed < 100 && totalPercentageDistributed > 0 && (
                        <p className="text-xs text-yellow-400/80 mt-1 px-2">⚠ {100 - totalPercentageDistributed}% of the prize pool remains unallocated.</p>
                      )}
                      {!isPrizeValid && (
                        <p className="text-xs text-red-400 mt-1 px-2">Total percentage cannot exceed 100%.</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-dark-400 italic">No distribution added. Prize pool will be displayed as a total.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-dark-300 mb-1.5 block">Visibility</label>
                <select name="visibility" value={formData.visibility} onChange={handleChange} className="input-field">
                  <option value="public">Public (Visible in Marketplace)</option>
                  <option value="unlisted">Unlisted (Link only)</option>
                  <option value="private">Private (Invite only)</option>
                </select>
              </div>

              <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/30">
                <p className="text-sm text-orange-400 font-semibold mb-1">Hosting Points Required</p>
                <p className="text-xs text-orange-400/80">Saving this draft is free. However, Publishing this scrim publicly from your dashboard will permanently deduct exactly <strong>30 points</strong> from your Organizer Wallet.</p>
              </div>

              <div className="flex justify-between pt-4 border-t border-surface-border">
                <button type="button" onClick={() => setStep(2)} className="btn-ghost">Back</button>
                <LoadingButton type="submit" variant="primary" loading={loading}>
                  Create Scrim as Draft
                </LoadingButton>
              </div>
            </div>
          )}
        </form>
      </div>
    </DashboardLayout>
  );
};

export default OrganizerCreateScrim;
