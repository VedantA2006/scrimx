import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import { HiCheck, HiX, HiLightningBolt, HiSparkles, HiChartBar, HiPhotograph, HiPaperAirplane, HiClock, HiFire } from 'react-icons/hi';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';

const ELITE_PRICE = 999;

const freeFeatures = [
  { text: 'Create & host scrims', included: true },
  { text: 'Basic organizer profile', included: true },
  { text: 'Standard listing position', included: true },
  { text: 'Featured placement', included: false },
  { text: 'Priority in marketplace', included: false },
  { text: 'Analytics dashboard', included: false },
  { text: 'Elite badge on scrims', included: false },
  { text: 'Premium storefront styling', included: false },
  { text: 'Email notification alerts', included: false },
];

const eliteFeatures = [
  { text: 'Everything in Free', included: true },
  { text: 'Elite badge on scrims & profile', included: true },
  { text: 'Higher ranking in all listings', included: true },
  { text: 'Access to Featured section', included: true },
  { text: 'Priority in "Starting Soon"', included: true },
  { text: 'Full analytics dashboard', included: true },
  { text: 'Premium storefront (banner, styling)', included: true },
  { text: 'Better visibility across platform', included: true },
  { text: 'Email notification alerts', included: true },
];

const OrganizerPlans = () => {
  const { user, refreshUser } = useAuth();
  const [planData, setPlanData] = useState({ plan: 'free', subscription: null });
  const [adminUpiId, setAdminUpiId] = useState('');
  const [loading, setLoading] = useState(true);
  const [myRequests, setMyRequests] = useState([]);
  
  // Modal State
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({ message: '', contactInfo: '', utr: '' });
  const [files, setFiles] = useState([]);
  const fileInputRef = useRef(null);

  // Boost Modal State
  const [boostModalOpen, setBoostModalOpen] = useState(false);
  const [boostSubmitting, setBoostSubmitting] = useState(false);
  const [boostData, setBoostData] = useState({ itemType: 'scrim', itemId: '', duration: '1day', utr: '', contactInfo: '' });
  const [boostFiles, setBoostFiles] = useState([]);
  const boostFileInputRef = useRef(null);
  
  const [myEvents, setMyEvents] = useState({ scrims: [], tournaments: [] });

  useEffect(() => {
    fetchPlanData();
  }, []);

  const fetchPlanData = async () => {
    try {
      const [planRes, reqsRes, settingsRes, scrimsRes, tourneysRes] = await Promise.all([
        api.get('/plans/current'),
        api.get('/plans/requests/my'),
        api.get('/settings/payment'),
        api.get('/scrims/manage/my').catch(() => ({ data: [] })),
        api.get('/tournaments/my-tournaments').catch(() => ({ tournaments: [] }))
      ]);
      setPlanData({ plan: planRes.plan, subscription: planRes.subscription });
      setMyRequests(reqsRes.requests || []);
      if (settingsRes.success && settingsRes.data?.upiId) {
        setAdminUpiId(settingsRes.data.upiId);
      }
      
      const scrims = Array.isArray(scrimsRes.scrims) ? scrimsRes.scrims : (Array.isArray(scrimsRes.data) ? scrimsRes.data : []);
      const tournaments = Array.isArray(tourneysRes.tournaments) ? tourneysRes.tournaments : (Array.isArray(tourneysRes.data) ? tourneysRes.data : []);
      setMyEvents({ scrims, tournaments });
      
    } catch (err) {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length + files.length > 5) {
      toast.error('Maximum 5 files allowed');
      return;
    }
    setFiles(prev => [...prev, ...selected]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const submitRequest = async (e) => {
    e.preventDefault();
    if (!formData.utr || !/^[A-Z0-9]{12}$/i.test(formData.utr)) {
      toast.error('UTR must be exactly 12 alphanumeric characters');
      return;
    }

    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('requestedPlan', 'elite');
      data.append('message', formData.message);
      data.append('contactInfo', formData.contactInfo);
      data.append('utr', formData.utr);
      files.forEach(f => data.append('attachments', f));

      await api.post('/plans/request-upgrade', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Upgrade request submitted successfully!');
      setRequestModalOpen(false);
      setFormData({ message: '', contactInfo: '', utr: '' });
      setFiles([]);
      fetchPlanData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBoostFileChange = (e) => {
    const selected = Array.from(e.target.files);
    if (selected.length + boostFiles.length > 2) {
      toast.error('Maximum 2 files allowed');
      return;
    }
    setBoostFiles(prev => [...prev, ...selected]);
  };

  const removeBoostFile = (index) => {
    setBoostFiles(prev => prev.filter((_, i) => i !== index));
  };

  const submitBoostRequest = async (e) => {
    e.preventDefault();
    if (!boostData.itemId) return toast.error('Please select an item to boost');
    if (!boostData.utr || !/^[A-Z0-9]{12}$/i.test(boostData.utr)) {
      toast.error('UTR must be exactly 12 alphanumeric characters');
      return;
    }

    setBoostSubmitting(true);
    try {
      const data = new FormData();
      data.append('itemType', boostData.itemType);
      data.append('itemId', boostData.itemId);
      data.append('duration', boostData.duration);
      data.append('contactInfo', boostData.contactInfo);
      data.append('utr', boostData.utr);
      boostFiles.forEach(f => data.append('attachments', f));

      await api.post('/boosts/request', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      toast.success('Boost request submitted successfully!');
      setBoostModalOpen(false);
      setBoostData({ itemType: 'scrim', itemId: '', duration: '1day', utr: '', contactInfo: '' });
      setBoostFiles([]);
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to submit boost request');
    } finally {
      setBoostSubmitting(false);
    }
  };

  const getBoostPrice = () => {
    if (boostData.duration === '1day') return 99;
    if (boostData.duration === '3day') return 249;
    if (boostData.duration === '7day') return 499;
    return 99;
  };

  const isElite = planData.plan === 'elite';
  const subEndDate = planData.subscription?.endDate ? new Date(planData.subscription.endDate) : null;
  const daysRemaining = subEndDate ? Math.max(0, Math.ceil((subEndDate - new Date()) / (1000 * 60 * 60 * 24))) : 0;
  
  const pendingRequest = myRequests.find(r => r.status === 'pending');

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold text-white">
            Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-primary-500">Plan</span>
          </h1>
          <p className="text-dark-400 mt-2">Unlock powerful features to grow your scrims and dominate the marketplace.</p>
        </div>

        {/* Current Plan Status */}
        {isElite && (
          <div className="bg-gradient-to-r from-neon-cyan/5 via-primary-600/5 to-neon-purple/5 border border-neon-cyan/20 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan to-primary-600 flex items-center justify-center">
                <HiLightningBolt className="text-white text-2xl" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">Elite Organizer</h3>
                  <Badge variant="neon" size="sm">ACTIVE</Badge>
                </div>
                <p className="text-sm text-dark-400 mt-0.5">
                  {daysRemaining > 0 
                    ? `${daysRemaining} days remaining • Renews ${subEndDate?.toLocaleDateString()}`
                    : 'Your subscription has expired.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Pending Request Alert */}
        {pendingRequest && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
              <HiClock className="text-xl text-yellow-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-yellow-400">Upgrade Request Pending</h4>
              <p className="text-xs text-dark-300">Your request is being reviewed by an admin. We'll update you soon.</p>
            </div>
          </div>
        )}

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* FREE Plan */}
          <div className={`relative rounded-2xl border p-6 flex flex-col ${
            !isElite ? 'border-neon-cyan/30 bg-dark-900 ring-1 ring-neon-cyan/20' : 'border-surface-border bg-dark-900/50'
          }`}>
            {!isElite && (
              <div className="absolute -top-3 left-6">
                <span className="bg-dark-800 border border-surface-border text-dark-300 text-xs font-bold px-3 py-1 rounded-full">
                  CURRENT PLAN
                </span>
              </div>
            )}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white">Free</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-display font-black text-white">₹0</span>
                <span className="text-dark-400 text-sm">/month</span>
              </div>
              <p className="text-dark-400 text-sm mt-2">Get started with basic scrim hosting.</p>
            </div>
            <div className="space-y-3 flex-1">
              {freeFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  {f.included ? <HiCheck className="text-green-400 flex-shrink-0" /> : <HiX className="text-dark-600 flex-shrink-0" />}
                  <span className={`text-sm ${f.included ? 'text-dark-200' : 'text-dark-500'}`}>{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ELITE Plan */}
          <div className={`relative rounded-2xl border p-6 flex flex-col overflow-hidden ${
            isElite ? 'border-neon-cyan/30 bg-dark-900 ring-1 ring-neon-cyan/20' : 'border-surface-border bg-dark-900/50'
          }`}>
            <div className="absolute top-0 right-0 w-40 h-40 bg-neon-cyan/5 rounded-full blur-3xl pointer-events-none" />
            {isElite ? (
              <div className="absolute -top-3 left-6">
                <span className="bg-gradient-to-r from-neon-cyan to-primary-600 text-dark-950 text-xs font-bold px-3 py-1 rounded-full">
                  CURRENT PLAN
                </span>
              </div>
            ) : (
              <div className="absolute -top-3 left-6">
                <span className="bg-gradient-to-r from-neon-cyan to-primary-600 text-dark-950 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <HiSparkles /> RECOMMENDED
                </span>
              </div>
            )}
            
            <div className="mb-6 relative z-10">
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-bold text-white">Elite Organizer</h3>
                <HiLightningBolt className="text-neon-cyan text-xl" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-4xl font-display font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-primary-500">₹{ELITE_PRICE}</span>
                <span className="text-dark-400 text-sm">/month</span>
              </div>
              <p className="text-dark-400 text-sm mt-2">Everything you need to dominate the marketplace.</p>
            </div>

            <div className="space-y-3 flex-1 relative z-10">
              {eliteFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <HiCheck className="text-neon-cyan flex-shrink-0" />
                  <span className="text-sm text-dark-200">{f.text}</span>
                </div>
              ))}
            </div>

            <div className="mt-6 relative z-10">
              {isElite ? (
                <button disabled className="w-full py-3 rounded-xl bg-neon-cyan/10 text-neon-cyan text-sm font-bold border border-neon-cyan/20 cursor-default">
                  ✓ Active Plan
                </button>
              ) : pendingRequest ? (
                <button disabled className="w-full py-3 rounded-xl bg-yellow-500/10 text-yellow-400 text-sm font-bold border border-yellow-500/20 cursor-default flex items-center justify-center gap-2">
                  <HiClock /> Request Pending
                </button>
              ) : (
                <button 
                  onClick={() => setRequestModalOpen(true)}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-neon-cyan to-primary-600 text-dark-950 text-sm font-bold hover:shadow-lg hover:shadow-neon-cyan/20 transition-all"
                >
                  Request Upgrade
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Boost Section */}
        <div className="relative rounded-2xl border border-orange-500/30 bg-gradient-to-br from-dark-900 to-orange-950/20 p-8 overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-orange-500/20 transition-all duration-500" />
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <HiFire className="text-3xl text-orange-500" />
                <h3 className="text-2xl font-bold text-white">Boost Your Scrim / Tournament</h3>
              </div>
              <p className="text-dark-300 max-w-lg text-sm">
                Get your event in front of thousands of players. Featured items appear in the glowing marquee on the homepage and rank higher in search results.
              </p>
              <div className="mt-4 flex gap-3 text-xs">
                <span className="bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full border border-orange-500/20">1 Day: ₹99</span>
                <span className="bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full border border-orange-500/20">3 Days: ₹249</span>
                <span className="bg-orange-500/10 text-orange-400 px-3 py-1 rounded-full border border-orange-500/20">7 Days: ₹499</span>
              </div>
            </div>
            <button 
              onClick={() => setBoostModalOpen(true)}
              className="w-full md:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold hover:shadow-[0_0_20px_rgba(249,115,22,0.4)] transition-all flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <HiFire className="text-xl" /> Ignite Event
            </button>
          </div>
        </div>

        {/* Feature Comparison */}
        <div className="card">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <HiChartBar className="text-neon-cyan" /> Feature Comparison
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-border">
                  <th className="p-4 text-sm font-semibold text-dark-400">Feature</th>
                  <th className="p-4 text-sm font-semibold text-dark-400 text-center">Free</th>
                  <th className="p-4 text-sm font-semibold text-center">
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-primary-500 font-bold">Elite</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {[
                  { feature: 'Create Scrims', free: true, elite: true },
                  { feature: 'Featured Placement', free: false, elite: true },
                  { feature: 'Priority Rankings', free: false, elite: true },
                  { feature: 'Premium Storefront', free: false, elite: true },
                ].map((row, i) => (
                  <tr key={i} className="hover:bg-dark-800/30 transition-colors">
                    <td className="p-4 text-sm text-white">{row.feature}</td>
                    <td className="p-4 text-center">{row.free ? <HiCheck className="text-green-400 mx-auto" /> : <HiX className="text-dark-600 mx-auto" />}</td>
                    <td className="p-4 text-center"><HiCheck className="text-neon-cyan mx-auto" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Upgrade Request Modal */}
      <Modal isOpen={requestModalOpen} onClose={() => !submitting && setRequestModalOpen(false)} title="Request Elite Upgrade">
        <form onSubmit={submitRequest} className="space-y-4">
          {adminUpiId ? (
            <div className="bg-dark-900 border border-surface-border rounded-xl p-4 text-center shadow-lg">
              <p className="text-xs text-white font-medium mb-3">Scan QR to Pay <span className="text-neon-cyan font-bold">₹{ELITE_PRICE}</span></p>
              <div className="bg-white p-3 rounded-xl inline-block mx-auto mb-3">
                <QRCode 
                  value={`upi://pay?pa=${adminUpiId}&pn=ScrimX&am=${ELITE_PRICE}&cu=INR`} 
                  size={120} 
                />
              </div>
              <p className="text-xs text-dark-400">or pay directly to UPI ID:</p>
              <div className="mt-1 font-mono text-neon-cyan font-bold tracking-wider flex items-center justify-center gap-2">
                {adminUpiId}
                <button type="button" onClick={() => { navigator.clipboard.writeText(adminUpiId); toast.success('UPI ID Copied!'); }} className="text-white hover:text-neon-cyan px-2 py-1 bg-dark-800 rounded text-xs ml-2">Copy</button>
              </div>
            </div>
          ) : (
            <div className="bg-dark-900 border border-orange-500/30 rounded-xl p-4 text-center">
              <p className="text-sm text-orange-400">Platform Payment Settings not configured.</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-dark-300 mb-1 block">
              UTR Number <span className="text-red-400">*</span>
              <span className="ml-2 text-xs text-dark-500 font-normal">(12-digit UPI Transaction Reference)</span>
            </label>
            <input
              type="text"
              value={formData.utr}
              onChange={e => setFormData({ ...formData, utr: e.target.value.toUpperCase() })}
              className={`input-field font-mono tracking-widest ${
                formData.utr && !/^[A-Z0-9]{12}$/i.test(formData.utr) ? 'border-red-500/50' : ''
              }`}
              placeholder="e.g. 123456789012"
              maxLength={12}
              required
            />
            {formData.utr && !/^[A-Z0-9]{12}$/i.test(formData.utr) && (
              <p className="text-xs text-red-400 mt-1">Must be exactly 12 alphanumeric characters ({formData.utr.length}/12)</p>
            )}
            {formData.utr && /^[A-Z0-9]{12}$/i.test(formData.utr) && (
              <p className="text-xs text-green-400 mt-1">✓ Valid UTR</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Payment Proof (Optional)</label>
            <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            
            <div className="flex flex-wrap gap-2 mb-2">
              {files.map((file, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-lg border border-surface-border overflow-hidden group">
                  <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeFile(idx)} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <HiX />
                  </button>
                </div>
              ))}
              {files.length < 5 && (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-lg border border-dashed border-dark-600 flex flex-col items-center justify-center text-dark-400 hover:text-neon-cyan hover:border-neon-cyan transition-colors">
                  <HiPhotograph className="text-xl mb-1" />
                  <span className="text-[10px]">Add</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">WhatsApp / Contact Number *</label>
            <input
              type="text"
              required
              value={formData.contactInfo}
              onChange={e => setFormData({ ...formData, contactInfo: e.target.value })}
              className="input-field"
              placeholder="+91..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Message (Optional)</label>
            <textarea
              value={formData.message}
              onChange={e => setFormData({ ...formData, message: e.target.value })}
              className="input-field"
              placeholder="Any details about the payment (e.g. Transaction ID, UPI Name)..."
              rows={2}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setRequestModalOpen(false)} disabled={submitting} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={submitting || !formData.contactInfo || !formData.utr} className="btn-neon flex-1 flex items-center justify-center gap-2">
              {submitting ? 'Submitting...' : <><HiPaperAirplane className="rotate-90" /> Submit Request</>}
            </button>
          </div>
        </form>
      </Modal>

      {/* Boost Event Modal */}
      <Modal isOpen={boostModalOpen} onClose={() => !boostSubmitting && setBoostModalOpen(false)} title="Ignite Your Event">
        <form onSubmit={submitBoostRequest} className="space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-dark-300 mb-1 block">Item Type</label>
              <select 
                value={boostData.itemType} 
                onChange={(e) => {
                  setBoostData({ ...boostData, itemType: e.target.value, itemId: '' });
                }} 
                className="input-field w-full"
              >
                <option value="scrim">Scrim</option>
                <option value="tournament">Tournament</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-dark-300 mb-1 block">Duration</label>
              <select 
                value={boostData.duration} 
                onChange={(e) => setBoostData({ ...boostData, duration: e.target.value })} 
                className="input-field w-full"
              >
                <option value="1day">1 Day (₹99)</option>
                <option value="3day">3 Days (₹249)</option>
                <option value="7day">7 Days (₹499)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-dark-300 mb-1 block">Select Event</label>
            <select 
              value={boostData.itemId} 
              onChange={(e) => setBoostData({ ...boostData, itemId: e.target.value })} 
              className="input-field w-full"
              required
            >
              <option value="">-- Choose an Event to Boost --</option>
              {boostData.itemType === 'scrim' && myEvents.scrims.map(s => (
                <option key={s._id} value={s._id}>{s.title} ({s.status})</option>
              ))}
              {boostData.itemType === 'tournament' && myEvents.tournaments.map(t => (
                <option key={t._id} value={t._id}>{t.title} ({t.status})</option>
              ))}
            </select>
            {boostData.itemType === 'scrim' && myEvents.scrims.length === 0 && <p className="text-xs text-red-400 mt-1">No scrims found.</p>}
            {boostData.itemType === 'tournament' && myEvents.tournaments.length === 0 && <p className="text-xs text-red-400 mt-1">No tournaments found.</p>}
          </div>

          {adminUpiId ? (
            <div className="bg-dark-900 border border-surface-border rounded-xl p-4 text-center shadow-lg mt-2">
              <p className="text-xs text-white font-medium mb-3">Scan QR to Pay <span className="text-orange-500 font-bold">₹{getBoostPrice()}</span></p>
              <div className="bg-white p-3 rounded-xl inline-block mx-auto mb-3">
                <QRCode 
                  value={`upi://pay?pa=${adminUpiId}&pn=ScrimX&am=${getBoostPrice()}&cu=INR`} 
                  size={120} 
                />
              </div>
              <p className="text-xs text-dark-400">or pay directly to UPI ID:</p>
              <div className="mt-1 font-mono text-orange-500 font-bold tracking-wider flex items-center justify-center gap-2">
                {adminUpiId}
                <button type="button" onClick={() => { navigator.clipboard.writeText(adminUpiId); toast.success('UPI ID Copied!'); }} className="text-white hover:text-orange-500 px-2 py-1 bg-dark-800 rounded text-xs ml-2">Copy</button>
              </div>
            </div>
          ) : (
            <div className="bg-dark-900 border border-orange-500/30 rounded-xl p-4 text-center">
              <p className="text-sm text-orange-400">Platform Payment Settings not configured.</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-dark-300 mb-1 block">
              UTR Number <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={boostData.utr}
              onChange={e => setBoostData({ ...boostData, utr: e.target.value.toUpperCase() })}
              className={`input-field font-mono tracking-widest ${
                boostData.utr && !/^[A-Z0-9]{12}$/i.test(boostData.utr) ? 'border-red-500/50' : ''
              }`}
              placeholder="e.g. 123456789012"
              maxLength={12}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">Payment Proof (Optional)</label>
            <input type="file" multiple accept="image/*" ref={boostFileInputRef} onChange={handleBoostFileChange} className="hidden" />
            
            <div className="flex flex-wrap gap-2 mb-2">
              {boostFiles.map((file, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-lg border border-surface-border overflow-hidden group">
                  <img src={URL.createObjectURL(file)} alt="preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => removeBoostFile(idx)} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <HiX />
                  </button>
                </div>
              ))}
              {boostFiles.length < 2 && (
                <button type="button" onClick={() => boostFileInputRef.current?.click()} className="w-16 h-16 rounded-lg border border-dashed border-dark-600 flex flex-col items-center justify-center text-dark-400 hover:text-orange-500 hover:border-orange-500 transition-colors">
                  <HiPhotograph className="text-xl mb-1" />
                  <span className="text-[10px]">Add</span>
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-1.5">WhatsApp / Contact Number *</label>
            <input
              type="text"
              required
              value={boostData.contactInfo}
              onChange={e => setBoostData({ ...boostData, contactInfo: e.target.value })}
              className="input-field"
              placeholder="+91..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setBoostModalOpen(false)} disabled={boostSubmitting} className="btn-ghost flex-1">Cancel</button>
            <button type="submit" disabled={boostSubmitting || !boostData.contactInfo || !boostData.utr || !boostData.itemId} className="px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold flex-1 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed">
              {boostSubmitting ? 'Submitting...' : <><HiFire /> Request Boost</>}
            </button>
          </div>
        </form>
      </Modal>

    </DashboardLayout>
  );
};

export default OrganizerPlans;
