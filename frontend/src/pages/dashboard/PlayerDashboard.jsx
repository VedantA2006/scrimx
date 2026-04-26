import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatsCard from '../../components/ui/StatsCard';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import Loader from '../../components/ui/Loader';
import { HiCollection, HiClock, HiUserGroup, HiClipboardList, HiCalendar, HiArrowRight, HiCheckCircle, HiLightningBolt, HiStar, HiTrendingUp } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import OnboardingModal from '../../components/ui/OnboardingModal';

const formatRelativeDate = (dateStr, timeStr) => {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Date TBD';
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

    const time = timeStr || '';
    if (diffDays === 0) return `Today at ${time || 'TBD'}`;
    if (diffDays === 1) return `Tomorrow at ${time || 'TBD'}`;
    return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${time || 'TBD'}`;
  } catch {
    return 'Date TBD';
  }
};

const PlayerDashboard = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingSlots, setPendingSlots] = useState(0);
  const [resultStats, setResultStats] = useState({ totalKills: 0, totalScrims: 0, bestPlace: null, top3: 0, wins: 0 });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [res, regsData, resData] = await Promise.all([
        api.get('/users/dashboard'),
        api.get('/registrations/my').catch(() => ({ registrations: [] })),
        api.get('/results/my').catch(() => ({ results: [] })),
      ]);
      setData(res);
      const pending = (regsData.registrations || []).filter(r => r.status === 'pending' || r.paymentStatus === 'pending_verification');
      setPendingSlots(pending.length);
      
      const results = resData.results || [];
      const totalKills = results.reduce((sum, r) => sum + (r.myKills || 0), 0);
      const bestPlace = results.length > 0 ? Math.min(...results.filter(r => r.teamPlace).map(r => r.teamPlace)) : null;
      const top3 = results.filter(r => r.teamPlace <= 3).length;
      const wins = results.filter(r => r.teamPlace === 1).length;
      setResultStats({ totalKills, totalScrims: results.length, bestPlace, top3, wins });
    } catch (error) {
      toast.error('Dashboard failed to load. Try refreshing.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-pulse">
            <div>
              <div className="h-8 bg-dark-800 rounded w-64 mb-2" />
              <div className="h-4 bg-dark-800 rounded w-48" />
            </div>
            <div className="h-10 bg-dark-800 rounded w-32" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-dark-800 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            <div className="h-64 bg-dark-800 rounded-xl" />
            <div className="h-64 bg-dark-800 rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { stats, upcomingScrims, recentActivity } = data || { 
    stats: { activeScrims: 0, registrations: 0, teams: 0, totalKills: 0, totalScrims: 0, bestPlace: null, totalTopThree: 0, totalWins: 0 },
    upcomingScrims: [],
    recentActivity: []
  };

  const profileItems = [
    { label: 'Set your IGN', done: !!user?.ign, field: 'In-Game Name', link: '/dashboard/profile' },
    { label: 'Add your UID', done: !!user?.uid, field: 'Game UID', link: '/dashboard/profile' },
    { label: 'Join or create a team', done: stats.teams > 0, field: 'Team', link: '/dashboard/teams' },
  ];
  const profileDone = profileItems.filter(i => i.done).length;

  return (
    <DashboardLayout>
      <OnboardingModal />
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">
              Welcome back, <span className="text-gradient">{user?.username}</span>
            </h1>
            <p className="text-dark-400 mt-1">Here's what's happening with your scrims</p>
          </div>
          <Link to="/marketplace" className="btn-neon text-sm inline-flex items-center gap-2">
            Browse Scrims <HiArrowRight />
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatsCard 
            icon={<HiLightningBolt className="text-red-400" />} 
            label="Total Kills" 
            value={resultStats.totalKills} 
          />
          <StatsCard 
            icon={<HiCollection className="text-neon-cyan" />} 
            label="Scrims Played" 
            value={resultStats.totalScrims} 
          />
          <StatsCard 
            icon={<HiStar className="text-yellow-400" />} 
            label="Best Finish" 
            value={resultStats.bestPlace ? `#${resultStats.bestPlace}` : '—'} 
          />
          <StatsCard 
            icon={<HiTrendingUp className="text-green-400" />} 
            label="Top 3 Finishes" 
            value={resultStats.top3} 
          />
          <StatsCard 
            icon={<HiUserGroup className="text-primary-400" />} 
            label="My Teams" 
            value={stats.teams || 0} 
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upcoming Scrims */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <HiCalendar className="text-neon-cyan" /> Upcoming Scrims
              </h3>
              <Link to="/dashboard/scrims" className="text-xs text-neon-cyan hover:underline">View all</Link>
            </div>
            
            {upcomingScrims.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <span className="text-5xl mb-4">🎮</span>
                <h4 className="text-white font-bold mb-1">No scrims yet</h4>
                <p className="text-dark-400 text-sm mb-4">Join your first scrim and start competing</p>
                <Link to="/marketplace" className="btn-neon text-sm px-5 py-2">
                  Browse Scrims
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingScrims.map(scrim => (
                  <Link key={scrim._id} to={`/scrims/${scrim._id}`} className="block p-4 rounded-xl border border-surface-border bg-dark-850 hover:border-primary-500/30 transition-colors">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-white">{scrim.title}</h4>
                        <p className="text-sm text-dark-300 mt-1">{formatRelativeDate(scrim.date, scrim.startTime)}</p>
                      </div>
                      <Badge variant="info" size="sm">{scrim.format?.toUpperCase() || 'SCRIM'}</Badge>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <HiClipboardList className="text-neon-cyan" /> Recent Activity
              </h3>
            </div>
            
            {recentActivity.length === 0 ? (
              <EmptyState
                title="No recent activity"
                description="Your registration and match history will appear here"
              />
            ) : (
              <div className="space-y-3">
                {recentActivity.map(activity => (
                  <div key={activity._id} className="p-3 rounded-lg border border-surface-border bg-dark-850 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{activity.title}</p>
                      <p className="text-xs text-dark-400 mt-1">{new Date(activity.date).toLocaleDateString()}</p>
                    </div>
                    <Badge variant={activity.status === 'confirmed' ? 'success' : 'warning'}>{activity.status}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Profile Completion */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Complete Your Profile</h3>
            <span className="text-xs font-bold text-dark-400">{profileDone}/{profileItems.length} complete</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-neon-cyan to-primary-500 rounded-full transition-all duration-500"
              style={{ width: `${(profileDone / profileItems.length) * 100}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {profileItems.map((item) => (
              <div key={item.label} className={`p-4 rounded-xl border ${item.done ? 'border-green-500/20 bg-green-500/5' : 'border-surface-border bg-dark-850'}`}>
                <div className="flex items-center gap-2 mb-1">
                  {item.done ? (
                    <HiCheckCircle className="text-green-400 text-lg flex-shrink-0" />
                  ) : (
                    <div className="w-4.5 h-4.5 rounded-full border-2 border-dark-600 flex-shrink-0" />
                  )}
                  <span className="text-sm font-medium text-white">{item.label}</span>
                </div>
                {item.done ? (
                  <p className="text-xs text-green-400 ml-6">✓ Completed</p>
                ) : (
                  <Link to={item.link} className="text-xs text-neon-cyan hover:underline ml-6 inline-flex items-center gap-1">
                    Complete → 
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PlayerDashboard;
