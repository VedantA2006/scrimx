import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatsCard from '../../components/ui/StatsCard';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { HiCalendar, HiCurrencyDollar, HiChartBar, HiUsers, HiPlusCircle, HiArrowRight, HiStar, HiLightningBolt, HiCheckCircle, HiTrendingUp } from 'react-icons/hi';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

const OrganizerDashboard = () => {
  const { user } = useAuth();
  const org = user?.organizerProfile;
  const [activeScrims, setActiveScrims] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyScrims = async () => {
      try {
        const data = await api.get('/scrims/manage/my');
        const active = (data.scrims || []).filter(s => 
          ['published', 'registrations_open', 'full', 'locked', 'live'].includes(s.status)
        );
        setActiveScrims(active);
      } catch (err) {
        console.error("Failed to fetch scrims", err);
      } finally {
        setLoading(false);
      }
    };
    if (org) {
      fetchMyScrims();
    } else {
      setLoading(false);
    }
  }, [org]);

  // Sort: isEnded items first
  const sortedScrims = [...activeScrims].sort((a, b) => {
    const getIsEnded = (scrim) => {
      if (scrim.date && scrim.endTime) {
        try {
          const scrimDate = new Date(scrim.date);
          const [hours, minutes] = scrim.endTime.split(':').map(Number);
          scrimDate.setHours(hours, minutes, 0, 0);
          return new Date() > scrimDate;
        } catch { return false; }
      }
      return false;
    };
    return getIsEnded(b) - getIsEnded(a);
  });

  const isNewOrganiser = (org?.totalScrimsHosted || 0) === 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-display font-bold text-white">
                {org?.displayName || user?.username}'s Dashboard
              </h1>
              {org?.isVerified && <Badge variant="neon" size="sm">✓ Verified</Badge>}
              {org?.plan === 'elite' ? (
                <Badge variant="neon" size="sm">⚡ Elite</Badge>
              ) : (
                <Link to="/organizer/plans" className="text-[10px] font-bold bg-gradient-to-r from-neon-cyan/10 to-primary-500/10 text-neon-cyan border border-neon-cyan/20 px-2 py-0.5 rounded-full hover:bg-neon-cyan/20 transition-colors">
                  ⚡ Upgrade
                </Link>
              )}
            </div>
            <p className="text-dark-400 mt-1">Manage your scrims and grow your brand</p>
          </div>
          <Link to="/organizer/scrims/create" className="btn-neon text-sm inline-flex items-center gap-2">
            <HiPlusCircle /> Create Scrim
          </Link>
        </div>

        {/* New Organiser Onboarding Banner */}
        {isNewOrganiser && (
          <div className="relative overflow-hidden rounded-2xl p-6 bg-gradient-to-r from-primary-900/40 via-dark-900 to-neon-cyan/10 border border-neon-cyan/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-cyan/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative z-10">
              <h2 className="text-xl font-bold text-white mb-1">🚀 Ready to host your first scrim?</h2>
              <p className="text-dark-300 text-sm mb-4">Set up your UPI ID and create your first scrim in 2 minutes.</p>
              <div className="flex flex-wrap gap-3">
                <Link to="/organizer/profile" className="btn-ghost text-sm px-4 py-2">Set Up Profile</Link>
                <Link to="/organizer/scrims/create" className="btn-neon text-sm px-4 py-2">Create First Scrim</Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <StatsCard 
            icon={<HiCalendar className="text-neon-cyan" />} 
            label="Scrims Hosted" 
            value={org?.totalScrimsHosted || 0} 
          />
          <StatsCard 
            icon={<HiCheckCircle className="text-primary-400" />} 
            label="Completion Rate" 
            value={`${org?.completionRate || 100}%`} 
          />
          <StatsCard 
            icon={<HiTrendingUp className={(org?.trustScore || 50) >= 70 ? 'text-green-400' : (org?.trustScore || 50) >= 40 ? 'text-amber-400' : 'text-red-400'} />} 
            label="Trust Score" 
            value={
              <span className={(org?.trustScore || 50) >= 70 ? 'text-green-400' : (org?.trustScore || 50) >= 40 ? 'text-amber-400' : 'text-red-400'}>
                {org?.trustScore || 50}/100
              </span>
            } 
          />
          <StatsCard 
            icon={<HiCurrencyDollar className="text-green-400" />} 
            label="Total Prize Given" 
            value={`₹${org?.totalPrizeDistributed?.toLocaleString() || 0}`} 
          />
          <Link to="/organizer/points" className="block transition-transform hover:-translate-y-1">
            <StatsCard 
              icon={<HiLightningBolt className="text-primary-500" />} 
              label="Points Balance" 
              value={`${org?.pointsWallet?.balance || 0} pts`} 
            />
          </Link>
        </div>

        {/* Rating Banner */}
        {org?.rating > 0 && org?.ratingCount > 0 && (
          <div className="card bg-gradient-to-r from-dark-900 to-primary-900/10 border-primary-500/20 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                <HiStar className="text-yellow-400 text-2xl" />
              </div>
              <div>
                <div className="flex text-yellow-400 text-lg mb-1">
                  {[1,2,3,4,5].map(star => (
                    <HiStar key={star} className={star <= Math.round(org.rating) ? 'text-yellow-400' : 'text-dark-700'} />
                  ))}
                </div>
                <p className="text-sm text-dark-300">
                  <strong className="text-white">Rated {org.rating.toFixed(1)}/5</strong> by {org.ratingCount} players
                </p>
              </div>
            </div>
            <div className="w-full sm:w-48">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-dark-400 font-bold uppercase">Trust Score</span>
                <span className={`font-bold ${(org?.trustScore || 50) >= 70 ? 'text-green-400' : (org?.trustScore || 50) >= 40 ? 'text-amber-400' : 'text-red-400'}`}>{org.trustScore || 50}/100</span>
              </div>
              <div className="h-2 w-full bg-dark-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${(org?.trustScore || 50) >= 70 ? 'bg-green-400' : (org?.trustScore || 50) >= 40 ? 'bg-amber-400' : 'bg-red-400'}`} style={{ width: `${org.trustScore || 50}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Scrims */}
          <div className="card max-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <HiCalendar className="text-neon-cyan" /> Active Scrims
              </h3>
              <Link to="/organizer/scrims" className="text-xs text-neon-cyan hover:underline">View all</Link>
            </div>
            
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-dark-400 text-sm animate-pulse">Loading...</div>
              </div>
            ) : sortedScrims.length === 0 ? (
              <EmptyState
                title="No active scrims"
                description="Create your first scrim and start growing"
                action={
                  <Link to="/organizer/scrims/create" className="btn-primary text-sm px-4 py-2">
                    Create Scrim
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar flex-1">
                {sortedScrims.map(scrim => {
                  let isEnded = false;
                  if (scrim.date && scrim.endTime) {
                    try {
                      const scrimDate = new Date(scrim.date);
                      const [hours, minutes] = scrim.endTime.split(':').map(Number);
                      scrimDate.setHours(hours, minutes, 0, 0);
                      isEnded = new Date() > scrimDate;
                    } catch (e) {
                      isEnded = false;
                    }
                  }

                  return (
                    <Link key={scrim._id} to={`/organizer/scrims/${scrim._id}/edit`} className={`flex flex-col p-4 rounded-xl transition-colors border ${isEnded ? 'bg-dark-800 border-l-4 border-l-orange-500 border-t-surface-border border-r-surface-border border-b-surface-border' : 'bg-dark-850 hover:bg-dark-800 border-surface-border'}`}>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-white text-sm max-w-[180px] truncate" title={scrim.title}>{scrim.title}</span>
                        <div className="flex items-center gap-2">
                          {isEnded ? (
                            <>
                              <Badge variant="default" size="xs">COMPLETED</Badge>
                              <span className="text-[10px] font-bold bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded inline-flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                                DECLARE RESULT
                              </span>
                            </>
                          ) : (
                            <Badge variant="info" size="xs">{scrim.status.replace('_', ' ').toUpperCase()}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between text-xs text-dark-300">
                        <span>{new Date(scrim.date).toLocaleDateString()} @ {scrim.startTime}</span>
                        <span>{scrim.filledSlots || 0}/{scrim.slotCount} Slots</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Earnings Overview */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <HiCurrencyDollar className="text-neon-cyan" /> Earnings Overview
              </h3>
              <Link to="/organizer/earnings" className="text-xs text-neon-cyan hover:underline">Details</Link>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-dark-850 border border-surface-border">
                <div>
                  <p className="text-sm text-dark-400">Available Balance</p>
                  <p className="text-xl font-bold text-white">₹{org?.balance || 0}</p>
                </div>
                <Link to="/organizer/withdrawals" className="btn-ghost text-xs px-3 py-1.5">Withdraw</Link>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-dark-850 border border-surface-border">
                <div>
                  <p className="text-sm text-dark-400">Total Scrims Hosted</p>
                  <p className="text-xl font-bold text-neon-cyan">{org?.totalScrimsHosted || 0}</p>
                </div>
                <Badge variant="neon" size="sm">Lifetime</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Status */}
        <div className="card">
          <h3 className="text-lg font-semibold text-white mb-4">Profile Setup</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[
              { label: 'Display Name', done: !!org?.displayName },
              { label: 'Bio', done: !!org?.bio },
              { label: 'Logo', done: !!org?.logo },
              { label: 'Social Links', done: !!(org?.discord || org?.telegram) },
            ].map((item) => (
              <div key={item.label} className={`p-4 rounded-xl border ${item.done ? 'border-green-500/20 bg-green-500/5' : 'border-surface-border bg-dark-850'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${item.done ? 'bg-green-400' : 'bg-dark-600'}`} />
                  <span className="text-sm font-medium text-white">{item.label}</span>
                </div>
                <p className="text-xs text-dark-400 mt-1">{item.done ? '✓ Done' : 'Not set'}</p>
              </div>
            ))}
          </div>
          <Link to="/organizer/profile" className="text-sm text-neon-cyan hover:underline mt-4 inline-flex items-center gap-1">
            Edit Profile <HiArrowRight />
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrganizerDashboard;
