import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import LoadingButton from '../../components/ui/LoadingButton';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { HiChat, HiCheckCircle, HiXCircle, HiLink, HiFilter, HiUsers, HiClock } from 'react-icons/hi';

const statusConfig = {
  pending: { variant: 'warning', label: 'Pending' },
  chat_open: { variant: 'info', label: 'Chatting' },
  approved: { variant: 'neon', label: 'Link Sent' },
  rejected: { variant: 'danger', label: 'Rejected' },
  expired: { variant: 'default', label: 'Expired' },
  converted: { variant: 'success', label: 'Confirmed' },
};

const OrganizerSlotRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [actionLoading, setActionLoading] = useState({});
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = `/join-requests/organizer${filter ? `?status=${filter}` : ''}`;
      const data = await api.get(url);
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvite = async (reqId, teamName) => {
    setActionLoading(prev => ({ ...prev, [reqId]: 'invite' }));
    try {
      await api.post(`/join-requests/${reqId}/generate-invite`);
      toast.success(`Invite link sent to ${teamName || 'team'} in chat.`);
      setRequests(prev => prev.filter(r => r._id !== reqId));
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to generate invite');
    } finally {
      setActionLoading(prev => ({ ...prev, [reqId]: null }));
    }
  };

  const handleReject = async (reqId, teamName) => {
    setActionLoading(prev => ({ ...prev, [reqId]: 'reject' }));
    try {
      await api.patch(`/join-requests/${reqId}/status`, {
        status: 'rejected',
        rejectionReason: rejectReason
      });
      toast.success(`Slot request for ${teamName || 'team'} rejected.`);
      setRequests(prev => prev.filter(r => r._id !== reqId));
      setRejectingId(null);
      setRejectReason('');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to reject');
    } finally {
      setActionLoading(prev => ({ ...prev, [reqId]: null }));
    }
  };

  // Group by scrim
  const grouped = requests.reduce((acc, req) => {
    const scrimId = req.scrim?._id || 'unknown';
    if (!acc[scrimId]) {
      acc[scrimId] = { scrim: req.scrim, requests: [] };
    }
    acc[scrimId].requests.push(req);
    return acc;
  }, {});

  const filters = ['', 'pending', 'chat_open', 'approved', 'converted', 'rejected'];
  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-2xl font-display font-bold text-white">Slot Requests</h1>
              <p className="text-dark-400 text-sm mt-0.5">Manage incoming slot requests for your scrims</p>
            </div>
            {pendingCount > 0 && (
              <Badge variant="warning" size="sm">{pendingCount} pending</Badge>
            )}
          </div>
          <Link to="/organizer/inbox" className="btn-ghost text-sm inline-flex items-center gap-2">
            <HiChat /> Open Inbox
          </Link>
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
              {f ? statusConfig[f]?.label || f : 'All'}
            </button>
          ))}
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-dark-400 text-sm animate-pulse">Loading requests...</div>
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            title="No requests yet"
            description={filter ? 'Try changing the filter' : 'Requests will appear here when players want to join your scrims'}
          />
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([scrimId, { scrim, requests: scrimRequests }]) => (
              <div key={scrimId}>
                {/* Scrim Header */}
                <div className="flex items-center gap-3 mb-3 px-1">
                  <div className="h-px flex-1 bg-surface-border" />
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-dark-850 border border-surface-border">
                    <span className="text-xs font-bold text-white">{scrim?.title || 'Unknown'}</span>
                    <span className="text-[10px] text-dark-400">
                      {scrim?.filledSlots || 0}/{scrim?.slotCount || 0} slots
                    </span>
                  </div>
                  <div className="h-px flex-1 bg-surface-border" />
                </div>

                {/* Request cards */}
                <div className="space-y-2">
                  {scrimRequests.map(req => {
                    const sc = statusConfig[req.status] || {};
                    const isLoading = !!actionLoading[req._id];
                    const isRejectOpen = rejectingId === req._id;

                    return (
                      <div key={req._id} className="card py-4 hover:border-white/10 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          {/* Team info */}
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-neon-purple flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                              {req.team?.name?.[0]?.toUpperCase() || 'T'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-white truncate">{req.team?.name}</span>
                                {req.team?.tag && <span className="text-[10px] text-dark-400">[{req.team.tag}]</span>}
                                <Badge variant={sc.variant || 'default'} size="xs">{sc.label}</Badge>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-dark-400 mt-0.5">
                                <HiUsers className="text-[10px]" />
                                <span>by {req.requestedBy?.username || 'Unknown'}</span>
                                <span>•</span>
                                <HiClock className="text-[10px]" />
                                <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                              </div>
                              {req.note && (
                                <p className="text-xs text-dark-300 mt-1 italic line-clamp-1">"{req.note}"</p>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {['pending', 'chat_open'].includes(req.status) && (
                              <>
                                <LoadingButton
                                  loading={actionLoading[req._id] === 'invite'}
                                  disabled={isLoading}
                                  onClick={() => handleSendInvite(req._id, req.team?.name)}
                                  variant="primary"
                                  className="text-xs px-3 py-1.5"
                                >
                                  <HiLink /> Send Invite
                                </LoadingButton>
                                <button
                                  onClick={() => { setRejectingId(isRejectOpen ? null : req._id); setRejectReason(''); }}
                                  disabled={isLoading}
                                  className={`btn-ghost text-xs px-3 py-1.5 text-red-400 border-red-500/20 hover:bg-red-500/10 inline-flex items-center gap-1 ${isLoading ? 'opacity-60 pointer-events-none' : ''}`}
                                >
                                  <HiXCircle /> Reject
                                </button>
                              </>
                            )}
                            {req.status === 'approved' && !req.privateInviteUsedAt && (
                              <span className="text-xs text-neon-cyan bg-neon-cyan/10 px-3 py-1.5 rounded-lg border border-neon-cyan/20">
                                🔗 Link pending
                              </span>
                            )}
                            {req.status === 'converted' && (
                              <span className="text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20 font-bold">
                                ✅ Slot #{req.assignedSlotNumber}
                              </span>
                            )}
                            {req.conversation && (
                              <Link
                                to="/organizer/inbox"
                                className="p-2 rounded-lg bg-dark-850 hover:bg-dark-800 text-dark-300 hover:text-neon-cyan transition-colors border border-surface-border"
                              >
                                <HiChat />
                              </Link>
                            )}
                          </div>
                        </div>

                        {/* Inline Rejection Panel */}
                        {isRejectOpen && (
                          <div className="mt-3 pt-3 border-t border-surface-border space-y-3 animate-in slide-in-from-top-2">
                            <textarea
                              value={rejectReason}
                              onChange={e => setRejectReason(e.target.value)}
                              placeholder="Rejection reason (optional)..."
                              rows={2}
                              className="w-full bg-dark-800 border border-surface-border rounded-lg px-3 py-2 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-red-500/50 resize-none"
                            />
                            <div className="flex gap-2">
                              <LoadingButton
                                loading={actionLoading[req._id] === 'reject'}
                                onClick={() => handleReject(req._id, req.team?.name)}
                                variant="danger"
                                className="text-xs px-4 py-1.5"
                              >
                                Confirm Reject
                              </LoadingButton>
                              <button
                                onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                disabled={isLoading}
                                className="btn-ghost text-xs px-4 py-1.5"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default OrganizerSlotRequests;
