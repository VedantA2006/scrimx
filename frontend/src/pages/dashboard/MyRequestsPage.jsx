import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Badge from '../../components/ui/Badge';
import EmptyState from '../../components/ui/EmptyState';
import api from '../../lib/api';
import { HiChat, HiCheckCircle, HiClock, HiXCircle, HiLink, HiFilter } from 'react-icons/hi';

const statusConfig = {
  pending: { variant: 'warning', label: 'Pending', icon: HiClock },
  chat_open: { variant: 'info', label: 'Chatting', icon: HiChat },
  approved: { variant: 'neon', label: 'Approved', icon: HiCheckCircle },
  rejected: { variant: 'danger', label: 'Rejected', icon: HiXCircle },
  expired: { variant: 'default', label: 'Expired', icon: HiClock },
  converted: { variant: 'success', label: 'Confirmed', icon: HiCheckCircle },
};

const MyRequestsPage = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = `/join-requests/my${filter ? `?status=${filter}` : ''}`;
      const data = await api.get(url);
      setRequests(data.requests || []);
    } catch (err) {
      console.error('Failed to load requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const filters = ['', 'pending', 'chat_open', 'approved', 'converted', 'rejected', 'expired'];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">My Slot Requests</h1>
            <p className="text-dark-400 text-sm mt-0.5">Track your scrim join requests</p>
          </div>
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

        {/* Requests */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="text-dark-400 text-sm animate-pulse">Loading requests...</div>
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            title="No requests found"
            description={filter ? 'Try changing the filter' : 'Browse scrims and request slots to get started'}
            action={
              <Link to="/marketplace" className="btn-primary text-sm px-4 py-2">
                Browse Scrims
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {requests.map(req => {
              const sc = statusConfig[req.status] || {};
              const StatusIcon = sc.icon || HiClock;

              return (
                <div key={req._id} className="card hover:border-white/10 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Scrim info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Link
                          to={`/scrims/${req.scrim?._id}`}
                          className="text-sm font-bold text-white hover:text-neon-cyan transition-colors truncate"
                        >
                          {req.scrim?.title || 'Unknown Scrim'}
                        </Link>
                        <Badge variant={sc.variant || 'default'} size="xs">
                          <StatusIcon className="inline mr-1 text-[10px]" />
                          {sc.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-dark-400">
                        <span>Team: <span className="text-dark-200 font-medium">{req.team?.name}</span></span>
                        <span>•</span>
                        <span>{req.scrim?.date ? new Date(req.scrim.date).toLocaleDateString() : 'TBD'}</span>
                        <span>•</span>
                        <span className="capitalize">{req.scrim?.format} {req.scrim?.mode?.toUpperCase()}</span>
                      </div>
                      {req.note && (
                        <p className="text-xs text-dark-400 mt-2 italic line-clamp-2">"{req.note}"</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {req.status === 'approved' && req.privateInviteToken && !req.privateInviteUsedAt && (
                        <Link
                          to={`/join/${req.privateInviteToken}`}
                          className="btn-neon text-xs px-3 py-1.5 inline-flex items-center gap-1"
                        >
                          <HiLink /> Confirm Slot
                        </Link>
                      )}
                      {req.status === 'converted' && req.assignedSlotNumber && (
                        <span className="text-xs font-bold text-green-400 bg-green-500/10 px-3 py-1.5 rounded-lg border border-green-500/20">
                          Slot #{req.assignedSlotNumber}
                        </span>
                      )}
                      {req.conversation && (
                        <Link
                          to={`/${req.organizer?.role === 'admin' ? 'admin' : 'dashboard'}/inbox`}
                          className="btn-ghost text-xs px-3 py-1.5 inline-flex items-center gap-1"
                        >
                          <HiChat /> Chat
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Rejection reason */}
                  {req.status === 'rejected' && req.rejectionReason && (
                    <div className="mt-3 p-3 rounded-xl bg-red-500/5 border border-red-500/10">
                      <p className="text-xs text-red-400">
                        <span className="font-bold">Reason:</span> {req.rejectionReason}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default MyRequestsPage;
