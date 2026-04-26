import { useState, useEffect } from 'react';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/ui/Loader';
import StatsCard from '../../components/ui/StatsCard';
import { HiUsers, HiLightningBolt, HiCurrencyDollar, HiExclamation, HiTrendingUp } from 'react-icons/hi';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [activity, setActivity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsData, activityData] = await Promise.all([
          api.get('/admin-stats/stats'),
          api.get('/admin-stats/activity')
        ]);
        setStats(statsData);
        setActivity(activityData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <DashboardLayout><div className="flex justify-center p-12"><Loader /></div></DashboardLayout>;
  if (!stats || !activity) return <DashboardLayout><div className="p-12 text-center text-red-500">Failed to load admin stats. Please try again.</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Platform Overview</h1>
          <p className="text-dark-400">Real-time metrics and growth tracking</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard 
            title="Total Users" 
            value={stats.overview.totalUsers} 
            icon={<HiUsers className="text-neon-cyan" />}
            trend={`+${stats.growth.newUsersLastWeek} this week`}
          />
          <StatsCard 
            title="Active Scrims" 
            value={stats.overview.activeScrims} 
            icon={<HiLightningBolt className="text-yellow-400" />}
          />
          <StatsCard 
            title="Total Volume" 
            value={`₹${stats.overview.totalVolume.toLocaleString()}`} 
            icon={<HiCurrencyDollar className="text-green-400" />}
          />
          <StatsCard 
            title="Open Disputes" 
            value={stats.overview.openDisputes} 
            icon={<HiExclamation className="text-red-400" />}
            variant={stats.overview.openDisputes > 0 ? 'danger' : 'neutral'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Scrims */}
          <div className="card">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <HiLightningBolt className="text-neon-cyan" /> Recent Scrims
            </h3>
            <div className="space-y-4">
              {activity.recentScrims.map(scrim => (
                <div key={scrim._id} className="flex items-center justify-between p-3 rounded-xl bg-dark-900 border border-surface-border">
                  <div>
                    <p className="text-white font-medium">{scrim.title}</p>
                    <p className="text-xs text-dark-500">by @{scrim.organizer?.username}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-dark-400">{new Date(scrim.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Withdrawals info */}
          <div className="card bg-gradient-to-br from-dark-850 to-primary-900/10 border-primary-500/20">
            <div className="flex items-start justify-between mb-8">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Pending Withdrawals</h3>
                <p className="text-sm text-dark-400 font-medium">Action required for {stats.overview.pendingWithdrawals} requests</p>
              </div>
              <div className="p-3 rounded-2xl bg-primary-500/10 text-neon-cyan border border-primary-500/20">
                <HiCurrencyDollar size={24} />
              </div>
            </div>
            <button className="btn-neon w-full">Review Payouts</button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
