import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import DashboardLayout from '../../components/layout/DashboardLayout';
import ScrimCard from '../../components/ui/ScrimCard';
import EmptyState from '../../components/ui/EmptyState';
import LoadingButton from '../../components/ui/LoadingButton';
import { HiLightningBolt, HiPlus, HiChevronDown, HiChevronUp } from 'react-icons/hi';

const SkeletonScrimCard = () => (
  <div className="card animate-pulse">
    <div className="h-40 bg-dark-800 rounded-lg mb-4" />
    <div className="h-6 bg-dark-800 rounded w-3/4 mb-2" />
    <div className="h-4 bg-dark-800 rounded w-1/2 mb-4" />
    <div className="grid grid-cols-2 gap-2 mb-4">
      <div className="h-8 bg-dark-800 rounded" />
      <div className="h-8 bg-dark-800 rounded" />
    </div>
    <div className="h-10 bg-dark-800 rounded w-full" />
  </div>
);

const OrganizerScrims = () => {
  const [scrims, setScrims] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'publish'|'delete'|'highlight'|'promote', scrimId: string, cost: number }
  const [actionLoading, setActionLoading] = useState(false);
  const [showPast, setShowPast] = useState(false);

  const navigate = useNavigate();

  const fetchScrims = async () => {
    try {
      const data = await api.get('/scrims/manage/my');
      setScrims(data.scrims || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScrims();
  }, []);

  const handlePublish = async (id) => {
    setActionLoading(true);
    try {
      await api.put(`/scrims/${id}/publish`);
      toast.success('Scrim published! 30 points deducted.');
      setConfirmAction(null);
      fetchScrims();
    } catch (err) {
      if (err.message?.includes('points') || err.message?.includes('insufficient') || err.message?.includes('402') || err.message?.includes('Payment Required')) {
        toast.error('Insufficient points! Redirecting to wallet...');
        navigate('/organizer/points');
      } else {
        toast.error(err.message || 'Failed to publish');
      }
      setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setActionLoading(true);
    try {
      await api.delete(`/scrims/${id}`);
      toast.success('Scrim deleted!');
      setConfirmAction(null);
      fetchScrims();
    } catch (err) {
      toast.error(err.message || 'Failed to delete');
      setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handleHighlight = async (id) => {
    setActionLoading(true);
    try {
      await api.put(`/scrims/${id}/highlight`);
      toast.success('Scrim highlighted successfully!');
      setConfirmAction(null);
      fetchScrims();
    } catch (err) {
      if (err.message?.includes('credits') || err.message?.includes('402')) {
        toast.error('Insufficient points! Redirecting to wallet...');
        navigate('/organizer/points');
      } else {
        toast.error(err.message || 'Failed to highlight');
      }
      setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromote = async (id) => {
    setActionLoading(true);
    try {
      await api.put(`/scrims/${id}/promote`);
      toast.success('Scrim promoted successfully!');
      setConfirmAction(null);
      fetchScrims();
    } catch (err) {
      if (err.message?.includes('credits') || err.message?.includes('402')) {
        toast.error('Insufficient points! Redirecting to wallet...');
        navigate('/organizer/points');
      } else {
        toast.error(err.message || 'Failed to promote');
      }
      setConfirmAction(null);
    } finally {
      setActionLoading(false);
    }
  };

  const renderActionConfirm = (scrim) => {
    if (!confirmAction || confirmAction.scrimId !== scrim._id) return null;
    
    if (confirmAction.type === 'publish') {
      return (
        <div className="mt-4 p-4 border-t border-surface-border bg-dark-900/50 animate-in slide-in-from-top-2 rounded-b-2xl">
          <p className="text-sm text-white mb-3 text-center">This will deduct <span className="font-bold text-neon-cyan">30 points</span> from your wallet. Confirm publish?</p>
          <div className="flex gap-2">
            <LoadingButton loading={actionLoading} onClick={() => handlePublish(scrim._id)} variant="primary" className="flex-1 py-2 text-xs">
              Confirm Publish
            </LoadingButton>
            <button disabled={actionLoading} onClick={() => setConfirmAction(null)} className="btn-ghost flex-1 py-2 text-xs">
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (confirmAction.type === 'delete') {
      return (
        <div className="mt-4 p-4 border-t border-surface-border bg-red-500/5 animate-in slide-in-from-top-2 rounded-b-2xl">
          <p className="text-sm text-white mb-3 text-center">Delete <span className="font-bold text-red-400">{scrim.title}</span>? This cannot be undone.</p>
          <div className="flex gap-2">
            <LoadingButton loading={actionLoading} onClick={() => handleDelete(scrim._id)} variant="danger" className="flex-1 py-2 text-xs">
              Yes, Delete
            </LoadingButton>
            <button disabled={actionLoading} onClick={() => setConfirmAction(null)} className="btn-ghost flex-1 py-2 text-xs hover:bg-dark-800">
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (confirmAction.type === 'highlight') {
      return (
        <div className="mt-4 p-4 border-t border-surface-border bg-yellow-500/5 animate-in slide-in-from-top-2 rounded-b-2xl">
          <p className="text-sm text-white mb-3 text-center">Highlighting costs <span className="font-bold text-yellow-500">10 points</span> (unless overridden). Confirm?</p>
          <div className="flex gap-2">
            <LoadingButton loading={actionLoading} onClick={() => handleHighlight(scrim._id)} variant="primary" className="flex-1 py-2 text-xs bg-yellow-500 hover:bg-yellow-600 border-none text-dark-950">
              Confirm Highlight
            </LoadingButton>
            <button disabled={actionLoading} onClick={() => setConfirmAction(null)} className="btn-ghost flex-1 py-2 text-xs hover:bg-dark-800">
              Cancel
            </button>
          </div>
        </div>
      );
    }

    if (confirmAction.type === 'promote') {
      return (
        <div className="mt-4 p-4 border-t border-surface-border bg-orange-500/5 animate-in slide-in-from-top-2 rounded-b-2xl">
          <p className="text-sm text-white mb-3 text-center">Promoting costs <span className="font-bold text-orange-500">20 points</span> (unless overridden). Confirm?</p>
          <div className="flex gap-2">
            <LoadingButton loading={actionLoading} onClick={() => handlePromote(scrim._id)} variant="primary" className="flex-1 py-2 text-xs bg-orange-500 hover:bg-orange-600 border-none text-white">
              Confirm Promote
            </LoadingButton>
            <button disabled={actionLoading} onClick={() => setConfirmAction(null)} className="btn-ghost flex-1 py-2 text-xs hover:bg-dark-800">
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // Grouping Logic
  const needsAttention = scrims.filter(s => s.status === 'live' || s.isEnded === true);
  const active = scrims.filter(s => ['registrations_open', 'full', 'locked', 'published'].includes(s.status) && !s.isEnded);
  const past = scrims.filter(s => ['completed', 'cancelled'].includes(s.status));
  // Any drafts or others fall into active if not matched
  const otherActive = scrims.filter(s => !needsAttention.includes(s) && !active.includes(s) && !past.includes(s));
  const allActive = [...active, ...otherActive];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-white">My Hosted Scrims</h1>
            <p className="text-dark-400">Manage your tournaments, rooms, and results</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <SkeletonScrimCard key={i} />)}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">My Hosted Scrims</h1>
          <p className="text-dark-400">Manage your tournaments, rooms, and results</p>
        </div>
        <Link to="/organizer/scrims/create" className="btn-primary flex items-center gap-2">
          <HiPlus /> Create Scrim
        </Link>
      </div>

      {scrims.length === 0 ? (
        <EmptyState 
          icon={<HiLightningBolt className="text-4xl text-dark-500" />}
          title="No scrims hosted"
          description="You haven't created any scrims yet. Start hosting to build your brand!"
          action={{ label: 'Create First Scrim', href: '/organizer/scrims/create' }}
        />
      ) : (
        <div className="space-y-10">
          
          {/* Needs Attention */}
          {needsAttention.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-orange-400">⚡</span> Needs Attention
                </h2>
                <span className="bg-orange-500/20 text-orange-400 text-xs font-bold px-2.5 py-0.5 rounded-full">{needsAttention.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {needsAttention.map(scrim => (
                  <div key={scrim._id} className="relative">
                    <ScrimCard 
                      scrim={scrim} 
                      isOrganizerView 
                      onPublish={() => setConfirmAction({ type: 'publish', scrimId: scrim._id })}
                      onDelete={() => setConfirmAction({ type: 'delete', scrimId: scrim._id })}
                      onHighlight={() => setConfirmAction({ type: 'highlight', scrimId: scrim._id })}
                      onPromote={() => setConfirmAction({ type: 'promote', scrimId: scrim._id })}
                    />
                    {renderActionConfirm(scrim)}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Active */}
          {allActive.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="text-neon-cyan">📋</span> Active
                </h2>
                <span className="bg-dark-800 text-dark-300 text-xs font-bold px-2.5 py-0.5 rounded-full">{allActive.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allActive.map(scrim => (
                  <div key={scrim._id} className="relative">
                    <ScrimCard 
                      scrim={scrim} 
                      isOrganizerView 
                      onPublish={() => setConfirmAction({ type: 'publish', scrimId: scrim._id })}
                      onDelete={() => setConfirmAction({ type: 'delete', scrimId: scrim._id })}
                      onHighlight={() => setConfirmAction({ type: 'highlight', scrimId: scrim._id })}
                      onPromote={() => setConfirmAction({ type: 'promote', scrimId: scrim._id })}
                    />
                    {renderActionConfirm(scrim)}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section className="border-t border-surface-border pt-6">
              <button 
                onClick={() => setShowPast(!showPast)}
                className="flex items-center gap-3 w-full group"
              >
                <h2 className="text-lg font-bold text-dark-300 group-hover:text-white transition-colors flex items-center gap-2">
                  <span className="text-dark-500 group-hover:text-dark-400">✅</span> Past Scrims
                </h2>
                <span className="bg-dark-850 text-dark-400 text-xs font-bold px-2.5 py-0.5 rounded-full">{past.length}</span>
                <div className="h-px bg-surface-border flex-1 mx-2"></div>
                <div className="text-dark-400 group-hover:text-white transition-colors flex items-center gap-1 text-sm font-medium">
                  {showPast ? 'Hide' : 'Show'} <span className="hidden sm:inline">past scrims</span>
                  {showPast ? <HiChevronUp /> : <HiChevronDown />}
                </div>
              </button>
              
              {showPast && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 animate-in slide-in-from-top-4">
                  {past.map(scrim => (
                    <div key={scrim._id} className="relative opacity-75 hover:opacity-100 transition-opacity">
                      <ScrimCard 
                        scrim={scrim} 
                        isOrganizerView 
                        onPublish={() => setConfirmAction({ type: 'publish', scrimId: scrim._id })}
                        onDelete={() => setConfirmAction({ type: 'delete', scrimId: scrim._id })}
                        onHighlight={() => setConfirmAction({ type: 'highlight', scrimId: scrim._id })}
                        onPromote={() => setConfirmAction({ type: 'promote', scrimId: scrim._id })}
                      />
                      {renderActionConfirm(scrim)}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

        </div>
      )}

    </DashboardLayout>
  );
};

export default OrganizerScrims;
