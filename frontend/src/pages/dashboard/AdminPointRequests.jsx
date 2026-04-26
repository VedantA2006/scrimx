import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/ui/Loader';
import Badge from '../../components/ui/Badge';
import { HiCheck, HiX, HiAdjustments } from 'react-icons/hi';

const AdminPointRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionModal, setActionModal] = useState(null); // { id: str, action: 'approved' | 'rejected' }
  const [adminResponse, setAdminResponse] = useState('');

  const [manualModal, setManualModal] = useState(false);
  const [manualData, setManualData] = useState({ organizerId: '', points: '', type: 'credit', reason: '' });

  const fetchRequests = async () => {
    try {
      const res = await api.get('/points/admin/requests');
      setRequests(res.requests);
    } catch (err) {
      toast.error('Failed to load point requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleAction = async (e) => {
    e.preventDefault();
    if (!actionModal) return;
    try {
      await api.patch(`/points/admin/requests/${actionModal.id}`, {
        status: actionModal.action,
        adminResponse
      });
      toast.success(`Request ${actionModal.action}`);
      setActionModal(null);
      setAdminResponse('');
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Action failed');
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/points/admin/organizers/${manualData.organizerId}/adjustment`, {
        type: manualData.type,
        points: manualData.points,
        reason: manualData.reason
      });
      toast.success('Manual adjustment successful');
      setManualModal(false);
      setManualData({ organizerId: '', points: '', type: 'credit', reason: '' });
      fetchRequests(); // Refresh requests in case we want to show anything, though it mostly updates the wallet
    } catch (err) {
      toast.error(err.message || 'Adjustment failed');
    }
  };

  if (loading) return <DashboardLayout><div className="flex justify-center p-12"><Loader /></div></DashboardLayout>;

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const pastRequests = requests.filter(r => r.status !== 'pending');

  return (
    <DashboardLayout>
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-display font-bold text-white mb-2">Organizer Point Requests</h1>
          <p className="text-dark-400">Review requests for hosting points from organizers.</p>
        </div>
        <button onClick={() => setManualModal(true)} className="btn-primary flex items-center gap-2 bg-purple-600 hover:bg-purple-500">
          <HiAdjustments /> Manual Adjustment
        </button>
      </div>

      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white">Pending Requests ({pendingRequests.length})</h2>
        {pendingRequests.length === 0 ? (
          <p className="text-dark-400">No pending point requests.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingRequests.map(req => (
              <div key={req._id} className="card border-orange-500/30">
                <div className="flex items-center gap-3 mb-4 pb-4 border-b border-surface-border">
                  <div className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center overflow-hidden">
                    {req.organizer?.organizerProfile?.logo ? (
                      <img src={req.organizer.organizerProfile.logo} alt="logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl uppercase">{req.organizer?.username[0]}</span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">{req.organizer?.organizerProfile?.displayName}</p>
                    <p className="text-xs text-dark-400">@{req.organizer?.username}</p>
                  </div>
                </div>
                <div className="mb-4">
                  <p className="text-2xl font-display font-bold text-neon-cyan mb-1">{req.requestedPoints} <span className="text-sm text-dark-400">pts</span></p>
                  <p className="text-sm text-dark-300">"{req.message || 'No message provided'}"</p>
                  {req.attachment && (
                    <a href={req.attachment} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline mt-2 inline-block">
                      View Proof Image
                    </a>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setActionModal({ id: req._id, action: 'approved' })} className="flex-1 bg-green-500/20 text-green-400 py-2 rounded-lg text-sm font-semibold hover:bg-green-500 hover:text-dark-950 transition-colors flex items-center justify-center gap-1">
                    <HiCheck /> Approve
                  </button>
                  <button onClick={() => setActionModal({ id: req._id, action: 'rejected' })} className="flex-1 bg-red-500/20 text-red-400 py-2 rounded-lg text-sm font-semibold hover:bg-red-500 hover:text-white transition-colors flex items-center justify-center gap-1">
                    <HiX /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="text-lg font-bold text-white mt-12">Recently Processed</h2>
        <div className="card overflow-x-auto">
           {pastRequests.length === 0 ? <p className="text-dark-400">No history found.</p> : (
             <table className="w-full text-left text-sm">
               <thead>
                 <tr className="border-b border-surface-border text-dark-400">
                   <th className="pb-3 font-medium">Organizer</th>
                   <th className="pb-3 font-medium">Points</th>
                   <th className="pb-3 font-medium">Status</th>
                   <th className="pb-3 font-medium">Reviewed By</th>
                   <th className="pb-3 font-medium">Date</th>
                 </tr>
               </thead>
               <tbody>
                 {pastRequests.map(req => (
                   <tr key={req._id} className="border-b border-surface-border/50">
                     <td className="py-3 text-white font-medium">@{req.organizer?.username}</td>
                     <td className="py-3 font-bold">{req.requestedPoints}</td>
                     <td className="py-3">
                       <Badge variant={req.status === 'approved' ? 'success' : 'danger'}>{req.status}</Badge>
                     </td>
                     <td className="py-3 text-dark-400">{req.reviewedBy?.username || 'Auto'}</td>
                     <td className="py-3 text-dark-400">{new Date(req.updatedAt).toLocaleDateString()}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
           )}
        </div>
      </div>

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm">
          <div className="card w-full max-w-md">
             <h2 className="text-xl font-bold text-white mb-4">
               {actionModal.action === 'approved' ? 'Approve' : 'Reject'} Point Request
             </h2>
             <form onSubmit={handleAction}>
               <label className="text-sm font-medium text-dark-300 mb-1 block">Admin Note / Reason (Optional)</label>
               <textarea rows="3" value={adminResponse} onChange={e => setAdminResponse(e.target.value)} className="input-field mb-4" placeholder="Message to organizer..." />
               <div className="flex gap-2">
                 <button type="button" onClick={() => setActionModal(null)} className="btn-ghost flex-1">Cancel</button>
                 <button type="submit" className={`btn-primary flex-1 ${actionModal.action === 'rejected' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
                   Confirm {actionModal.action}
                 </button>
               </div>
             </form>
          </div>
        </div>
      )}

      {manualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark-950/80 backdrop-blur-sm">
          <div className="card w-full max-w-md">
             <h2 className="text-xl font-bold text-white mb-4">Manual Point Adjustment</h2>
             <form onSubmit={handleManualSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-dark-300 block mb-1">Organizer ID</label>
                  <input required type="text" value={manualData.organizerId} onChange={e => setManualData({...manualData, organizerId: e.target.value})} className="input-field" placeholder="User ObjectId" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-dark-300 block mb-1">Type</label>
                    <select value={manualData.type} onChange={e => setManualData({...manualData, type: e.target.value})} className="input-field">
                      <option value="credit">Add Points</option>
                      <option value="debit">Deduct Points</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-dark-300 block mb-1">Points</label>
                    <input required type="number" min="1" value={manualData.points} onChange={e => setManualData({...manualData, points: e.target.value})} className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-300 block mb-1">Reason</label>
                  <input required type="text" value={manualData.reason} onChange={e => setManualData({...manualData, reason: e.target.value})} className="input-field" placeholder="Refund / Manual grant..." />
                </div>
                <div className="flex gap-2 pt-2 border-t border-surface-border">
                 <button type="button" onClick={() => setManualModal(false)} className="btn-ghost flex-1">Cancel</button>
                 <button type="submit" className="btn-primary flex-1">Apply Adjustment</button>
               </div>
             </form>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default AdminPointRequests;
