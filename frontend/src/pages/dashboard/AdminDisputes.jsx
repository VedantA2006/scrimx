import { useState, useEffect } from 'react';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/ui/Loader';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';

const AdminDisputes = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDisputes = async () => {
    try {
      const data = await api.get('/disputes');
      setDisputes(data.disputes);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDisputes();
  }, []);

  const handleResolve = async (id, status) => {
    try {
      await api.put(`/disputes/${id}/resolve`, { 
        status, 
        adminNotes: 'Resolved by admin via dashboard',
        penalizeAgainst: status === 'resolved_against' 
      });
      toast.success('Dispute resolved');
      fetchDisputes();
    } catch (err) {
      toast.error(err.message || 'Failed to resolve');
    }
  };

  if (loading) return <DashboardLayout><div className="flex justify-center p-12"><Loader /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Dispute Center</h1>
          <p className="text-dark-400">Mediate and resolve platform disputes</p>
        </div>

        <div className="card p-0 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-dark-900 text-xs text-dark-400 uppercase tracking-wider">
              <tr>
                <th className="p-4">Scrim</th>
                <th className="p-4">Reporter</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {disputes.map(dispute => (
                <tr key={dispute._id} className="hover:bg-dark-850 transition-colors">
                  <td className="p-4 text-white font-medium">{dispute.scrim?.title}</td>
                  <td className="p-4 text-dark-300">@{dispute.raisedBy?.username}</td>
                  <td className="p-4">
                    <span className="text-sm font-medium text-red-400">{dispute.reason}</span>
                  </td>
                  <td className="p-4">
                    <Badge variant={dispute.status === 'open' ? 'warning' : 'success'}>{dispute.status}</Badge>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    {dispute.status === 'open' && (
                      <>
                        <button onClick={() => handleResolve(dispute._id, 'resolved_in_favor')} className="text-xs btn-primary py-1 px-2">Favor Reporter</button>
                        <button onClick={() => handleResolve(dispute._id, 'dismissed')} className="text-xs btn-ghost py-1 px-2">Dismiss</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {disputes.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-dark-500">No disputes found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDisputes;
