import { useState, useEffect } from 'react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { HiCheckCircle, HiXCircle, HiClock, HiFilter, HiChat, HiExternalLink } from 'react-icons/hi';

const AdminPlanRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = `/admin/plan-requests${filter ? `?status=${filter}` : ''}`;
      const data = await api.get(url);
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to load plan requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (reqId) => {
    const days = prompt('Duration in days (default 30):', '30');
    if (days === null) return;

    setActionLoading(prev => ({ ...prev, [reqId]: 'approve' }));
    try {
      await api.patch(`/admin/plan-requests/${reqId}`, {
        status: 'approved',
        durationDays: parseInt(days) || 30,
        adminReply: 'Your Elite plan has been activated!'
      });
      toast.success('Plan approved and activated!');
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to approve');
    } finally {
      setActionLoading(prev => ({ ...prev, [reqId]: null }));
    }
  };

  const handleReject = async (reqId) => {
    const reason = prompt('Rejection reason:');
    if (reason === null) return;

    setActionLoading(prev => ({ ...prev, [reqId]: 'reject' }));
    try {
      await api.patch(`/admin/plan-requests/${reqId}`, {
        status: 'rejected',
        rejectionReason: reason || 'Request declined',
        adminReply: reason || 'Request declined'
      });
      toast.success('Request rejected');
      fetchRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to reject');
    } finally {
      setActionLoading(prev => ({ ...prev, [reqId]: null }));
    }
  };

  const filters = ['', 'pending', 'approved', 'rejected'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Plan Upgrade Requests</h1>
          <p className="text-dark-400 text-sm mt-0.5">Manage organizer plan upgrade requests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending', count: requests.filter(r => r.status === 'pending').length, color: 'text-yellow-400' },
            { label: 'Approved', count: requests.filter(r => r.status === 'approved').length, color: 'text-green-400' },
            { label: 'Rejected', count: requests.filter(r => r.status === 'rejected').length, color: 'text-red-400' }
          ].map(s => (
            <div key={s.label} className="card text-center py-3">
              <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
              <p className="text-xs text-dark-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <HiFilter className="text-dark-400 flex-shrink-0" />
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filter === f
                  ? 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
                  : 'bg-dark-850 text-dark-300 border border-surface-border hover:bg-dark-800'
              }`}
            >
              {f ? f.charAt(0).toUpperCase() + f.slice(1) : 'All'}
            </button>
          ))}
        </div>

        {/* Requests */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-dark-400 text-sm animate-pulse">Loading...</div>
          </div>
        ) : requests.length === 0 ? (
          <EmptyState title="No plan requests" description="Upgrade requests from organizers will appear here" />
        ) : (
          <div className="space-y-3">
            {requests.map(req => {
              const isLoading = !!actionLoading[req._id];
              const org = req.organizer;

              return (
                <div key={req._id} className="card hover:border-white/10 transition-all">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Organizer info */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-neon-purple flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
                        {(org?.organizerProfile?.displayName?.[0] || org?.username?.[0] || 'O').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{org?.organizerProfile?.displayName || org?.username}</span>
                          {org?.organizerProfile?.isVerified && <Badge variant="neon" size="xs">✓ Verified</Badge>}
                          <Badge variant={req.status === 'pending' ? 'warning' : req.status === 'approved' ? 'success' : 'danger'} size="xs">
                            {req.status.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-dark-400 mt-0.5">
                          @{org?.username} • Current: {org?.organizerProfile?.plan || 'free'}
                          {' • '}Requested: <span className="text-neon-cyan font-semibold">{req.requestedPlan}</span>
                        </p>
                        <p className="text-xs text-dark-500 mt-0.5">
                          {new Date(req.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Message preview */}
                    {req.message && (
                      <div className="flex-1 p-3 rounded-xl bg-dark-850 border border-surface-border">
                        <p className="text-xs text-dark-300 line-clamp-2">{req.message}</p>
                        {req.contactInfo && (
                          <p className="text-[10px] text-dark-400 mt-1">Contact: {req.contactInfo}</p>
                        )}
                      </div>
                    )}

                    {/* Attachments */}
                    {req.attachments?.length > 0 && (
                      <div className="flex gap-2 flex-shrink-0">
                        {req.attachments.map((att, i) => (
                          <a
                            key={i}
                            href={att.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-14 h-14 rounded-xl bg-dark-800 border border-surface-border overflow-hidden hover:border-neon-cyan/30 transition-colors"
                          >
                            <img src={att.url} alt="proof" className="w-full h-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {req.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(req._id)}
                            disabled={isLoading}
                            className="btn-neon text-xs px-3 py-1.5 inline-flex items-center gap-1"
                          >
                            <HiCheckCircle /> {actionLoading[req._id] === 'approve' ? '...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => handleReject(req._id)}
                            disabled={isLoading}
                            className="btn-ghost text-xs px-3 py-1.5 text-red-400 border-red-500/20 hover:bg-red-500/10 inline-flex items-center gap-1"
                          >
                            <HiXCircle /> Reject
                          </button>
                        </>
                      )}
                      {req.status === 'approved' && (
                        <div className="text-xs text-green-400">
                          Active until {req.expiresAt ? new Date(req.expiresAt).toLocaleDateString() : 'N/A'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminPlanRequests;
