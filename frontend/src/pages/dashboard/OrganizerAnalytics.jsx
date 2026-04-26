import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/ui/Loader';
import StatsCard from '../../components/ui/StatsCard';
import Badge from '../../components/ui/Badge';
import { HiChartBar, HiUsers, HiCalendar, HiCheckCircle, HiCurrencyDollar, HiTrendingUp, HiStar } from 'react-icons/hi';

const OrganizerAnalytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [myScrims, setMyScrims] = useState([]);
  const [metrics, setMetrics] = useState({
    totalScrims: 0,
    activeScrims: 0,
    completedScrims: 0,
    totalTeams: 0,
    avgFillRate: 0,
    totalRevenue: 0,
    organizerEarnings: 0,
    platformFee: 0,
    totalPlayers: 0,
  });

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await api.get('/scrims/manage/my');
        const scrims = response.data || response.scrims || [];
        setMyScrims(scrims);

        let active = 0, completed = 0, totalSlotsFilled = 0, totalSlotsAvailable = 0, totalRevenue = 0, organizerEarnings = 0, platformFee = 0;

        scrims.forEach(scrim => {
          if (['live', 'registrations_open', 'published', 'full', 'locked'].includes(scrim.status)) active++;
          if (scrim.status === 'completed') completed++;
          totalSlotsFilled += scrim.filledSlots || 0;
          totalSlotsAvailable += scrim.slotCount || 0;
          if (scrim.status === 'completed' || scrim.status === 'live') {
            totalRevenue += (scrim.filledSlots || 0) * (scrim.entryFee || 0);
          }
          if (scrim.earningsSummary?.organizerShare) {
            organizerEarnings += scrim.earningsSummary.organizerShare;
            platformFee += scrim.earningsSummary.platformShare || 0;
          }
        });

        const fillRate = totalSlotsAvailable > 0 ? (totalSlotsFilled / totalSlotsAvailable) * 100 : 0;

        setMetrics({
          totalScrims: scrims.length,
          activeScrims: active,
          completedScrims: completed,
          totalTeams: totalSlotsFilled,
          avgFillRate: fillRate,
          totalRevenue,
          organizerEarnings,
          platformFee,
          totalPlayers: totalSlotsFilled * 4,
        });
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  // Monthly distribution (last 6 months)
  const getMonthlyData = () => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString('en-US', { month: 'short' }),
        month: d.getMonth(),
        year: d.getFullYear(),
        count: 0,
        teams: 0,
      });
    }
    myScrims.forEach(s => {
      const d = new Date(s.date || s.createdAt);
      const entry = months.find(m => m.month === d.getMonth() && m.year === d.getFullYear());
      if (entry) {
        entry.count++;
        entry.teams += s.filledSlots || 0;
      }
    });
    return months;
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64"><Loader /></div>
      </DashboardLayout>
    );
  }

  const monthlyData = getMonthlyData();
  const maxCount = Math.max(...monthlyData.map(m => m.count), 1);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Analytics</h1>
          <p className="text-dark-400 mt-1">Detailed performance and growth metrics of your organization</p>
        </div>

        {/* Top-line Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatsCard icon={<HiCalendar className="text-neon-cyan" />} label="Total Scrims" value={metrics.totalScrims} />
          <StatsCard icon={<HiTrendingUp className="text-green-400" />} label="Active" value={metrics.activeScrims} />
          <StatsCard icon={<HiCheckCircle className="text-primary-400" />} label="Completed" value={metrics.completedScrims} />
          <StatsCard icon={<HiUsers className="text-purple-400" />} label="Teams Hosted" value={metrics.totalTeams} />
          <StatsCard icon={<HiChartBar className="text-yellow-400" />} label="Fill Rate" value={`${metrics.avgFillRate.toFixed(0)}%`} />
          <StatsCard icon={<HiCurrencyDollar className="text-green-400" />} label="Revenue" value={`₹${metrics.totalRevenue.toLocaleString()}`} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly Trend */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-6">Monthly Scrims</h3>
            <div className="flex items-end gap-2 h-40">
              {monthlyData.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-dark-400 font-bold">{m.count}</span>
                  <div className="w-full relative">
                    <div
                      className="w-full bg-gradient-to-t from-neon-cyan/80 to-primary-500/60 rounded-t-lg transition-all duration-500 hover:from-neon-cyan hover:to-primary-400"
                      style={{ height: `${Math.max((m.count / maxCount) * 120, 4)}px` }}
                    />
                  </div>
                  <span className="text-[10px] text-dark-500 font-medium">{m.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Status Distribution */}
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Event Status</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 rounded-lg bg-dark-850">
                <span className="text-dark-300 text-sm">Active / Upcoming</span>
                <Badge variant="success">{metrics.activeScrims}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-dark-850">
                <span className="text-dark-300 text-sm">Completed</span>
                <Badge variant="primary">{metrics.completedScrims}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-dark-850">
                <span className="text-dark-300 text-sm">Total Created</span>
                <Badge variant="neon">{metrics.totalScrims}</Badge>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-dark-850 border-t border-surface-border">
                <span className="text-dark-300 text-sm">Total Players Reached</span>
                <span className="text-white font-bold">{metrics.totalPlayers}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Community & Revenue */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Community Engagement</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                <HiUsers className="text-2xl text-primary-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{metrics.totalTeams}</p>
                <p className="text-xs text-dark-400">Total Teams registered</p>
              </div>
            </div>
            <div className="w-full bg-dark-800 rounded-full h-2">
              <div className="bg-gradient-to-r from-neon-cyan to-primary-500 h-2 rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(10, metrics.avgFillRate))}%` }}></div>
            </div>
            <p className="text-xs text-right text-dark-500 mt-1">Avg {metrics.avgFillRate.toFixed(1)}% Fill capacity</p>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-white mb-4">Earnings & Revenue</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <HiCurrencyDollar className="text-2xl text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-400">₹{metrics.organizerEarnings.toLocaleString()}</p>
                <p className="text-xs text-dark-400">My Take-home Earnings (₹{metrics.totalRevenue.toLocaleString()} Total Pool)</p>
              </div>
            </div>
            
            {/* Earnings Bar Chart representation */}
            {metrics.totalRevenue > 0 && (
              <div className="mb-6">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-green-400 font-bold">My Share</span>
                  <span className="text-dark-400">Platform Fee</span>
                </div>
                <div className="w-full bg-dark-800 rounded-full h-3 flex overflow-hidden">
                  <div className="bg-green-500 h-full" style={{ width: `${(metrics.organizerEarnings / metrics.totalRevenue) * 100}%` }}></div>
                  <div className="bg-dark-600 h-full" style={{ width: `${(metrics.platformFee / metrics.totalRevenue) * 100}%` }}></div>
                </div>
                <div className="flex justify-between text-[10px] mt-1">
                  <span className="text-dark-400">₹{metrics.organizerEarnings.toLocaleString()}</span>
                  <span className="text-dark-500">₹{metrics.platformFee.toLocaleString()}</span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 rounded-lg bg-dark-850">
                <span className="text-dark-300 text-sm">Paid Scrims</span>
                <span className="text-white font-bold">{myScrims.filter(s => s.entryFee > 0).length}</span>
              </div>
              <div className="flex justify-between items-center p-3 rounded-lg bg-dark-850">
                <span className="text-dark-300 text-sm">Free Scrims</span>
                <span className="text-white font-bold">{myScrims.filter(s => !s.entryFee || s.entryFee === 0).length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrganizerAnalytics;
