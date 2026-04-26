import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { HiOutlineCheck, HiOutlineX, HiOutlineClock, HiOutlineFilter, HiOutlineDownload, HiOutlineTrash } from 'react-icons/hi';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const TournamentRegistrationsTab = () => {
  const { id } = useParams();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchRegistrations();
  }, [id]);

  const fetchRegistrations = async () => {
    try {
      const res = await api.get(`/tournaments/${id}/registrations`);
      if (res.success) setRegistrations(res.data);
    } catch (err) {
      toast.error('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (regId, status) => {
    try {
      const res = await api.put(`/tournaments/${id}/registrations/${regId}/status`, { status });
      if (res.success) {
        toast.success(`Registration marked as ${status}`);
        fetchRegistrations(); // Reload
      }
    } catch (err) {
      toast.error('Failed updating status');
    }
  };

  const handleBulkApprove = async () => {
    if (!window.confirm("Approve all pending registrations instantly?")) return;
    try {
      const res = await api.put(`/tournaments/${id}/registrations/bulk-approve`);
      if (res.success) {
        toast.success(res.message);
        fetchRegistrations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk approval failed');
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm("WARNING: This will permanently delete ALL registered teams and clear their slots. Are you sure you want to proceed?")) return;
    try {
      const res = await api.delete(`/tournaments/${id}/registrations/bulk-delete`);
      if (res.success) {
        toast.success(res.message);
        fetchRegistrations();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Bulk delete failed');
    }
  };

  const filteredRegs = registrations.filter(r => filter === 'all' ? true : r.status === filter);

  if (loading) return <div className="p-10 flex justify-center"><div className="w-8 h-8 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="animate-fade-in space-y-6">
       <div className="flex justify-between items-center mb-6 border-b border-surface-border pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Team Registrations</h2>
            <p className="text-sm text-dark-400">Review entries, verify payments, and manage waitlists.</p>
          </div>
          <div className="flex gap-3">
             <button onClick={handleBulkDelete} className="btn-ghost flex items-center gap-2 text-sm text-red-500 hover:bg-red-500/10 hover:border-red-500/30">
                <HiOutlineTrash /> Remove All Teams
             </button>
             <button className="btn-ghost flex items-center gap-2 text-sm"><HiOutlineDownload /> Export CSV</button>
             <button onClick={handleBulkApprove} className="btn-primary text-sm px-6">Bulk Approve</button>
          </div>
       </div>

       {/* Sub Nav / Filters */}
       <div className="flex gap-2">
          {['all', 'pending', 'payment_verification', 'approved', 'waitlist', 'rejected'].map(f => (
             <button 
               key={f} 
               onClick={() => setFilter(f)}
               className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${filter === f ? 'bg-dark-800 text-white border border-surface-border' : 'text-dark-400 hover:bg-dark-900 border border-transparent'}`}
             >
                {f.replace('_', ' ')} ({registrations.filter(r => f === 'all' ? true : r.status === f).length})
             </button>
          ))}
       </div>

       {/* Data Grid */}
       <div className="bg-dark-900 border border-surface-border rounded-xl overflow-hidden mt-6">
          <table className="w-full text-left text-sm">
             <thead className="bg-dark-950 text-dark-400 border-b border-surface-border font-medium">
                <tr>
                   <th className="p-4">Team</th>
                   <th className="p-4">Captain</th>
                   <th className="p-4">Date Submited</th>
                   <th className="p-4">Status & Economy</th>
                   <th className="p-4 text-right">Operations</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-surface-border">
                {filteredRegs.length === 0 ? (
                   <tr>
                      <td colSpan="5" className="p-8 text-center text-dark-400">No teams found matching filter.</td>
                   </tr>
                ) : filteredRegs.map(r => (
                   <tr key={r._id} className="hover:bg-dark-800/50 transition-colors">
                      <td className="p-4">
                         <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center border border-surface-border">
                               {r.teamId?.logo ? <img src={r.teamId.logo} alt="logo" className="w-full h-full rounded-lg object-cover"/> : <span className="text-dark-400 font-bold">{r.teamId?.name?.[0] || '?'}</span>}
                            </div>
                            <span className="font-bold text-white">{r.teamId?.name || 'Unknown Team'}</span>
                         </div>
                      </td>
                      <td className="p-4 text-dark-300">{r.userId?.username || 'Unknown'}</td>
                      <td className="p-4 text-dark-400 text-xs">{new Date(r.createdAt).toLocaleString()}</td>
                       <td className="p-4">
                         <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            r.status === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                            r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500 border border-yellow-500/30' :
                            r.status === 'rejected' ? 'bg-red-500/20 text-red-500 border border-red-500/30' :
                            r.status === 'waitlist' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                            'bg-dark-800 text-dark-300 border border-surface-border'
                         }`}>
                            {r.status.replace('_', ' ')} {r.status === 'waitlist' && `#${r.waitlistRank}`}
                         </span>
                         {r.paymentMode === 'manual' && <span className="ml-2 text-[10px] text-primary-400 font-bold underline cursor-pointer">View Proof</span>}
                      </td>
                      <td className="p-4 text-right space-x-2">
                         <button onClick={() => handleStatusUpdate(r._id, 'approved')} className="p-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors tooltip" title="Approve">
                            <HiOutlineCheck />
                         </button>
                         <button onClick={() => handleStatusUpdate(r._id, 'waitlist')} className="p-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 rounded-lg transition-colors tooltip" title="Waitlist">
                            <HiOutlineClock />
                         </button>
                         <button onClick={() => handleStatusUpdate(r._id, 'rejected')} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors tooltip" title="Reject">
                            <HiOutlineX />
                         </button>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
       </div>
    </div>
  );
};

export default TournamentRegistrationsTab;
