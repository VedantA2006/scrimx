import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { HiOutlineExclamationCircle, HiOutlineCheckCircle, HiOutlineXCircle, HiOutlineEye } from 'react-icons/hi';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const CATEGORY_LABELS = {
   wrong_placement: 'Wrong Placement',
   kill_count_error: 'Kill Count Error',
   technical_issue: 'Technical Issue',
   cheating_report: 'Cheating Report',
   other: 'Other'
};

const STATUS_STYLES = {
   open: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
   under_review: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
   resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
   rejected: 'bg-red-500/20 text-red-400 border-red-500/30'
};

const TournamentDisputesTab = () => {
   const { id } = useParams();
   const [disputes, setDisputes] = useState([]);
   const [loading, setLoading] = useState(true);
   const [selected, setSelected] = useState(null);
   const [resolution, setResolution] = useState('');
   const [resolveLoading, setResolveLoading] = useState(false);
   const [filter, setFilter] = useState('all');

   useEffect(() => { fetchDisputes(); }, [id]);

   const fetchDisputes = async () => {
      try {
         const res = await api.get(`/tournaments/${id}/disputes`);
         if (res.success) setDisputes(res.data);
      } catch (err) {
         toast.error('Failed loading dispute ledger.');
      } finally {
         setLoading(false);
      }
   };

   const handleResolve = async (disputeId, status) => {
      if (!resolution && status !== 'under_review') return toast.error('Please add a resolution note.');
      setResolveLoading(true);
      try {
         const res = await api.put(`/tournaments/${id}/disputes/${disputeId}/resolve`, { status, resolution });
         if (res.success) {
            toast.success(`Dispute marked as ${status}`);
            setSelected(null);
            setResolution('');
            fetchDisputes();
         }
      } catch (err) {
         toast.error('Resolution action failed.');
      } finally {
         setResolveLoading(false);
      }
   };

   const filtered = disputes.filter(d => filter === 'all' ? true : d.status === filter);
   const openCount = disputes.filter(d => d.status === 'open').length;

   if (loading) return <div className="p-10 flex justify-center"><div className="w-8 h-8 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin"></div></div>;

   return (
      <div className="animate-fade-in space-y-6">
         <div className="flex justify-between items-center mb-6 border-b border-surface-border pb-4">
            <div>
               <h2 className="text-2xl font-bold text-white">Dispute Resolution Centre</h2>
               <p className="text-sm text-dark-400">Review and resolve team-filed match contention tickets.</p>
            </div>
            {openCount > 0 && (
               <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-lg text-sm font-bold">
                  <HiOutlineExclamationCircle /> {openCount} Open Ticket{openCount > 1 ? 's' : ''} Pending
               </div>
            )}
         </div>

         <div className="flex gap-2 mb-4">
            {['all', 'open', 'under_review', 'resolved', 'rejected'].map(f => (
               <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border ${filter === f ? 'bg-dark-800 text-white border-surface-border' : 'text-dark-400 border-transparent hover:bg-dark-900'}`}>
                  {f.replace('_', ' ')} ({disputes.filter(d => f === 'all' || d.status === f).length})
               </button>
            ))}
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Dispute List */}
            <div className="space-y-3">
               {filtered.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-surface-border rounded-xl text-dark-400">No tickets matching filter.</div>
               ) : filtered.map(d => (
                  <div
                     key={d._id}
                     onClick={() => { setSelected(d); setResolution(''); }}
                     className={`p-4 bg-dark-900 border rounded-xl cursor-pointer transition-all ${selected?._id === d._id ? 'border-primary-500/50' : 'border-surface-border hover:border-dark-600'}`}
                  >
                     <div className="flex justify-between items-start mb-2">
                        <div>
                           <p className="font-bold text-white">{d.title}</p>
                           <p className="text-xs text-dark-400">{d.teamId?.name} • {CATEGORY_LABELS[d.category]}</p>
                        </div>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${STATUS_STYLES[d.status]}`}>{d.status.replace('_', ' ')}</span>
                     </div>
                     <p className="text-xs text-dark-500">{new Date(d.createdAt).toLocaleString()}</p>
                  </div>
               ))}
            </div>

            {/* Resolution Panel */}
            <div>
               {!selected ? (
                  <div className="h-full flex items-center justify-center border border-dashed border-surface-border rounded-xl text-dark-400 p-8 text-center">
                     <div><HiOutlineEye className="mx-auto text-4xl mb-3 text-dark-600" /><p>Select a dispute ticket to review and resolve.</p></div>
                  </div>
               ) : (
                  <div className="bg-dark-900 border border-surface-border rounded-xl p-6 space-y-4">
                     <div className="flex justify-between items-start">
                        <h3 className="font-bold text-white text-lg">{selected.title}</h3>
                        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded border ${STATUS_STYLES[selected.status]}`}>{selected.status.replace('_', ' ')}</span>
                     </div>
                     <div className="space-y-1 text-sm">
                        <p className="text-dark-400">Filed by: <span className="text-white font-medium">{selected.filedBy?.username}</span></p>
                        <p className="text-dark-400">Team: <span className="text-white font-medium">{selected.teamId?.name}</span></p>
                        <p className="text-dark-400">Category: <span className="text-primary-400 font-medium">{CATEGORY_LABELS[selected.category]}</span></p>
                     </div>
                     <div className="bg-dark-950 border border-surface-border rounded-lg p-4 text-sm text-dark-300">
                        {selected.description}
                     </div>
                     {selected.evidenceUrls?.length > 0 && (
                        <div>
                           <p className="text-xs font-bold text-dark-400 mb-2">Evidence Attachments ({selected.evidenceUrls.length})</p>
                           <div className="flex flex-wrap gap-2">
                              {selected.evidenceUrls.map((url, i) => (
                                 <a key={i} href={url} target="_blank" rel="noreferrer" className="text-xs text-primary-400 underline">Evidence {i + 1}</a>
                              ))}
                           </div>
                        </div>
                     )}
                     {selected.resolution && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-sm text-green-300">
                           <p className="font-bold text-green-400 mb-1">Resolution</p>
                           {selected.resolution}
                        </div>
                     )}
                     {selected.status === 'open' || selected.status === 'under_review' ? (
                        <div className="space-y-3 pt-2 border-t border-surface-border">
                           <textarea value={resolution} onChange={e => setResolution(e.target.value)} rows="3" className="w-full bg-dark-950 border border-surface-border rounded-lg p-3 text-white text-sm outline-none focus:border-neon-cyan" placeholder="Add resolution note..." />
                           <div className="grid grid-cols-3 gap-2">
                              <button onClick={() => handleResolve(selected._id, 'under_review')} disabled={resolveLoading} className="py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 text-xs font-bold flex items-center justify-center gap-1"><HiOutlineEye /> Review</button>
                              <button onClick={() => handleResolve(selected._id, 'resolved')} disabled={resolveLoading} className="py-2 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20 text-xs font-bold flex items-center justify-center gap-1"><HiOutlineCheckCircle /> Resolve</button>
                              <button onClick={() => handleResolve(selected._id, 'rejected')} disabled={resolveLoading} className="py-2 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 text-xs font-bold flex items-center justify-center gap-1"><HiOutlineXCircle /> Reject</button>
                           </div>
                        </div>
                     ) : null}
                  </div>
               )}
            </div>
         </div>
      </div>
   );
};

export default TournamentDisputesTab;
