import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { HiOutlineCash, HiOutlineCurrencyRupee } from 'react-icons/hi';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const TournamentFinanceTab = () => {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFinance();
  }, [id]);

  const fetchFinance = async () => {
    try {
      const res = await api.get(`/tournaments/${id}/finance`);
      if (res.success) setData(res.data);
    } catch (err) {
      toast.error('Failed fetching financial metrics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-10 flex justify-center"><div className="w-8 h-8 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="animate-fade-in space-y-6">
       <div className="flex justify-between items-center mb-6 border-b border-surface-border pb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Financial Auditing</h2>
            <p className="text-sm text-dark-400">Track entry revenue streams versus payout declarations.</p>
          </div>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-dark-900 border border-surface-border p-5 rounded-xl">
             <div className="flex items-center gap-2 text-dark-400 text-sm mb-2"><HiOutlineCurrencyRupee /> Entry Fee Config</div>
             <p className="text-2xl font-mono font-bold text-white">₹{data?.entryFee}</p>
          </div>
          <div className="bg-dark-900 border border-surface-border p-5 rounded-xl">
             <div className="flex items-center gap-2 text-dark-400 text-sm mb-2"><HiOutlineCash /> Total Prize Declared</div>
             <p className="text-2xl font-mono font-bold text-green-400">₹{data?.totalPrizePool}</p>
          </div>
          <div className="bg-dark-900 border border-green-500/20 p-5 rounded-xl">
             <div className="flex items-center gap-2 text-green-500 text-sm font-bold mb-2">Liquid Revenue (Approved)</div>
             <p className="text-2xl font-mono font-bold text-white">₹{data?.actualRevenue}</p>
             <p className="text-xs text-dark-400 mt-1">From {data?.approvedTeams} teams</p>
          </div>
          <div className="bg-dark-950 border border-dark-800 p-5 rounded-xl opacity-80">
             <div className="flex items-center gap-2 text-dark-500 text-sm mb-2">Max Revenue Target</div>
             <p className="text-2xl font-mono font-bold text-dark-300">₹{data?.maxCapacityRevenue}</p>
          </div>
       </div>

       <div className="bg-dark-900 border border-surface-border rounded-xl overflow-hidden">
          <div className="p-4 border-b border-surface-border bg-dark-950 flex justify-between items-center">
             <h3 className="font-bold text-white">Pending Team Payouts</h3>
             <span className="text-xs bg-yellow-500/10 text-yellow-500 px-2 py-1 rounded border border-yellow-500/20">Waiting on Phase 2 Results</span>
          </div>
          <div className="p-8 text-center text-dark-400">
             Match results have not yet been explicitly submitted to the Ledger. Prize payouts cannot execute dynamically until Stage progression is locked.
          </div>
       </div>
    </div>
  );
};

export default TournamentFinanceTab;
