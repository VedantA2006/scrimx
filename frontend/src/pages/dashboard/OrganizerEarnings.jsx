import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/ui/Loader';
import StatsCard from '../../components/ui/StatsCard';
import EmptyState from '../../components/ui/EmptyState';
import Badge from '../../components/ui/Badge';
import { HiCurrencyDollar, HiCash, HiTrendingUp, HiDownload } from 'react-icons/hi';
import { Link } from 'react-router-dom';

const OrganizerEarnings = () => {
  const { user } = useAuth();
  const [scrims, setScrims] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    platformFees: 0,
    netProfit: 0
  });

  useEffect(() => {
    const fetchFinances = async () => {
      try {
        const { scrims: myScrims = [] } = await api.get('/scrims/manage/my');
        setScrims(myScrims);

        let rev = 0;
        myScrims.forEach(scrim => {
          if (scrim.entryFee > 0) {
            rev += scrim.entryFee * (scrim.filledSlots || 0);
          }
        });

        // Assuming 7% platform fee calculation
        const platformCut = rev * 0.07;
        const profit = rev - platformCut;

        setMetrics({
          totalRevenue: rev,
          platformFees: platformCut,
          netProfit: profit
        });

      } catch (error) {
        console.error('Failed to load financial data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFinances();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64"><Loader /></div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">Earnings</h1>
          <p className="text-dark-400 mt-1">Track your revenue, platform fees, and withdrawable balance</p>
        </div>

        {/* Top Balances */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card border-primary-500/20 bg-primary-500/5">
            <h3 className="text-sm font-medium text-dark-300 flex items-center gap-2 mb-2">
              <HiCurrencyDollar className="text-primary-400" /> Available Balance
            </h3>
            <div className="flex items-end justify-between">
              <p className="text-4xl font-bold text-white">₹{user?.organizerProfile?.balance || 0}</p>
              <button disabled className="btn-primary text-xs px-3 py-1.5 opacity-50 cursor-not-allowed">
                Coming soon
              </button>
            </div>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-dark-300 flex items-center gap-2 mb-2">
              <HiCash className="text-yellow-400" /> Pending Balance
            </h3>
            <div className="flex items-end justify-between">
              <p className="text-4xl font-bold text-white">₹{user?.organizerProfile?.pendingBalance || 0}</p>
              <Badge variant="warning" size="sm">Processing</Badge>
            </div>
          </div>
          <div className="card border-neon-cyan/20 bg-neon-cyan/5">
            <h3 className="text-sm font-medium text-dark-300 mb-2">
              Top Up Platform Credits
            </h3>
            <p className="text-xs text-dark-400 mb-4">
              Pay admin via UPI to add credits. Credits are used to publish scrims (30 credits per scrim).
            </p>
            <Link to="/organizer/points" className="btn-neon text-sm w-full text-center py-2 block">
              Add Credits →
            </Link>
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-white mt-8">Lifetime Revenue Metrics</h2>
          <p className="text-xs text-dark-500 mt-1">
            ⚠ Estimates based on filled slots. Actual received amounts depend on verified UTR payments.
          </p>
        </div>
        
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <StatsCard 
            icon={<HiTrendingUp />} 
            label="Gross Revenue" 
            value={`₹${metrics.totalRevenue.toFixed(0)}`}
            description="Total pool generated"
          />
          <StatsCard 
            icon={<HiDownload />} 
            label="Platform Fees" 
            value={`₹${metrics.platformFees.toFixed(0)}`}
            description="7% standard ScrimX fee"
          />
          <StatsCard 
            icon={<HiCurrencyDollar />} 
            label="Net Profit" 
            value={`₹${metrics.netProfit.toFixed(0)}`}
            description="Your direct earnings"
          />
        </div>

        {/* Recent Scrim Earnings */}
        <div className="card mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Earning Sources</h3>
            <button 
              onClick={() => setShowAll(!showAll)} 
              className="text-xs font-semibold text-neon-cyan hover:underline transition-all"
            >
              {showAll ? 'Show paid only' : 'Show all scrims'}
            </button>
          </div>
          {(() => {
            const displayScrims = showAll ? scrims : scrims.filter(s => s.entryFee > 0);
            if (displayScrims.length === 0) {
              return <EmptyState title="No paid scrims yet" description="Revenue will appear here when you host scrims with an entry fee." />;
            }
            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-surface-border text-sm text-dark-400">
                      <th className="pb-3 font-medium">Scrim Title</th>
                      <th className="pb-3 font-medium">Date</th>
                      <th className="pb-3 font-medium">Entry Fee</th>
                      <th className="pb-3 font-medium">Slots Filled</th>
                      <th className="pb-3 font-medium text-right">Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {displayScrims.slice(0, 10).map((scrim) => {
                      const rev = scrim.entryFee * (scrim.filledSlots || 0);
                      return (
                        <tr key={scrim._id} className="border-b border-surface-border/50 hover:bg-white/5 transition-colors">
                          <td className="py-3 text-white font-medium">{scrim.title}</td>
                          <td className="py-3 text-dark-300">{new Date(scrim.date).toLocaleDateString()}</td>
                          <td className="py-3 text-dark-300">₹{scrim.entryFee}</td>
                          <td className="py-3 text-dark-300">{scrim.filledSlots || 0}</td>
                          <td className="py-3 text-right font-semibold text-neon-cyan">₹{rev}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OrganizerEarnings;
