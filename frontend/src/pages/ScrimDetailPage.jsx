import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../lib/api';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Badge from '../components/ui/Badge';
import toast from 'react-hot-toast';
import QRCode from 'react-qr-code';
import Modal from '../components/ui/Modal';
import Loader, { PageLoader } from '../components/ui/Loader';
import LoadingButton from '../components/ui/LoadingButton';
import { useAuth } from '../context/AuthContext';
import { HiCalendar, HiClock, HiUsers, HiCurrencyDollar, HiStar, HiCheckCircle, HiMap, HiViewGrid, HiClipboardList, HiShieldCheck, HiArrowLeft, HiShare, HiExternalLink, HiChevronDown, HiChevronUp, HiOutlineCheck, HiOutlineX, HiOutlineLockClosed, HiCheck } from 'react-icons/hi';
import { useSocket } from '../context/SocketContext';
import LiveChat from '../components/scrims/LiveChat';
import SlotRequestModal from '../components/scrims/SlotRequestModal';

const statusConfig = {
  draft: { label: 'Draft', variant: 'default' },
  published: { label: 'Published', variant: 'info' },
  registrations_open: { label: 'Registrations Open', variant: 'success' },
  full: { label: 'Registrations Completed', variant: 'warning' },
  locked: { label: 'Locked', variant: 'orange' },
  live: { label: '🔴 LIVE', variant: 'danger' },
  completed: { label: 'Completed', variant: 'default' },
  cancelled: { label: 'Cancelled', variant: 'danger' },
};

