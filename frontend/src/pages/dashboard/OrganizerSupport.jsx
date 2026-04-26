import { useState, useEffect } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/ui/Loader';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { HiSupport, HiPlusCircle } from 'react-icons/hi';

const OrganizerSupport = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRaising, setIsRaising] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'new'

  const [formData, setFormData] = useState({
    reason: '',
    description: '',
    scrimId: '', // Optional depending on backend
  });

  const fetchTickets = async () => {
    try {
      const res = await api.get('/disputes/my');
      setTickets(res.disputes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.reason || !formData.description) {
      return toast.error("Please fill required fields");
    }

    setIsRaising(true);
    try {
      await api.post('/disputes', {
        reason: formData.reason,
        description: formData.description,
        // Send a dummy scrim ID if the backend absolutely requires it, but normally organizers
        // raise generalized issues here. Assuming API supports support-tier reasons.
        ...(formData.scrimId && { scrimId: formData.scrimId }),
      });
      toast.success('Support ticket raised successfully!');
      setFormData({ reason: '', description: '', scrimId: '' });
      setView('list');
      setLoading(true);
      fetchTickets();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to raise ticket');
    } finally {
      setIsRaising(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-[50vh]"><Loader /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
              <HiSupport className="text-neon-cyan" /> Support Center
            </h1>
            <p className="text-dark-400 mt-1">Raise tickets and report issues to ScrimX Admins</p>
          </div>
          {view === 'list' && (
            <button
              onClick={() => setView('new')}
              className="btn-primary text-sm flex items-center justify-center gap-2"
            >
              <HiPlusCircle /> Open New Ticket
            </button>
          )}
        </div>

        {view === 'new' ? (
          <div className="card space-y-6 animate-fade-in text-left">
            <h2 className="text-lg font-semibold text-white">Create Support Ticket</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Issue Topic *</label>
                  <select
                    name="reason"
                    value={formData.reason}
                    onChange={handleChange}
                    className="w-full bg-dark-900 border border-surface-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                    required
                  >
                    <option value="" disabled>Select a topic</option>
                    <option value="payment_issue">Payment & Withdrawals</option>
                    <option value="scrim_issue">Scrim Management</option>
                    <option value="player_report">Report a Player / Team</option>
                    <option value="technical_bug">Technical Bug / Issue</option>
                    <option value="other">Other Inquiry</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Related Scrim ID (Optional)</label>
                  <input
                    type="text"
                    name="scrimId"
                    value={formData.scrimId}
                    onChange={handleChange}
                    placeholder="Enter the Scrim ID if applicable..."
                    className="w-full bg-dark-900 border border-surface-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    placeholder="Please explain your issue in detail so admins can assist you..."
                    rows={5}
                    required
                    className="w-full bg-dark-900 border border-surface-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors resize-y"
                  />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setView('list')} className="btn-ghost px-4 py-2 text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={isRaising} className="btn-neon px-4 py-2 text-sm">
                  {isRaising ? 'Submitting...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">My Tickets</h3>
            {tickets.length === 0 ? (
              <EmptyState 
                title="No support tickets" 
                description="You haven't raised any tickets or disputes yet."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-surface-border text-dark-400 text-sm font-medium">
                      <th className="pb-3 text-left">Issue / Reason</th>
                      <th className="pb-3 text-left">Date Opened</th>
                      <th className="pb-3 text-left">Admin Response</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map(ticket => (
                      <tr key={ticket._id} className="border-b border-surface-border/30 hover:bg-white/5 transition-colors text-sm">
                        <td className="py-4 text-white font-medium capitalize">{ticket.reason?.replace('_', ' ')}</td>
                        <td className="py-4 text-dark-300">{new Date(ticket.createdAt).toLocaleDateString()}</td>
                        <td className="py-4 text-dark-400 max-w-xs truncate">{ticket.adminNotes || 'Awaiting Admin Response...'}</td>
                        <td className="py-4 text-right">
                          <Badge 
                            variant={ticket.status === 'pending' ? 'warning' : 'success'} 
                            size="sm"
                          >
                            {ticket.status.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default OrganizerSupport;
