import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ScrimCard from '../../components/ui/ScrimCard';
import EmptyState from '../../components/ui/EmptyState';
import { HiLightningBolt, HiExclamation, HiCheckCircle, HiArchive, HiChevronDown, HiChevronUp } from 'react-icons/hi';

const SkeletonCard = () => (
  <div className="rounded-xl bg-dark-900 ring-1 ring-surface-border overflow-hidden animate-pulse">
    <div className="h-40 bg-dark-800" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-dark-800 rounded w-3/4" />
      <div className="h-3 bg-dark-800 rounded w-1/2" />
      <div className="h-3 bg-dark-800 rounded w-1/3" />
      <div className="flex gap-2 pt-2 border-t border-surface-border">
        <div className="h-5 bg-dark-800 rounded w-16" />
        <div className="h-5 bg-dark-800 rounded w-20" />
      </div>
    </div>
  </div>
);

const PlayerScrims = () => {
  const [registrations, setRegistrations] = useState([]);
  const [resultsMap, setResultsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [pastExpanded, setPastExpanded] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [regData, resData] = await Promise.all([
          api.get('/registrations/my').catch(() => ({ registrations: [] })),
          api.get('/results/my').catch(() => ({ results: [] }))
        ]);
        setRegistrations(regData.registrations || []);
        
        const rMap = {};
        (resData.results || []).forEach(r => {
          rMap[r.scrimId] = r;
        });
        setResultsMap(rMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Group registrations by status
  const actionRequired = registrations.filter(reg =>
    reg.status === 'pending' || reg.paymentStatus === 'pending_verification'
  );
  const confirmed = registrations.filter(reg => reg.status === 'approved');
  const pastOrRejected = registrations.filter(reg =>
    reg.status === 'rejected' || (reg.scrim && ['completed', 'cancelled'].includes(reg.scrim.status))
  );

  // Anything that doesn't fit above
  const categorizedIds = new Set([
    ...actionRequired.map(r => r._id),
    ...confirmed.map(r => r._id),
    ...pastOrRejected.map(r => r._id),
  ]);
  const uncategorized = registrations.filter(r => !categorizedIds.has(r._id));

  const sections = [
    {
      key: 'action',
      title: '🔔 Action Required',
      items: actionRequired,
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      icon: <HiExclamation className="text-amber-400" />,
    },
    {
      key: 'confirmed',
      title: '✅ Confirmed Slots',
      items: confirmed,
      badgeClass: 'bg-green-500/10 text-green-400 border-green-500/30',
      icon: <HiCheckCircle className="text-green-400" />,
    },
    {
      key: 'uncategorized',
      title: 'Other',
      items: uncategorized,
      badgeClass: 'bg-dark-800 text-dark-300 border-dark-700',
      icon: <HiLightningBolt className="text-dark-400" />,
    },
    {
      key: 'past',
      title: '📁 Past & Rejected',
      items: pastOrRejected,
      badgeClass: 'bg-dark-800 text-dark-400 border-dark-700',
      icon: <HiArchive className="text-dark-500" />,
      collapsible: true,
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-display font-bold text-white">My Joined Scrims</h1>
        <p className="text-dark-400">Manage your scrim participation and check-ins</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3].map(i => <SkeletonCard key={i} />)}
        </div>
      ) : registrations.length === 0 ? (
        <EmptyState 
          icon={<HiLightningBolt className="text-4xl text-dark-500" />}
          title="No scrims joined"
          description="You haven't registered for any scrims yet. Head over to the marketplace to find some action!"
          action={{ label: 'Explore Marketplace', href: '/marketplace' }}
        />
      ) : (
        <div className="space-y-8">
          {sections.map(section => {
            if (section.items.length === 0) return null;

            const isCollapsed = section.collapsible && !pastExpanded;

            return (
              <div key={section.key}>
                {/* Section Header */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    {section.icon}
                    <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${section.badgeClass}`}>
                    {section.items.length}
                  </span>
                  <div className="h-px flex-1 bg-surface-border" />
                  {section.collapsible && (
                    <button
                      onClick={() => setPastExpanded(!pastExpanded)}
                      className="text-dark-400 hover:text-white transition-colors p-1"
                    >
                      {pastExpanded ? <HiChevronUp /> : <HiChevronDown />}
                    </button>
                  )}
                </div>

                {/* Cards Grid */}
                {!isCollapsed && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {section.items.map(reg => (
                      reg.scrim ? <ScrimCard key={reg._id} scrim={reg.scrim} registration={reg} result={resultsMap[reg.scrim._id || reg.scrim]} /> : null
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default PlayerScrims;