const ScrimDetailPage = () => {
  const { id } = useParams();
  const { isAuthenticated, user } = useAuth();
  const [scrim, setScrim] = useState(null);
  const [idps, setIdps] = useState([]);
  const [results, setResults] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myPendingStatus, setMyPendingStatus] = useState(null);
  const [myRegistration, setMyRegistration] = useState(null);
  const { socket } = useSocket();
  
  // Registration Modal State
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [myTeams, setMyTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [fetchingTeams, setFetchingTeams] = useState(false);
  const [utr, setUtr] = useState('');
  const [screenshot, setScreenshot] = useState(null);
  const [showStickyBar, setShowStickyBar] = useState(true);
  const sidebarJoinRef = useRef(null);

  // Dispute state
  const [disputeText, setDisputeText] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);
  const [disputeSubmitted, setDisputeSubmitted] = useState(false);
  const [slotListOpen, setSlotListOpen] = useState(true);
  const [expandedResultTeams, setExpandedResultTeams] = useState({});
  const [checkingIn, setCheckingIn] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    if (!socket) return;
    const handleRoom = (data) => {
      if (data.scrimId === id) {
        toast.success(`Room ID released for Match ${data.matchNumber}!`);
        api.get(`/scrims/${id}/idp`).then(res => {
          if (res && res.idps) setIdps(res.idps);
        }).catch(()=>{});
      }
    };
    socket.on('room_released', handleRoom);
    return () => socket.off('room_released', handleRoom);
  }, [socket, id]);

  useEffect(() => {
    const fetchScrim = async () => {
      try {
        const data = await api.get(`/scrims/${id}`);
        setScrim(data.scrim);
        
        // If authenticated and the scrim is published/open/live, attempt to fetch IDP
        if (isAuthenticated && data.scrim && ['registrations_open', 'full', 'locked', 'live', 'completed'].includes(data.scrim.status)) {
          try {
            const idpData = await api.get(`/scrims/${id}/idp`);
            if (idpData && idpData.idps) {
              setIdps(idpData.idps);
            }
          } catch (idpErr) {
            // Silently fail if forbidden (not registered) or other errors
            console.log('IDP fetch hidden:', idpErr.message);
          }
        }

        // Fetch Results (pre-released or finalized)
        try {
          const resData = await api.get(`/results/scrim/${id}`);
          if (resData && resData.result && (resData.result.status === 'pre_released' || resData.result.status === 'finalized')) {
            setResults(resData.result);
          }
        } catch (resErr) {
          // No results yet or draft — silently ignore
        }

        // Fetch Public Slot List (no auth required)
        try {
          const regData = await api.get(`/registrations/scrim/${id}/public`);
          if (regData && regData.registrations) {
            setRegistrations(regData.registrations);
          }
        } catch (regErr) {
          console.log('Slot list not available');
        }

        // Fetch user's teams to check if already registered
        if (isAuthenticated) {
          try {
            const [teamsData, myRegs] = await Promise.all([
              api.get('/teams/manage/my').catch(() => ({ teams: [] })),
              api.get('/registrations/my').catch(() => ({ registrations: [] }))
            ]);
            setMyTeams(teamsData.teams || []);
            
            const myReg = (myRegs.registrations || []).find(r => (r.scrim?._id === id || r.scrim === id));
            if (myReg) {
              setMyPendingStatus(myReg.status);
              setMyRegistration(myReg);
            }
          } catch (e) {}
        }
      } catch (err) {
        setError(err.message || 'Scrim not found');
      } finally {
        setLoading(false);
      }
    };
    fetchScrim();
  }, [id, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 pb-20 md:pb-0">
        <Navbar />
        {/* Banner Skeleton */}
        <div className="relative h-48 md:h-64 bg-dark-900 mt-16 animate-pulse" />
        
        <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-10 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Title Block Skeleton */}
              <div className="card space-y-4 animate-pulse">
                <div className="flex gap-2">
                  <div className="w-20 h-6 bg-dark-800 rounded-full" />
                  <div className="w-16 h-6 bg-dark-800 rounded-full" />
                </div>
                <div className="w-3/4 h-8 bg-dark-800 rounded" />
                <div className="w-1/2 h-5 bg-dark-800 rounded" />
                <div className="flex items-center gap-3 mt-4">
                  <div className="w-10 h-10 bg-dark-800 rounded-full" />
                  <div className="w-32 h-5 bg-dark-800 rounded" />
                </div>
              </div>
              
              {/* Details Block Skeleton */}
              <div className="card space-y-4 animate-pulse">
                <div className="w-24 h-6 bg-dark-800 rounded mb-4" />
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex flex-col gap-2">
                      <div className="w-16 h-4 bg-dark-800 rounded" />
                      <div className="w-24 h-5 bg-dark-800 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Sidebar Skeleton */}
            <div className="card space-y-6 animate-pulse h-64">
              <div className="w-full h-8 bg-dark-800 rounded mx-auto" />
              <div className="w-2/3 h-12 bg-dark-800 rounded mx-auto" />
              <div className="w-full h-12 bg-dark-800 rounded-xl" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !scrim) {
    return (
      <div className="min-h-screen bg-dark-950">
        <Navbar />
        <div className="pt-24 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">Scrim Not Found</h1>
          <p className="text-dark-400 mb-4">{error}</p>
          <Link to="/marketplace" className="btn-primary text-sm">Back to Marketplace</Link>
        </div>
      </div>
    );
  }

  const handleOpenJoinModal = async () => {
    setJoinModalOpen(true);
    setFetchingTeams(true);
    try {
      const data = await api.get('/teams/manage/my');
      setMyTeams(data.teams);
      const validTeams = data.teams.filter(t => t.members?.length === 4);
      if (validTeams.length > 0) {
        setSelectedTeam(validTeams[0]._id);
      } else if (data.teams.length > 0) {
        setSelectedTeam(data.teams[0]._id);
      }
    } catch (err) {
      toast.error("Couldn't load your teams. Check your connection.");
    } finally {
      setFetchingTeams(false);
    }
  };

  const handleConfirmJoin = async () => {
    if (!selectedTeam) return toast.error('Please select a team');
    
    if (scrim.entryFee > 0) {
      if (!utr || !/^[A-Z0-9]{12}$/i.test(utr)) {
        return toast.error('Please enter a valid 12-digit UTR');
      }
      if (!screenshot) {
        return toast.error('Please upload a payment screenshot');
      }
    }

    setIsJoining(true);
    try {
      if (scrim.entryFee > 0) {
        const fd = new FormData();
        fd.append('scrimId', scrim._id);
        fd.append('teamId', selectedTeam);
        fd.append('utr', utr.toUpperCase());
        if (screenshot) fd.append('screenshot', screenshot);

        await api.post('/registrations/paid', fd);
        toast.success('Request sent! Waiting for organiser to approve your slot.');
        setMyPendingStatus('pending');
      } else {
        await api.post('/registrations', { scrimId: scrim._id, teamId: selectedTeam });
        toast.success(scrim.registrationMethod === 'request_to_join' ? 'Request sent! Waiting for organiser to approve your slot.' : 'Slot secured successfully!');
      }
      setJoinModalOpen(false);
      setUtr('');
      setScreenshot(null);
      const data = await api.get(`/scrims/${id}`);
      setScrim(data.scrim);
      const regData = await api.get(`/registrations/scrim/${id}/public`);
      if (regData && regData.registrations) {
        setRegistrations(regData.registrations);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to register');
    } finally {
      setIsJoining(false);
    }
  };

  const status = statusConfig[scrim.status] || statusConfig.draft;
  let dynamicStatusLabel = status.label;
  let dynamicStatusVariant = status.variant;

  if (['published', 'registrations_open', 'full', 'locked'].includes(scrim.status)) {
    try {
      const scrimDate = new Date(scrim.date);
      const [hours, minutes] = (scrim.startTime || '00:00').split(':').map(Number);
      scrimDate.setHours(hours, minutes, 0, 0);
      const numMatches = scrim.numberOfMatches || 1;
      const durationMs = numMatches * 45 * 60 * 1000; // 45 minutes per match
      const endTime = new Date(scrimDate.getTime() + durationMs);
      
      const now = new Date();
      if (now > endTime) {
        dynamicStatusLabel = 'Awaiting Results';
        dynamicStatusVariant = 'warning';
      } else if (now >= scrimDate && now <= endTime) {
        dynamicStatusLabel = 'LIVE';
        dynamicStatusVariant = 'danger';
      }
    } catch (e) {}
  }

  const org = scrim.organizer;
  const orgProfile = org?.organizerProfile || {};
  const slotsRemaining = scrim.slotCount - scrim.filledSlots;

  // Check if any of the user's teams are already registered
  const isAlreadyRegistered = isAuthenticated && registrations.length > 0 && myTeams.length > 0 &&
    registrations.some(reg => myTeams.some(t => t._id === (reg.team?._id || reg.team)));

  const canJoin = ['registrations_open'].includes(scrim.status) && slotsRemaining > 0 && !isAlreadyRegistered && myPendingStatus !== 'pending';

  const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const handleCheckIn = async () => {
    if (!myRegistration) return;
    setCheckingIn(true);
    try {
      const res = await api.put(`/registrations/${myRegistration._id}/checkin`);
      setMyRegistration(res.registration);
      toast.success('Successfully checked in!');
    } catch (err) {
      toast.error(err.message || 'Failed to check in');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) return toast.error('Please enter a review message');
    setSubmittingReview(true);
    try {
      await api.post('/reviews', { organizerId: scrim.organizer._id || scrim.organizer, scrimId: scrim._id, rating: reviewRating, comment: reviewText });
      toast.success('Review submitted successfully!');
      setReviewSubmitted(true);
    } catch (err) {
      toast.error(err.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 pb-20 md:pb-0">
      <Navbar />

      {/* Banner */}
      <div className="relative h-48 md:h-64 bg-gradient-to-br from-primary-900/40 to-dark-800 mt-16">
        {scrim.banner ? (
          <img src={scrim.banner} alt={scrim.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-800/20 via-dark-900 to-neon-purple/10" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/50 to-transparent" />

        <div className="absolute bottom-4 left-4">
          <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm text-dark-300 hover:text-white transition-colors">
            <HiArrowLeft /> Back to Marketplace
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 -mt-8 relative z-10 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title Block */}
            <div className="card">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <Badge variant={dynamicStatusVariant} size="md" dot>{dynamicStatusLabel}</Badge>
                {scrim.isFeatured && <Badge variant="neon" size="sm"><HiStar className="mr-1" />Featured</Badge>}
                {scrim.format && <Badge variant="purple" size="sm">{scrim.format.toUpperCase()}</Badge>}
                {scrim.mode && <Badge variant="info" size="sm">{scrim.mode.toUpperCase()}</Badge>}
              </div>

              <h1 className="text-2xl md:text-3xl font-display font-bold text-white mb-1">{scrim.title}</h1>
              {scrim.subtitle && <p className="text-dark-400 text-lg">{scrim.subtitle}</p>}

              {/* Organizer */}
              <Link
                to={orgProfile.slug ? `/organizer/${orgProfile.slug}` : '#'}
                className="flex items-center gap-3 mt-4 p-3 rounded-xl bg-dark-850 border border-surface-border hover:border-dark-600 transition-all group"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-neon-purple flex items-center justify-center text-sm font-bold text-white">
                  {orgProfile.logo ? <img src={orgProfile.logo} className="w-full h-full rounded-full object-cover" /> : (org?.username?.[0]?.toUpperCase() || '?')}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-white group-hover:text-neon-cyan transition-colors">
                      {orgProfile.displayName || org?.username}
                    </span>
                    {orgProfile.isVerified && <HiCheckCircle className="text-neon-cyan text-sm" />}
                  </div>
                  <p className="text-xs text-dark-400">Organizer</p>
                </div>
                <HiExternalLink className="text-dark-500 group-hover:text-neon-cyan" />
              </Link>
            </div>

            {/* Schedule & Details */}
            <div className="card">
              <h3 className="text-lg font-semibold text-white mb-4">Details</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <DetailItem icon={<HiCalendar />} label="Date" value={formatDate(scrim.date)} />
                <DetailItem icon={<HiClock />} label="Time" value={`${scrim.startTime} - ${scrim.endTime} ${scrim.timezone}`} />
                <DetailItem icon={<HiViewGrid />} label="Matches" value={`${scrim.numberOfMatches || 1} match${(scrim.numberOfMatches || 1) > 1 ? 'es' : ''}`} />
                <DetailItem icon={<HiUsers />} label="Slots" value={`${scrim.filledSlots}/${scrim.slotCount}`} />
              </div>
            </div>

            {/* Match Configuration */}
            {scrim.matches && scrim.matches.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <HiMap className="text-neon-cyan" /> Match Configuration
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {scrim.matches.map((match, idx) => {
                    const matchIdp = idps.find(i => i.matchNumber === match.matchNumber);
                    return (
                      <div key={idx} className="p-4 rounded-xl bg-dark-850 border border-surface-border flex flex-col h-full relative overflow-hidden">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold text-white">Match {match.matchNumber}</span>
                          <Badge variant="info" size="xs">{match.map}</Badge>
                        </div>
                        <div className="space-y-1 mb-4 flex-grow">
                          <div className="flex justify-between text-xs">
                            <span className="text-dark-400">IDP Time</span>
                            <span className="text-white">{match.idpTime}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-dark-400">Start Time</span>
                            <span className="text-white">{match.startTime}</span>
                          </div>
                        </div>

                        {/* IDP Section */}
                        <div className="mt-auto pt-3 border-t border-surface-border">
                          {matchIdp?.isIdpReleased ? (
                            <div className="bg-dark-900 rounded-lg p-3 border border-neon-cyan/20">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs text-dark-400 font-bold uppercase tracking-wider">Room ID</span>
                                <span className="text-sm font-mono text-neon-cyan font-bold select-all">{matchIdp.roomId}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-dark-400 font-bold uppercase tracking-wider">Password</span>
                                <span className="text-sm font-mono text-neon-cyan font-bold select-all">{matchIdp.roomPassword}</span>
                              </div>
                            </div>
                          ) : (
                            <div className="bg-dark-900/50 rounded-lg p-3 border border-dashed border-surface-border text-center flex flex-col items-center justify-center">
                              <HiShieldCheck className="text-dark-500 text-xl mb-1" />
                              <span className="text-xs text-dark-400">IDP not yet released</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Description */}
            {scrim.description && (
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                <p className="text-sm text-dark-300 leading-relaxed whitespace-pre-wrap">{scrim.description}</p>
              </div>
            )}

            {/* Live Chat (Only for registered participants / organizers) */}
            {isAuthenticated && (isAlreadyRegistered || user?._id === scrim.organizer?._id || user?._id === scrim.organizer) && (
              <div className="card p-0 border border-surface-border">
                <LiveChat scrim={scrim} />
              </div>
            )}

            {/* Rules */}
            {scrim.rules && (
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <HiClipboardList className="text-neon-cyan" /> Rules
                </h3>
                <p className="text-sm text-dark-300 leading-relaxed whitespace-pre-wrap">{scrim.rules}</p>
              </div>
            )}

            {/* Prize Distribution */}
            {scrim.prizeDistribution?.length > 0 && (
              <div className="card">
                <h3 className="text-lg font-semibold text-white mb-1">Prize Distribution</h3>
                <p className="text-xs text-dark-400 mb-4">Prizes are percentage-based and scale with actual registrations ({scrim.filledSlots}/{scrim.slotCount} filled)</p>
                <div className="space-y-2">
                  {scrim.prizeDistribution.map((p, i) => {
                    const actualPool = scrim.filledSlots * scrim.entryFee;
                    const actualPlatformCut = actualPool * ((scrim.platformFee || 7) / 100);
                    const actualOrganizerCut = actualPool * ((scrim.organizerCut || 0) / 100);
                    const actualPrizePool = actualPool - actualPlatformCut - actualOrganizerCut;
                    const estimatedAmount = Math.round(actualPrizePool * ((p.percentage || 0) / 100));
                    return (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-dark-850 border border-surface-border">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                            i === 0 ? 'bg-yellow-500/15 text-yellow-400' :
                            i === 1 ? 'bg-gray-400/15 text-gray-400' :
                            i === 2 ? 'bg-orange-500/15 text-orange-400' :
                            'bg-dark-700 text-dark-400'
                          }`}>
                            #{p.position}
                          </span>
                          <span className="text-sm text-white">{p.label || `Position ${p.position}`}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-dark-400 bg-dark-800 px-2 py-0.5 rounded">{p.percentage}%</span>
                          <span className="text-sm font-bold text-neon-cyan">≈ ₹{estimatedAmount.toLocaleString()}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Registered Teams (Slot List) */}
            <div className="card">
              <h3 
                className="text-lg font-semibold text-white flex items-center justify-between cursor-pointer select-none" 
                onClick={() => setSlotListOpen(prev => !prev)}
              >
                <span className="flex items-center gap-2">
                  <HiUsers className="text-neon-cyan" /> Slot List <span className="text-sm font-normal text-dark-400 ml-1">({registrations.length}/{scrim.slotCount} filled)</span>
                </span>
                {slotListOpen ? <HiChevronUp className="text-dark-400" /> : <HiChevronDown className="text-dark-400" />}
              </h3>
              {slotListOpen && (
                <div className="mt-4">
                  <div className="bg-dark-900 border border-surface-border rounded-xl overflow-hidden">
                    <table className="w-full text-left text-sm border-collapse">
                      <thead className="bg-dark-950 border-b border-surface-border">
                        <tr>
                          <th className="px-5 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-wider w-20">Slot</th>
                          <th className="px-5 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-wider">Team</th>
                          <th className="px-5 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-wider w-32">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {Array.from({ length: 25 }).map((_, i) => {
                          const visualSlot = i + 1;
                          const teamsLimit = scrim.slotCount || 25;
                          const lockedCount = Math.max(0, 25 - teamsLimit);
                          const isLocked = visualSlot <= lockedCount;

                          if (isLocked) {
                            return (
                              <tr key={`locked-${visualSlot}`} className="bg-dark-950/40">
                                <td className="px-5 py-3 text-xs font-bold text-dark-500">#{visualSlot}</td>
                                <td className="px-5 py-3">
                                  <span className="text-dark-600 italic text-xs">🔒 Reserved / Locked</span>
                                </td>
                                <td className="px-5 py-3">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-dark-800 text-dark-500 border border-surface-border px-2 py-0.5 rounded-full"><HiOutlineLockClosed /> Locked</span>
                                </td>
                              </tr>
                            );
                          }

                          const actualSlotNumber = visualSlot - lockedCount;
                          const reg = registrations.find(r => r.slotNumber === actualSlotNumber) || (!registrations.some(r => r.slotNumber) && registrations[actualSlotNumber - 1]);
                          
                          if (reg) {
                            return (
                              <tr key={reg._id} className="hover:bg-dark-800/50 transition-colors">
                                <td className="px-5 py-3 text-xs font-bold text-dark-500">#{visualSlot}</td>
                                <td className="px-5 py-3">
                                  <Link to={`/teams/${reg.team._id}`} className="flex items-center gap-3 group">
                                    <img 
                                      src={reg.team.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(reg.team.name)}&size=32&background=1a1d24&color=00d9ff&bold=true`} 
                                      alt={reg.team.name} 
                                      className="w-8 h-8 rounded-lg object-cover border border-surface-border bg-dark-800 shrink-0" 
                                    />
                                    <div>
                                      <span className="font-semibold text-white block group-hover:text-neon-cyan transition-colors">{reg.team.name}</span>
                                      {reg.team.members && reg.team.members.length > 0 ? (
                                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                          {reg.team.members.map((m, idx) => (
                                            <span key={idx} className="text-[10px] bg-dark-800 text-dark-400 px-1.5 py-0.5 rounded truncate max-w-[80px]" title={m.ign || m.user?.username}>
                                              {m.ign || m.user?.username || 'Player'}
                                            </span>
                                          ))}
                                        </div>
                                      ) : (
                                        <p className="text-[10px] text-dark-400 mt-0.5">[{reg.team.tag}]</p>
                                      )}
                                    </div>
                                  </Link>
                                </td>
                                <td className="px-5 py-3">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 px-2 py-0.5 rounded-full"><HiOutlineCheck /> Filled</span>
                                </td>
                              </tr>
                            );
                          } else {
                            return (
                              <tr key={`empty-${visualSlot}`} className="hover:bg-dark-800/50 transition-colors">
                                <td className="px-5 py-3 text-xs font-bold text-dark-500">#{visualSlot}</td>
                                <td className="px-5 py-3">
                                  <span className="text-dark-600 italic text-xs">— Empty Slot —</span>
                                </td>
                                <td className="px-5 py-3">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-dark-800 text-dark-500 border border-surface-border px-2 py-0.5 rounded-full"><HiOutlineX /> Empty</span>
                                </td>
                              </tr>
                            );
                          }
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Pre-Released / Finalized Results */}
            {results && (results.status === 'pre_released' || results.status === 'finalized') && (
              <div className="card">
                <h3 className="text-xl font-display font-bold text-white mb-1 flex items-center gap-2">
                  <HiStar className="text-yellow-400" />
                  {results.status === 'pre_released' ? 'Results (Under Review)' : 'Final Results'}
                </h3>
                {results.status === 'pre_released' && (
                  <p className="text-xs text-yellow-400 mb-4">These results are pre-released for review. If you spot any errors, submit a dispute below.</p>
                )}
                
                <div className="bg-dark-900 border border-surface-border rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-dark-950/50 border-b border-surface-border">
                        <th className="p-3 text-xs font-semibold text-dark-400 uppercase">Rank</th>
                        <th className="p-3 text-xs font-semibold text-dark-400 uppercase">Team</th>
                        <th className="p-3 text-xs font-semibold text-dark-400 uppercase text-center">Position Pts</th>
                        <th className="p-3 text-xs font-semibold text-dark-400 uppercase text-center">Kill Pts</th>
                        <th className="p-3 text-xs font-semibold text-dark-400 uppercase text-center">Total</th>
                        {scrim.prizePool > 0 && <th className="p-3 text-xs font-semibold text-dark-400 uppercase text-center">Prize</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {results.standings.map((s, idx) => {
                        const tId = s.team?._id || idx;
                        const isExpanded = expandedResultTeams[tId];
                        // Collect all player kills across matches
                        const playerMap = {};
                        (s.matchScores || []).forEach(ms => {
                          (ms.playerKills || []).forEach(pk => {
                            if (!playerMap[pk.userId]) playerMap[pk.userId] = { ign: pk.ign, totalKills: 0, matches: {} };
                            playerMap[pk.userId].totalKills += (pk.kills || 0);
                            playerMap[pk.userId].matches[ms.matchNumber] = pk.kills || 0;
                          });
                        });
                        const players = Object.entries(playerMap);
                        return (
                          <React.Fragment key={tId}>
                            <tr 
                              className={`hover:bg-dark-800/50 transition-colors cursor-pointer ${idx < 3 ? 'bg-dark-900/80' : ''} ${myTeams.some(t => t._id === tId) ? 'ring-1 ring-neon-cyan/50 bg-neon-cyan/5' : ''}`}
                              onClick={() => setExpandedResultTeams(p => ({ ...p, [tId]: !p[tId] }))}
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-1">
                                  {isExpanded ? <HiChevronDown className="text-dark-400 text-xs" /> : <HiChevronDown className="text-dark-500 text-xs rotate-[-90deg]" />}
                                  <span className={`text-sm font-bold ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-dark-400'}`}>
                                    #{s.place}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <img src={s.team?.logo || 'https://via.placeholder.com/40'} alt="" className="w-7 h-7 rounded-lg object-cover" />
                                  <div>
                                    <p className="text-sm font-bold text-white">{s.team?.name || 'Unknown'}</p>
                                    <p className="text-xs text-dark-400">[{s.team?.tag}]</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-3 text-center text-sm text-white">{s.totalPositionPoints}</td>
                              <td className="p-3 text-center text-sm text-white">{s.totalKillPoints}</td>
                              <td className="p-3 text-center">
                                <span className="text-sm font-bold text-neon-cyan bg-neon-cyan/10 px-3 py-1 rounded">{s.totalPoints}</span>
                              </td>
                              {scrim.prizePool > 0 && (
                                <td className="p-3 text-center">
                                  {s.prizeWon > 0 ? (
                                    <span className="text-sm font-bold text-green-400">₹{s.prizeWon}</span>
                                  ) : (
                                    <span className="text-xs text-dark-500">—</span>
                                  )}
                                </td>
                              )}
                            </tr>
                            {isExpanded && players.length > 0 && players.map(([pId, pData]) => (
                              <tr key={pId} className="bg-dark-950/50 border-l-2 border-l-primary-500/30">
                                <td className="p-2 pl-8 text-xs text-dark-500">—</td>
                                <td className="p-2">
                                  <span className="text-sm text-dark-300">{pData.ign || 'Unknown'}</span>
                                </td>
                                <td className="p-2 text-center text-xs text-dark-500">—</td>
                                <td className="p-2 text-center text-sm text-white">{pData.totalKills}</td>
                                <td className="p-2 text-center text-xs text-dark-500">—</td>
                                {scrim.prizePool > 0 && <td className="p-2"></td>}
                              </tr>
                            ))}
                            {isExpanded && players.length === 0 && (
                              <tr className="bg-dark-950/50">
                                <td colSpan={scrim.prizePool > 0 ? 6 : 5} className="p-3 text-center text-xs text-dark-500 italic">
                                  No individual player data available
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Dispute Form (only for pre-released, only for authenticated registered players) */}
                {results.status === 'pre_released' && isAuthenticated && isAlreadyRegistered && (
                  <div className="mt-6 bg-dark-900 border border-orange-500/20 rounded-xl p-5">
                    <h4 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2">
                      ⚠️ Report an issue with results
                    </h4>
                    {disputeSubmitted ? (
                      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-sm text-green-400">
                        ✅ Your dispute has been submitted. The organizer will review it.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <textarea
                          value={disputeText}
                          onChange={(e) => setDisputeText(e.target.value)}
                          placeholder="Describe the issue with the results (e.g., wrong kill count, incorrect placement, etc.)..."
                          className="input-field w-full min-h-[100px] resize-y text-sm"
                          maxLength={500}
                        />
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-dark-500">{disputeText.length}/500</span>
                          <button
                            onClick={async () => {
                              if (!disputeText.trim()) return toast.error('Please describe the issue');
                              try {
                                setSubmittingDispute(true);
                                await api.post(`/results/scrim/${id}/dispute`, { description: disputeText });
                                toast.success('Dispute submitted!');
                                setDisputeSubmitted(true);
                              } catch (err) {
                                toast.error(err.message || 'Failed to submit dispute');
                              } finally {
                                setSubmittingDispute(false);
                              }
                            }}
                            disabled={submittingDispute || !disputeText.trim()}
                            className="btn-primary bg-orange-600 hover:bg-orange-500 text-white text-sm px-5 py-2"
                          >
                            {submittingDispute ? 'Submitting...' : 'Submit Dispute'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Review Section */}
            {scrim.status === 'completed' && isAuthenticated && isAlreadyRegistered && (
              <div className="card border-primary-500/20 bg-dark-900/50">
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <HiStar className="text-yellow-400" /> Leave a Review
                </h3>
                {reviewSubmitted ? (
                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-sm text-green-400">
                    ✅ Thank you for reviewing this organizer!
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-dark-300">How was your experience playing in this scrim?</p>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          onClick={() => setReviewRating(star)}
                          className={`text-2xl transition-colors ${reviewRating >= star ? 'text-yellow-400' : 'text-dark-700'}`}
                        >
                          ★
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      placeholder="Write your feedback here..."
                      className="input-field w-full min-h-[80px] resize-y text-sm"
                      maxLength={500}
                    />
                    <div className="flex justify-end">
                      <LoadingButton
                        loading={submittingReview}
                        onClick={handleSubmitReview}
                        variant="primary"
                        className="py-2 px-6"
                      >
                        Submit Review
                      </LoadingButton>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Join Card */}
            <div className="card sticky top-20">
              <div className="space-y-4">
                {/* Price */}
                <div className="text-center pb-4 border-b border-surface-border">
                  <p className="text-sm text-dark-400 mb-1">Registration</p>
                  <p className="text-3xl font-display font-bold text-white">
                    {scrim.entryFee > 0 ? 'Paid' : (scrim.registrationMethod === 'request_to_join' ? 'Request' : 'Instant')}
                  </p>
                  {scrim.registrationMethod === 'request_to_join' && scrim.entryFee === 0 && (
                    <p className="text-[10px] text-neon-cyan mt-1">Talk to organizer to book slot</p>
                  )}
                  {scrim.registrationNote && (
                    <p className="text-[10px] text-dark-400 mt-2 p-2 bg-dark-850 rounded italic">"{scrim.registrationNote}"</p>
                  )}
                </div>

                {/* Prize Pool */}
                {scrim.prizePool > 0 && (
                  <div className="text-center pb-4 border-b border-surface-border">
                    <p className="text-sm text-dark-400 mb-1">Prize Pool</p>
                    <p className="text-2xl font-display font-bold text-gradient">₹{scrim.prizePool.toLocaleString()}</p>
                  </div>
                )}

                {/* Slots */}
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-dark-400">Slots filled</span>
                    <span className="text-white font-medium">{scrim.filledSlots}/{scrim.slotCount}</span>
                  </div>
                  <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-neon-cyan to-primary-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min((scrim.filledSlots / scrim.slotCount) * 100, 100)}%` }}
                    />
                  </div>
                  {slotsRemaining <= 5 && slotsRemaining > 0 && (
                    <p className="text-xs text-orange-400 mt-1 text-center">Only {slotsRemaining} slots remaining!</p>
                  )}
                </div>

                {/* CTA */}
                <div ref={sidebarJoinRef}>
                {myPendingStatus === 'approved' || isAlreadyRegistered ? (
                  <div className="bg-dark-900 border border-green-500/30 rounded-xl p-4 text-center">
                    <div className="flex justify-center mb-2"><HiCheckCircle className="text-3xl text-green-400" /></div>
                    <h4 className="text-white font-bold mb-1">
                      {(() => { const myReg = registrations.find(r => myTeams.some(t => t._id === (r.team?._id || r.team))); return myReg?.slotNumber ? `You're In! Slot #${myReg.slotNumber}` : "You're In!"; })()}
                    </h4>
                    <p className="text-xs text-dark-300 mb-3">{scrim.roomId ? `Room ID: ${scrim.roomId} | Password: ${scrim.roomPassword || 'N/A'}` : "Room details will appear here before the scrim starts."}</p>
                    
                    {!myRegistration?.checkedIn && scrim.status === 'locked' && (
                      <LoadingButton onClick={handleCheckIn} loading={checkingIn} variant="primary" className="w-full py-2">
                        Check In Now
                      </LoadingButton>
                    )}
                    {myRegistration?.checkedIn && (
                      <div className="flex items-center justify-center gap-1 text-green-400 text-xs font-bold bg-green-500/10 py-2 rounded-lg border border-green-500/20">
                        <HiCheck /> Checked In
                      </div>
                    )}
                  </div>
                ) : myPendingStatus === 'pending' || myPendingStatus === 'payment_verification' ? (
                  <div className="bg-dark-900 border border-amber-500/30 rounded-xl p-4 text-center">
                    <div className="flex justify-center mb-2"><span className="text-3xl">⏳</span></div>
                    <h4 className="text-white font-bold mb-1">Slot Request Sent</h4>
                    <p className="text-xs text-dark-300">The organiser will verify your payment and assign your slot. You'll see your slot number here once approved.</p>
                  </div>
                ) : myPendingStatus === 'rejected' ? (
                  <div className="bg-dark-900 border border-red-500/30 rounded-xl p-4 text-center">
                    <div className="flex justify-center mb-2"><span className="text-3xl">❌</span></div>
                    <h4 className="text-white font-bold mb-1">Request Rejected</h4>
                    <p className="text-xs text-dark-300 mb-3">The organiser rejected your slot request.</p>
                    <button onClick={() => setMyPendingStatus(null)} className="btn-ghost w-full py-2 text-sm">Try Again</button>
                  </div>
                ) : canJoin ? (
                  isAuthenticated ? (
                    <button 
                      onClick={() => {
                        if (scrim.entryFee > 0) {
                          handleOpenJoinModal(); // Paid scrims always show payment modal
                        } else if (scrim.registrationMethod === 'request_to_join') {
                          setRequestModalOpen(true); // Free request-to-join scrims show chat
                        } else {
                          handleOpenJoinModal();
                        }
                      }} 
                      className="btn-neon w-full py-3 text-sm"
                    >
                      {scrim.entryFee > 0 ? '💳 Pay & Register' : (scrim.registrationMethod === 'request_to_join' ? '💬 Request Slot' : 'Join Scrim')}
                    </button>
                  ) : (
                    <Link to="/login" className="btn-neon w-full py-3 text-sm text-center block">
                      Login to Join
                    </Link>
                  )
                ) : (
                  <button disabled className="btn-ghost w-full py-3 text-sm opacity-50 cursor-not-allowed">
                    {scrim.status === 'full' ? 'Slots Full' :
                     scrim.status === 'completed' ? 'Scrim Completed' :
                     scrim.status === 'cancelled' ? 'Scrim Cancelled' :
                     scrim.status === 'live' ? 'Match in Progress' :
                     'Registration Closed'}
                  </button>
                )}

                </div>

                {/* Share */}
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    toast.success('Scrim link copied!');
                  }}
                  className="w-full flex items-center justify-center gap-2 text-sm text-dark-400 hover:text-white transition-colors py-2"
                >
                  <HiShare /> Share Scrim
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      <Footer />

      {requestModalOpen && (
        <SlotRequestModal 
          scrim={scrim} 
          onClose={() => setRequestModalOpen(false)} 
        />
      )}

      {/* Join Scrim Modal */}
      <Modal isOpen={joinModalOpen} onClose={() => setJoinModalOpen(false)} title="Join Scrim">
        <div className="space-y-4">
          <div className="bg-dark-800 p-4 rounded-xl border border-surface-border">
            <h4 className="text-white font-bold mb-1">{scrim.title}</h4>
            <p className="text-sm text-dark-300">Format: {scrim.format} | Mode: {scrim.mode}</p>
            <div className="mt-2 flex justify-between items-center bg-dark-900 p-2 rounded-lg">
              <span className="text-sm text-dark-400">Entry Fee</span>
              <span className={`text-sm font-bold ${scrim.entryFee > 0 ? 'text-neon-cyan' : 'text-green-400'}`}>
                {scrim.entryFee > 0 ? `₹${scrim.entryFee}` : 'Free'}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Select Your Team</label>
            {fetchingTeams ? (
              <div className="space-y-2">
                {[1,2,3].map(i => <div key={i} className="animate-pulse h-16 bg-dark-800 rounded-xl w-full" />)}
              </div>
            ) : myTeams.length > 0 ? (
              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                {myTeams.map(t => {
                  const isValid = t.members?.length === 4;
                  const isSelected = selectedTeam === t._id;
                  return (
                    <button
                      key={t._id}
                      type="button"
                      onClick={() => setSelectedTeam(t._id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                        isSelected
                          ? 'border-neon-cyan/50 bg-neon-cyan/5 ring-2 ring-neon-cyan/30'
                          : 'border-surface-border bg-dark-850 hover:border-dark-600'
                      } ${!isValid ? 'opacity-60' : ''}`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{t.name}</span>
                          {t.tag && <span className="text-[10px] text-dark-400">[{t.tag}]</span>}
                        </div>
                        <p className={`text-xs mt-0.5 ${!isValid ? 'text-orange-400' : 'text-dark-400'}`}>
                          {isValid ? `${t.members.length} members` : `${t.members?.length || 0}/4 members — needs exactly 4`}
                        </p>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-neon-cyan bg-neon-cyan' : 'border-dark-600'
                      }`}>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-dark-950" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
                You are not a member of any team. Join or create a team to register for scrims.
              </div>
            )}
          </div>

          {scrim.entryFee > 0 && orgProfile.upiId && (
            <div className="bg-dark-900 border border-surface-border rounded-xl p-4 flex flex-col items-center gap-4">
              <div className="text-center">
                <p className="text-sm font-bold text-white mb-1">Scan to Pay ₹{scrim.entryFee}</p>
                <p className="text-xs text-dark-400">Pay directly to Organizer</p>
              </div>
              <div className="bg-white p-3 rounded-xl inline-block">
                <QRCode
                  value={`upi://pay?pa=${orgProfile.upiId}&pn=${encodeURIComponent(orgProfile.displayName || org?.username || 'Organizer')}&am=${scrim.entryFee}&cu=INR`}
                  size={140}
                />
              </div>
              <p className="text-xs font-mono text-neon-cyan bg-neon-cyan/10 px-3 py-1 rounded">{orgProfile.upiId}</p>

              <div className="w-full mt-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">UTR Number (12 Digits) <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={utr}
                  onChange={e => setUtr(e.target.value.toUpperCase())}
                  placeholder="e.g. 123456789012"
                  maxLength={12}
                  className="w-full bg-dark-800 border border-surface-border rounded-lg px-3 py-2.5 text-white font-mono focus:outline-none focus:border-neon-cyan transition-colors"
                />
                {utr && !/^[A-Z0-9]{12}$/i.test(utr) && (
                  <p className="text-xs text-red-400 mt-1">Must be exactly 12 alphanumeric characters</p>
                )}
              </div>

              <div className="w-full mt-2">
                <label className="block text-xs font-medium text-gray-300 mb-1">Payment Screenshot <span className="text-red-400">*</span></label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setScreenshot(e.target.files[0])}
                  className="w-full text-xs text-dark-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary-500/10 file:text-primary-400 hover:file:bg-primary-500/20"
                />
              </div>
            </div>
          )}

          {scrim.entryFee > 0 && !orgProfile.upiId && (
            <div className="p-4 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl text-sm text-center">
              The organizer has not set up their payment details yet.
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button onClick={() => setJoinModalOpen(false)} className="btn-ghost flex-1">Cancel</button>
            {myTeams.length > 0 ? (
              <LoadingButton
                loading={isJoining}
                disabled={myTeams.find(t => t._id === selectedTeam)?.members?.length !== 4 || (scrim.entryFee > 0 && !orgProfile.upiId)}
                onClick={handleConfirmJoin}
                variant="primary"
                className="flex-1 py-2.5"
              >
                {scrim.entryFee > 0 ? 'Pay & Register' : 'Confirm Registration'}
              </LoadingButton>
            ) : (
              <Link to="/dashboard/teams/create" onClick={() => setJoinModalOpen(false)} className="btn-primary flex-1 text-center py-2 flex items-center justify-center">
                Create Team
              </Link>
            )}
          </div>
        </div>
      </Modal>

      {/* Mobile Sticky Join Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-950/95 backdrop-blur-md border-t border-surface-border p-4 z-50 flex items-center justify-between shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <div>
          <p className="text-xs text-dark-400">Registration</p>
          <p className="text-lg font-bold text-white">{scrim.entryFee > 0 ? `₹${scrim.entryFee}` : 'Free'}</p>
        </div>
        <div>
          {myPendingStatus === 'approved' || isAlreadyRegistered ? (
             <button disabled className="bg-green-500/15 text-green-400 border border-green-500/30 px-6 py-2.5 rounded-xl text-sm font-semibold">✓ Registered</button>
          ) : myPendingStatus === 'pending' || myPendingStatus === 'payment_verification' ? (
             <button disabled className="bg-orange-500/15 text-orange-400 border border-orange-500/30 px-6 py-2.5 rounded-xl text-sm font-semibold">⏳ Pending</button>
          ) : myPendingStatus === 'rejected' ? (
             <button disabled className="bg-red-500/15 text-red-400 border border-red-500/30 px-6 py-2.5 rounded-xl text-sm font-semibold">❌ Rejected</button>
          ) : canJoin ? (
             <button onClick={() => {
                if (scrim.entryFee > 0) handleOpenJoinModal();
                else if (scrim.registrationMethod === 'request_to_join') setRequestModalOpen(true);
                else handleOpenJoinModal();
             }} className="btn-neon px-6 py-2.5 text-sm shadow-[0_0_15px_rgba(34,211,238,0.3)]">
               {scrim.entryFee > 0 ? 'Pay & Join' : 'Join Scrim'}
             </button>
          ) : (
             <button disabled className="bg-dark-800 text-dark-400 px-6 py-2.5 rounded-xl text-sm cursor-not-allowed">Closed</button>
          )}
        </div>
      </div>

    </div>
  );
};

const DetailItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-2">
    <span className="text-dark-500 mt-0.5">{icon}</span>
    <div>
      <p className="text-xs text-dark-500">{label}</p>
      <p className="text-sm text-white">{value}</p>
    </div>
  </div>
);

export default ScrimDetailPage;
