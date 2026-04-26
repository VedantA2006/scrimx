import { useState, useEffect } from 'react';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/ui/Loader';
import Badge from '../../components/ui/Badge';
import toast from 'react-hot-toast';
import { HiLightningBolt, HiTrash } from 'react-icons/hi';
import { Link } from 'react-router-dom';

const AdminScrims = () => {
  const [scrims, setScrims] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchScrims = async () => {
    try {
      const data = await api.get('/admin/scrims');
      setScrims(data.scrims);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch scrims');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScrims();
  }, []);

  const handleDeleteScrim = async (id, title) => {
    if (!window.confirm(`Are you absolutely sure you want to forcibly delete scrim "${title}"? This is a destructive action.`)) {
      return;
    }

    try {
      await api.delete(`/admin/scrims/${id}`);
      toast.success(`Scrim "${title}" has been deleted`);
      fetchScrims();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete scrim');
    }
  };

  const statusColors = {
    open: 'success',
    ongoing: 'warning',
    completed: 'neutral',
    cancelled: 'danger'
  };

  if (loading) return <DashboardLayout><div className="flex justify-center p-12"><Loader /></div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-6 flex flex-col min-h-[80vh]">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
              <HiLightningBolt className="text-neon-cyan" /> Event Management
            </h1>
            <p className="text-dark-400">Global overview and control of all tournaments</p>
          </div>
          <div className="text-sm text-dark-400">Total Scrims: <span className="text-neon-cyan font-bold">{scrims.length}</span></div>
        </div>

        <div className="card p-0 overflow-hidden flex-1 flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-dark-900 border-b border-surface-border text-xs text-dark-400 uppercase tracking-wider">
                <tr>
                  <th className="p-4">Event Details</th>
                  <th className="p-4">Organizer</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Prize Pool</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {scrims.map(scrim => (
                  <tr key={scrim._id} className="hover:bg-dark-850/50 transition-colors">
                    <td className="p-4">
                      <div>
                        <Link to={`/scrims/${scrim._id}`} className="text-white font-medium hover:text-neon-cyan transition-colors">
                          {scrim.title}
                        </Link>
                        <p className="text-xs text-dark-400 mt-1 flex items-center gap-2">
                          {scrim.game} • {scrim.format} • {scrim.slots.enrolled}/{scrim.slots.total} Teams
                          {scrim.isElite && <span className="px-1.5 py-0.5 rounded bg-primary-500/10 text-primary-400 text-[10px] font-bold">PRO</span>}
                        </p>
                      </div>
                    </td>
                    <td className="p-4">
                      {scrim.organizer ? (
                        <div className="flex items-center space-x-2">
                          <Link to={`/organizer/${scrim.organizer.organizerProfile?.slug || scrim.organizer._id}`} className="text-sm font-medium hover:underline text-dark-200">
                            {scrim.organizer.organizerProfile?.displayName || scrim.organizer.username}
                          </Link>
                        </div>
                      ) : (
                        <span className="text-dark-500 italic">Unknown</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-dark-300">
                      {new Date(scrim.schedule.date).toLocaleDateString()} <br />
                      <span className="text-dark-500 text-xs">{scrim.schedule.time}</span>
                    </td>
                    <td className="p-4">
                      <span className="text-neon-cyan font-medium">₹{scrim.prizePool.total}</span>
                    </td>
                    <td className="p-4">
                      <Badge variant={statusColors[scrim.status] || 'neutral'}>
                        {scrim.status}
                      </Badge>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button 
                        onClick={() => handleDeleteScrim(scrim._id, scrim.title)} 
                        className="btn-ghost py-1.5 px-3 text-xs inline-flex items-center gap-1 text-red-400 hover:bg-red-400/10 hover:border-red-400/20"
                      >
                        <HiTrash className="text-sm" /> Terminate
                      </button>
                    </td>
                  </tr>
                ))}
                {scrims.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-dark-500">No scrims have been hosted yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminScrims;
