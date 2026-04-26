import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { HiFire, HiCheckCircle, HiXCircle, HiX, HiPhotograph } from 'react-icons/hi';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';

const AdminBoosts = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/boosts/admin/requests?status=${statusFilter}&limit=50`);
      setRequests(data.requests || []);
    } catch (error) {
      toast.error('Failed to fetch boost requests');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRequest = async (id, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this request as ${newStatus}?`)) return;

    try {
      await api.patch(`/boosts/admin/requests/${id}`, { status: newStatus });
      toast.success(`Request marked as ${newStatus}`);
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to process request');
    }
  };

  const handleRevokeHighlight = async (type, id) => {
    if (!window.confirm('Are you sure you want to instantly revoke this highlight?')) return;
    try {
      await api.delete(`/boosts/admin/remove/${type}/${id}`);
      toast.success('Highlight revoked manually');
    } catch (err) {
      toast.error('Failed to revoke highlight');
    }
  };

  const getStatusColor = (status) => {
    if (status === 'approved') return 'text-green-400 bg-green-400/10 border-green-400/20';
    if (status === 'rejected') return 'text-red-400 bg-red-400/10 border-red-400/20';
    return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <HiFire className="text-orange-500" /> Boost Requests
          </h2>
          
          <div className="flex bg-dark-900 rounded-lg p-1 border border-surface-border w-fit">
            {['pending', 'approved', 'rejected'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  statusFilter === s ? 'bg-dark-700 text-white shadow-sm' : 'text-dark-400 hover:text-white'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-dark-900/50 border-b border-surface-border">
                  <th className="p-4 text-sm font-semibold text-dark-300">Organizer</th>
                  <th className="p-4 text-sm font-semibold text-dark-300">Item</th>
                  <th className="p-4 text-sm font-semibold text-dark-300">Details</th>
                  <th className="p-4 text-sm font-semibold text-dark-300">Payment</th>
                  <th className="p-4 text-sm font-semibold text-dark-300">Status</th>
                  {statusFilter === 'pending' && <th className="p-4 text-sm font-semibold text-dark-300 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-dark-400">Loading requests...</td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-dark-400">No {statusFilter} requests found.</td>
                  </tr>
                ) : (
                  requests.map((req) => (
                    <tr key={req._id} className="hover:bg-dark-800/20 transition-colors">
                      <td className="p-4">
                        <div className="font-medium text-white">{req.organizer?.organizerProfile?.displayName || req.organizer?.username}</div>
                        <div className="text-xs text-dark-400">{req.organizer?.email}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-bold text-white capitalize">{req.itemType}</div>
                        <div className="text-xs font-mono text-dark-400">{req.itemId}</div>
                        {statusFilter === 'approved' && (
                           <button onClick={() => handleRevokeHighlight(req.itemType, req.itemId)} className="text-[10px] text-red-400 hover:underline mt-1">Revoke Active Highlight</button>
                        )}
                      </td>
                      <td className="p-4">
                        <Badge variant="warning">{req.duration}</Badge>
                        <div className="text-xs text-dark-400 mt-1">Price: ₹{req.price}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-mono text-neon-cyan tracking-wider">{req.utr}</div>
                        <div className="text-xs text-dark-400 mt-1">{req.contactInfo}</div>
                        {req.attachments?.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {req.attachments.map((att, i) => (
                              <button
                                key={i}
                                onClick={() => setSelectedImage(att.url)}
                                className="flex items-center gap-1 text-[10px] bg-dark-800 hover:bg-dark-700 text-dark-200 px-2 py-1 rounded"
                              >
                                <HiPhotograph /> Proof {i + 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full border ${getStatusColor(req.status)} capitalize`}>
                          {req.status}
                        </span>
                        <div className="text-[10px] text-dark-500 mt-1">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      {statusFilter === 'pending' && (
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => handleProcessRequest(req._id, 'approved')}
                            className="btn-ghost py-1.5 px-3 text-xs inline-flex items-center gap-1 text-green-400 hover:bg-green-400/10 hover:border-green-400/20"
                          >
                            <HiCheckCircle className="text-sm" /> Approve
                          </button>
                          <button
                            onClick={() => handleProcessRequest(req._id, 'rejected')}
                            className="btn-ghost py-1.5 px-3 text-xs inline-flex items-center gap-1 text-red-400 hover:bg-red-400/10 hover:border-red-400/20"
                          >
                            <HiXCircle className="text-sm" /> Reject
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {selectedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedImage(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute -top-10 right-0 text-white hover:text-red-400 p-2"
            >
              <HiX size={24} />
            </button>
            <img src={selectedImage} alt="Payment Proof" className="w-full h-full object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminBoosts;
