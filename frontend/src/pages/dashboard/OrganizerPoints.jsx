import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/ui/Loader';
import { HiLightningBolt, HiDocumentAdd, HiCurrencyDollar, HiInformationCircle, HiStar, HiCheckCircle } from 'react-icons/hi';
import Badge from '../../components/ui/Badge';
import QRCode from 'react-qr-code';

const OrganizerPoints = () => {
  const [data, setData] = useState({ tierInfo: {}, wallet: {}, transactions: [], pendingRequests: [], scrimCost: 30, totalScrimsHosted: 0, totalPlayersHosted: 0 });
  const [adminUpiId, setAdminUpiId] = useState('');
  const [loading, setLoading] = useState(true);
  const [requestModal, setRequestModal] = useState(false);
  const [formData, setFormData] = useState({ requestedPoints: '', price: '', utr: '', message: '' });
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchWallet = async () => {
    try {
      const [walletRes, settingsRes] = await Promise.all([
        api.get('/points/wallet'),
        api.get('/settings/payment')
      ]);
      setData(walletRes);
      if (settingsRes.success && settingsRes.data?.upiId) {
        setAdminUpiId(settingsRes.data.upiId);
      }
    } catch (err) {
      toast.error('Failed to load points wallet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();
  }, []);

  const handleRequestSubmit = async (e) => {
    e.preventDefault();
    if (!formData.requestedPoints || formData.requestedPoints <= 0) return toast.error('Please select a plan');
    if (!formData.utr || !/^[A-Z0-9]{12}$/i.test(formData.utr)) return toast.error('UTR must be exactly 12 alphanumeric characters');
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('requestedPoints', formData.requestedPoints);
      fd.append('utr', formData.utr);
      fd.append('message', formData.message || '');
      if (attachment) fd.append('attachment', attachment);

      await api.post('/points/request', fd);
      toast.success('Point request sent to admin!');
      setRequestModal(false);
      setFormData({ requestedPoints: '', price: '', utr: '', message: '' });
      setAttachment(null);
      fetchWallet();
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <DashboardLayout><div className="flex justify-center p-12"><Loader /></div></DashboardLayout>;

  const { wallet, transactions, pendingRequests, scrimCost } = data;
  const balance = wallet?.balance || 0;
  const scrimsPossible = Math.floor(balance / scrimCost);

  return (
    <DashboardLayout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-display font-bold text-white mb-2">Organizer Points & Tier</h1>
          <p className="text-dark-400">Manage your hosting points and track your platform tier progression.</p>
        </div>
      </div>

      {/* Organizer Tier Card */}
      {data.tierInfo && (
        <div className="card mb-8 bg-gradient-to-br from-dark-900 to-dark-950 border border-surface-border">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500/20 to-neon-purple/20 flex items-center justify-center border border-primary-500/30">
                  <HiStar className="text-2xl text-neon-cyan" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    {data.tierInfo.label}
                    {data.tierInfo.tier === 'super' && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold uppercase border border-red-500/30">Override</span>}
                  </h2>
                  <p className="text-sm text-neon-cyan font-bold">{data.tierInfo.revenueShare}% Revenue Share</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="bg-dark-850 rounded-lg p-3 border border-surface-border/50">
                  <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Scrim Cost</p>
                  <p className="font-bold text-white">{data.tierInfo.creditLimitOverride ? 'Free (Super)' : `${data.tierInfo.scrimCost} pts`}</p>
                </div>
                <div className="bg-dark-850 rounded-lg p-3 border border-surface-border/50">
                  <p className="text-xs text-dark-400 uppercase tracking-wider mb-1">Abilities</p>
                  <div className="flex flex-col gap-1 text-xs">
                    <span className={data.tierInfo.canHighlight ? 'text-green-400' : 'text-dark-500 opacity-50'}>{data.tierInfo.canHighlight ? '✓' : '×'} Highlight ({data.tierInfo.highlightCost}pts)</span>
                    <span className={data.tierInfo.canPromote ? 'text-green-400' : 'text-dark-500 opacity-50'}>{data.tierInfo.canPromote ? '✓' : '×'} Promote ({data.tierInfo.promoteCost}pts)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Progression */}
            {data.tierInfo.tier !== 'super' && data.tierInfo.tier !== 'pro' && data.tierInfo.tier !== 'elite' && (
              <div className="flex-1 lg:border-l lg:border-surface-border lg:pl-8 flex flex-col justify-center">
                <h3 className="text-sm font-bold text-white mb-4">Progression to Next Tier</h3>
                
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-dark-300">Scrims Hosted</span>
                      <span className="text-neon-cyan">{data.totalScrimsHosted} / {data.tierInfo.tier === 'starter' ? 50 : 200}</span>
                    </div>
                    <div className="w-full bg-dark-800 rounded-full h-1.5">
                      <div className="bg-neon-cyan h-1.5 rounded-full" style={{ width: `${Math.min(100, (data.totalScrimsHosted / (data.tierInfo.tier === 'starter' ? 50 : 200)) * 100)}%` }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-dark-300">Players Hosted</span>
                      <span className="text-neon-cyan">{data.totalPlayersHosted} / {data.tierInfo.tier === 'starter' ? 500 : 3000}</span>
                    </div>
                    <div className="w-full bg-dark-800 rounded-full h-1.5">
                      <div className="bg-neon-cyan h-1.5 rounded-full" style={{ width: `${Math.min(100, (data.totalPlayersHosted / (data.tierInfo.tier === 'starter' ? 500 : 3000)) * 100)}%` }}></div>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-dark-500 mt-4 italic"><HiInformationCircle className="inline mr-1" />Meet both requirements to automatically upgrade your tier and revenue share.</p>
              </div>
            )}
            
            {data.tierInfo.tier === 'pro' && (
              <div className="flex-1 lg:border-l lg:border-surface-border lg:pl-8 flex flex-col justify-center items-center text-center">
                 <HiCheckCircle className="text-4xl text-green-400 mb-2" />
                 <h3 className="text-white font-bold mb-1">Max Earned Tier Achieved</h3>
                 <p className="text-sm text-dark-400 max-w-xs">You've reached Pro Organizer status. Upgrade to Elite via Subscription for 85% revenue share.</p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card bg-gradient-to-br from-primary-900/40 to-dark-900 border-primary-500/30">
          <div className="flex items-center gap-3 text-neon-cyan mb-2">
            <HiCurrencyDollar className="text-2xl" />
            <span className="font-semibold text-sm uppercase tracking-wider">Current Balance</span>
          </div>
          <div className="text-4xl font-display font-bold text-white mb-2">{balance} <span className="text-xl text-dark-400">pts</span></div>
          <p className="text-xs text-dark-400 flex items-center gap-1"><HiInformationCircle /> 1 point = ₹1 (INR)</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 text-dark-300 mb-2">
            <HiLightningBolt className="text-2xl text-orange-400" />
            <span className="font-semibold text-sm uppercase tracking-wider">Hosting Capacity</span>
          </div>
          <div className="text-4xl font-display font-bold text-white mb-2">{data.tierInfo?.creditLimitOverride ? '∞' : scrimsPossible} <span className="text-xl text-dark-400">scrims</span></div>
          <p className="text-xs text-dark-400">Fixed rate: {scrimCost} pts / scrim</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 text-dark-300 mb-2">
            <span className="font-semibold text-sm uppercase tracking-wider">Lifetime Usage</span>
          </div>
          <div className="space-y-2 mt-4">
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Total Points Added:</span>
              <span className="text-green-400 font-bold">+{wallet?.totalAdded || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Total Points Spent:</span>
              <span className="text-red-400 font-bold">-{wallet?.totalUsed || 0}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-lg font-bold text-white mb-4">Choose a Plan</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { id: 'basic', name: 'Basic Plan', points: 100, price: 99 },
            { id: 'starter', name: 'Starter Plan', points: 330, price: 299 },
            { id: 'pro', name: 'Pro Plan', points: 550, price: 499 }
          ].map(plan => (
            <div key={plan.id} className="card border border-surface-border bg-dark-900/40 hover:border-primary-500/50 transition-all flex flex-col pt-6 pb-6 text-center">
              <div className="text-sm text-neon-cyan uppercase tracking-widest font-bold mb-4">{plan.name}</div>
              <div className="text-5xl font-display font-black text-white mb-2">{plan.points} <span className="text-xl font-sans text-dark-400 font-normal">pts</span></div>
              <div className="text-lg text-dark-300 mb-6">₹{plan.price} / request</div>
              <button 
                onClick={() => {
                  setFormData({ ...formData, requestedPoints: plan.points, price: plan.price });
                  setRequestModal(true);
                }} 
                className="btn-primary mt-auto w-full max-w-[200px] mx-auto"
              >
                Buy Now
              </button>
            </div>
          ))}
        </div>
      </div>

      {pendingRequests.length > 0 && (
        <div className="card mb-8 border-surface-border">
          <h2 className="text-lg font-bold text-white mb-4">My Point Requests</h2>
          <div className="space-y-3">
            {pendingRequests.map(req => {
              const statusMap = {
                pending:  { label: 'Pending Review', cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' },
                approved: { label: 'Completed ✓',    cls: 'bg-green-500/20  text-green-400  border border-green-500/30' },
                rejected: { label: 'Rejected',        cls: 'bg-red-500/20    text-red-400    border border-red-500/30' },
                cancelled:{ label: 'Cancelled',       cls: 'bg-dark-700      text-dark-400   border border-dark-600' },
              };
              const s = statusMap[req.status] || statusMap.pending;
              return (
                <div key={req._id} className="flex justify-between items-center bg-dark-900 p-4 rounded-xl border border-surface-border/50">
                  <div>
                    <p className="text-white font-medium">Request for {req.requestedPoints} points</p>
                    {req.utr && <p className="text-xs text-dark-400 mt-0.5 font-mono">UTR: {req.utr}</p>}
                    <p className="text-xs text-dark-500 mt-1">{new Date(req.createdAt).toLocaleString()}</p>
                    {req.adminResponse && <p className="text-xs text-dark-300 mt-1 italic">"{req.adminResponse}"</p>}
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-lg whitespace-nowrap ${s.cls}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <h2 className="text-lg font-bold text-white mb-6">Ledger & Transaction History</h2>
        {transactions.length === 0 ? (
          <p className="text-dark-400 text-center py-8">No point transactions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-border text-sm text-dark-400">
                  <th className="pb-3 font-medium">Date</th>
                  <th className="pb-3 font-medium">Action</th>
                  <th className="pb-3 font-medium">Amount</th>
                  <th className="pb-3 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {transactions.map(tx => (
                  <tr key={tx._id} className="border-b border-surface-border/50">
                    <td className="py-4 text-dark-300">{new Date(tx.createdAt).toLocaleDateString()}</td>
                    <td className="py-4">
                      <p className="text-white font-medium">{tx.reason}</p>
                      {tx.relatedScrim && <p className="text-xs text-neon-cyan mt-1">Scrim: {tx.relatedScrim.title}</p>}
                    </td>
                    <td className={`py-4 font-bold ${tx.type === 'debit' ? 'text-red-400' : 'text-green-400'}`}>
                      {tx.type === 'debit' ? '-' : '+'}{tx.points}
                    </td>
                    <td className="py-4 text-right text-dark-300 font-mono">{tx.balanceAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {requestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm">
          <div className="card w-full max-w-md animate-fade-in relative max-h-[95vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-2">Request Hosting Points</h2>
            <p className="text-xs text-dark-400 mb-4">Submit a request to the platform administrators to top up your hosting points. (1 point = ₹1)</p>
            
            <form onSubmit={handleRequestSubmit} className="space-y-3">
              <div className="p-4 rounded-xl bg-primary-500/10 border border-primary-500/30 flex justify-between items-center">
                <div>
                  <div className="text-xs text-neon-cyan uppercase font-bold tracking-wider mb-1">Selected Plan</div>
                  <div className="text-xl font-display font-bold text-white">{formData.requestedPoints} Points</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-dark-300">Total Price</div>
                  <div className="text-lg font-bold text-neon-cyan">₹{formData.price}</div>
                </div>
              </div>

              {adminUpiId ? (
                <div className="bg-dark-900 border border-surface-border rounded-xl p-4 text-center shadow-lg">
                  <p className="text-xs text-white font-medium mb-3">Scan QR to Pay via any UPI App</p>
                  <div className="bg-white p-3 rounded-xl inline-block mx-auto mb-3">
                    <QRCode 
                      value={`upi://pay?pa=${adminUpiId}&pn=ScrimX&am=${formData.price}&cu=INR`} 
                      size={130} 
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
                <label className="text-sm font-medium text-dark-300 mb-1.5 block">Payment Proof (Optional)</label>
                <input type="file" accept="image/*" onChange={e => setAttachment(e.target.files[0])} className="input-field py-2" />
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-surface-border">
                <button type="button" onClick={() => setRequestModal(false)} className="btn-ghost flex-1">Cancel</button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1">{submitting ? 'Submitting...' : 'Submit Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default OrganizerPoints;
