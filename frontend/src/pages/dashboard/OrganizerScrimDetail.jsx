import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/ui/Loader';
import Badge from '../../components/ui/Badge';
import { HiArrowLeft, HiUsers, HiClipboardList, HiStar, HiExclamationCircle, HiOutlineLockClosed, HiX, HiCheck, HiShieldCheck } from 'react-icons/hi';

const OrganizerScrimDetail = () => {
  const { id } = useParams();
  const [scrim, setScrim] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [existingResult, setExistingResult] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'slotList'); // 'overview', 'slotList', 'results'
  const [selectedMatchIdx, setSelectedMatchIdx] = useState(0);

  // scores: { [matchIndex]: { [teamId]: { positionPoints: 0, killPoints: 0 } } }
  const [scores, setScores] = useState({});

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 1. Fetch Scrim Details
      const scrimRes = await api.get(`/scrims/${id}`);
      const fetchedScrim = scrimRes.scrim;
      setScrim(fetchedScrim);

      // 2. Fetch Registrations (Slot List)
      const regRes = await api.get(`/registrations/scrim/${id}`);
      const approvedRegs = regRes.registrations.filter(r => r.status === 'approved');
      const pendingRegs = regRes.registrations.filter(r => r.status === 'pending');
      setRegistrations(approvedRegs);
      setPendingRequests(pendingRegs);

      // 3. Fetch Existing Results (if drafted)
      try {
        const resultRes = await api.get(`/results/scrim/${id}`);
        if (resultRes.result) {
          setExistingResult(resultRes.result);
          // Prepopulate scores map
          const initialScores = {};
          resultRes.result.standings.forEach(std => {
            const tId = std.team._id || std.team;
            std.matchScores.forEach(ms => {
              const mIdx = ms.matchNumber - 1; // 0-indexed backend matchNumber handling
              if (!initialScores[mIdx]) initialScores[mIdx] = {};
              initialScores[mIdx][tId] = {
                positionPoints: ms.positionPoints || 0,
                killPoints: ms.killPoints || 0
              };
            });
          });
          setScores(initialScores);
        }
      } catch (err) {
        // 404 means no results drafted yet, totally fine
      }
    } catch (err) {
      toast.error('Failed to load scrim details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (regId, status) => {
    try {
      await api.put(`/registrations/${regId}/status`, { status });
      toast.success(`Request ${status}`);
      fetchData(); // Refresh lists
    } catch (err) {
      toast.error(err.message || 'Failed to update request');
    }
  };

  const handleScoreChange = (teamId, field, value) => {
    const val = parseInt(value) || 0;
    setScores(prev => ({
      ...prev,
      [selectedMatchIdx]: {
        ...(prev[selectedMatchIdx] || {}),
        [teamId]: {
          ...(prev[selectedMatchIdx]?.[teamId] || { positionPoints: 0, killPoints: 0 }),
          [field]: val
        }
      }
    }));
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      
      // Transform local state 'scores' matrix back to 'standings' payload array expected by backend
      const standingsPayload = registrations.map(reg => {
        const tId = reg.team._id;
        const matchScores = [];

        // Loop over each match in the scrim
        (scrim.matches || []).forEach((m, idx) => {
          const teamMatchScore = scores[idx]?.[tId] || { positionPoints: 0, killPoints: 0 };
          matchScores.push({
            matchNumber: m.matchNumber,
            positionPoints: teamMatchScore.positionPoints,
            killPoints: teamMatchScore.killPoints
          });
        });

        return {
          teamId: tId,
          matchScores
        };
      });

      await api.post(`/results/scrim/${id}`, { standings: standingsPayload });
      toast.success('Scores saved as draft');
      fetchData(); // reload
    } catch (err) {
      toast.error(err.message || 'Failed to save scores');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishResults = async () => {
    if (!window.confirm('Are you absolutely sure you want to PUBLISH? This will distribute prizes to wallets and cannot be undone!')) {
      return;
    }
    try {
      setPublishing(true);
      await api.put(`/results/scrim/${id}/publish`);
      toast.success('Results Finalized and Prizes Distributed!');
      fetchData(); // reload
    } catch (err) {
      toast.error(err.message || 'Failed to publish results');
    } finally {
      setPublishing(false);
    }
  };

  if (loading) {
    return <DashboardLayout><div className="flex justify-center p-12"><Loader /></div></DashboardLayout>;
  }

  if (!scrim) {
    return <DashboardLayout><div className="text-center p-12 text-white">Scrim not found</div></DashboardLayout>;
  }

  const isLiveOrCompleted = ['live', 'completed'].includes(scrim.status);

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/organizer/scrims" className="text-dark-400 hover:text-white flex items-center gap-1 text-sm mb-2 transition-colors">
            <HiArrowLeft /> Back to My Scrims
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-white">{scrim.title}</h1>
            <Badge variant="info">{scrim.status.toUpperCase()}</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-border mb-6 overflow-x-auto">
        <button 
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'slotList' ? 'border-neon-cyan text-neon-cyan' : 'border-transparent text-dark-400 hover:text-white'}`}
          onClick={() => setActiveTab('slotList')}
        >
          <div className="flex items-center gap-2"><HiUsers /> Slot List</div>
        </button>
        <button 
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'requests' ? 'border-neon-cyan text-neon-cyan' : 'border-transparent text-dark-400 hover:text-white'}`}
          onClick={() => setActiveTab('requests')}
        >
          <div className="flex items-center gap-2"><HiClipboardList /> Requests {pendingRequests.length > 0 && <span className="bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingRequests.length}</span>}</div>
        </button>
        <button 
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'checkin' ? 'border-neon-cyan text-neon-cyan' : 'border-transparent text-dark-400 hover:text-white'}`}
          onClick={() => setActiveTab('checkin')}
        >
          <div className="flex items-center gap-2"><HiShieldCheck /> Check-In {(() => { const ci = registrations.filter(r => r.checkedIn).length; return ci > 0 ? <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{ci}/{registrations.length}</span> : null; })()}</div>
        </button>
        <button 
          className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'results' ? 'border-neon-cyan text-neon-cyan' : 'border-transparent text-dark-400 hover:text-white'}`}
          onClick={() => setActiveTab('results')}
        >
          <div className="flex items-center gap-2"><HiStar /> Declare Result</div>
        </button>
      </div>

      {/* SLOT LIST TAB */}
      {activeTab === 'slotList' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Approved Teams ({registrations.length}/{scrim.slotCount})</h3>
          </div>
          
          {registrations.length === 0 ? (
            <div className="bg-dark-900 border border-surface-border rounded-xl p-8 text-center text-dark-400">
              No approved teams yet.
            </div>
          ) : (
            <div className="bg-dark-900 border border-surface-border rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-dark-950/50 border-b border-surface-border">
                    <th className="p-4 text-xs font-semibold text-dark-400 uppercase">Slot</th>
                    <th className="p-4 text-xs font-semibold text-dark-400 uppercase">Team</th>
                    <th className="p-4 text-xs font-semibold text-dark-400 uppercase">Registered By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {Array.from({ length: 25 }, (_, i) => {
                    const visualSlot = i + 1;
                    const slotCount = scrim.slotCount || 25;
                    const lockedCount = Math.max(0, 25 - slotCount);
                    const isLocked = visualSlot <= lockedCount;

                    if (isLocked) {
                      return (
                        <tr key={`locked-${visualSlot}`} className="bg-dark-950/40">
                          <td className="p-4 text-sm font-medium text-dark-500">#{visualSlot}</td>
                          <td className="p-4">
                            <span className="text-dark-600 italic text-sm">🔒 Reserved / Locked</span>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-dark-800 text-dark-500 border border-surface-border px-2 py-0.5 rounded-full"><HiOutlineLockClosed /> Locked</span>
                          </td>
                        </tr>
                      );
                    }

                    const actualIndex = visualSlot - lockedCount - 1;
                    const reg = registrations[actualIndex];

                    if (!reg) {
                      return (
                        <tr key={`empty-${visualSlot}`} className="hover:bg-dark-800/50 transition-colors">
                          <td className="p-4 text-sm font-medium text-dark-500">#{visualSlot}</td>
                          <td className="p-4">
                            <span className="text-dark-600 italic text-sm">— Empty Slot —</span>
                          </td>
                          <td className="p-4">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-dark-800 text-dark-500 border border-surface-border px-2 py-0.5 rounded-full"><HiX /> Empty</span>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={reg._id} className="hover:bg-dark-800/50 transition-colors">
                        <td className="p-4 text-sm font-medium text-white">#{visualSlot}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img src={reg.team.logo || 'https://via.placeholder.com/40'} alt={reg.team.name} className="w-8 h-8 rounded-lg object-cover bg-dark-800 border border-surface-border" />
                            <div>
                              <p className="text-sm font-bold text-white">{reg.team.name}</p>
                              <p className="text-[10px] font-medium text-dark-400 mt-0.5 tracking-wider uppercase">[{reg.team.tag}]</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm text-dark-300">{reg.registeredBy?.username}</span>
                          {reg.utrNumber && (
                            <span className="ml-2 text-[10px] font-mono bg-dark-800 text-neon-cyan px-1.5 py-0.5 rounded" title="UTR">{reg.utrNumber}</span>
                          )}
                          {reg.checkedIn && (
                            <span className="ml-2 text-[10px] text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded inline-flex items-center gap-0.5"><HiCheck /> In</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* REQUESTS TAB */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Pending Requests ({pendingRequests.length})</h3>
          </div>
          
          {pendingRequests.length === 0 ? (
            <div className="bg-dark-900 border border-surface-border rounded-xl p-8 text-center text-dark-400">
              No pending requests at this time.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingRequests.map(reg => (
                <div key={reg._id} className="bg-dark-900 border border-surface-border rounded-xl p-4 flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={reg.team.logo || 'https://via.placeholder.com/40'} alt={reg.team.name} className="w-10 h-10 rounded-lg object-cover bg-dark-800 border border-surface-border" />
                      <div>
                        <p className="font-bold text-white text-sm">{reg.team.name}</p>
                        <p className="text-xs text-dark-400">by @{reg.registeredBy?.username}</p>
                      </div>
                    </div>
                    {reg.paymentStatus === 'pending_verification' && (
                      <Badge variant="warning" size="sm">Pending Payment Check</Badge>
                    )}
                  </div>

                  {scrim.entryFee > 0 && (
                    <div className="bg-dark-950 rounded-lg p-3 border border-surface-border/50">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-dark-400">UTR Reference</p>
                        {reg.utrNumber && <span className="text-[10px] text-dark-500">{new Date(reg.utrSubmittedAt || reg.createdAt).toLocaleString()}</span>}
                      </div>
                      <p className="text-sm font-mono text-neon-cyan font-bold select-all">{reg.utrNumber || reg.utr || 'Not provided'}</p>
                      {reg.paymentScreenshot && (
                        <a href={reg.paymentScreenshot} target="_blank" rel="noreferrer" className="text-xs text-neon-cyan mt-2 inline-flex items-center gap-1 hover:underline">
                          📷 View Payment Screenshot ↗
                        </a>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 mt-auto">
                    <button 
                      onClick={() => handleUpdateStatus(reg._id, 'rejected')}
                      className="btn-secondary text-sm py-2 text-red-400 hover:text-red-300 hover:border-red-500/30"
                    >
                      Reject
                    </button>
                    <button 
                      onClick={() => handleUpdateStatus(reg._id, 'approved')}
                      disabled={scrim.filledSlots >= scrim.slotCount}
                      className="btn-neon text-sm py-2"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CHECK-IN TAB */}
      {activeTab === 'checkin' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white">Check-In Overview</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-dark-400">
                {registrations.filter(r => r.checkedIn).length}/{registrations.length} checked in
              </span>
              <div className="w-24 h-2 bg-dark-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-neon-cyan rounded-full transition-all" style={{ width: `${registrations.length > 0 ? (registrations.filter(r => r.checkedIn).length / registrations.length) * 100 : 0}%` }} />
              </div>
            </div>
          </div>

          {registrations.length === 0 ? (
            <div className="bg-dark-900 border border-surface-border rounded-xl p-8 text-center text-dark-400">
              No approved teams yet.
            </div>
          ) : (
            <div className="bg-dark-900 border border-surface-border rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-dark-950/50 border-b border-surface-border">
                    <th className="p-4 text-xs font-semibold text-dark-400 uppercase">Slot</th>
                    <th className="p-4 text-xs font-semibold text-dark-400 uppercase">Team</th>
                    <th className="p-4 text-xs font-semibold text-dark-400 uppercase text-center">Status</th>
                    <th className="p-4 text-xs font-semibold text-dark-400 uppercase text-center">Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {registrations.map((reg, idx) => (
                    <tr key={reg._id} className={`transition-colors ${reg.checkedIn ? 'bg-green-500/5' : 'hover:bg-dark-800/50'}`}>
                      <td className="p-4 text-sm font-medium text-white">#{reg.slotNumber || idx + 1}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img src={reg.team?.logo || 'https://via.placeholder.com/40'} alt="" className="w-8 h-8 rounded-lg object-cover bg-dark-800 border border-surface-border" />
                          <div>
                            <p className="text-sm font-bold text-white">{reg.team?.name}</p>
                            <p className="text-[10px] text-dark-400">[{reg.team?.tag}]</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        {reg.checkedIn ? (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full"><HiCheck /> Checked In</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-dark-500 bg-dark-800 border border-surface-border px-3 py-1 rounded-full">⏳ Waiting</span>
                        )}
                      </td>
                      <td className="p-4 text-center text-xs text-dark-400">
                        {reg.checkedInAt ? new Date(reg.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* RESULTS TAB */}
      {activeTab === 'results' && (
        <div className="space-y-6">
          {!isLiveOrCompleted && (
             <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4 flex items-start gap-3">
               <HiExclamationCircle className="text-orange-400 text-xl flex-shrink-0 mt-0.5" />
               <div>
                 <h4 className="text-sm font-bold text-orange-400">Scrim Not Ready</h4>
                 <p className="text-xs text-orange-400/80 mt-1">
                   You can only upload points when the scrim is marked as "LIVE" or "Completed". 
                   Please publish the scrim and ensure matches have started.
                 </p>
               </div>
             </div>
          )}

          <div className="flex flex-col md:flex-row gap-6">
            {/* Match Selector Sidebar */}
            <div className="w-full md:w-48 flex flex-col gap-2">
              <h3 className="text-sm font-bold text-dark-400 uppercase tracking-wider mb-2">Matches</h3>
              {scrim.matches && scrim.matches.map((match, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedMatchIdx(idx)}
                  className={`p-3 rounded-lg text-left transition-colors border ${selectedMatchIdx === idx ? 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan font-bold' : 'bg-dark-900 border-surface-border text-dark-300 hover:bg-dark-800'}`}
                >
                  <div className="text-sm">Match {match.matchNumber}</div>
                  <div className="text-xs opacity-70 mt-0.5">{match.map}</div>
                </button>
              ))}
              <button
                onClick={() => setSelectedMatchIdx('total')}
                className={`p-3 rounded-lg text-left transition-colors border ${selectedMatchIdx === 'total' ? 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan font-bold' : 'bg-dark-900 border-surface-border text-dark-300 hover:bg-dark-800'}`}
              >
                <div className="text-sm">Total Standings</div>
                <div className="text-xs opacity-70 mt-0.5">All Matches</div>
              </button>
            </div>

            {/* Input Table */}
            <div className="flex-1 bg-dark-900 border border-surface-border rounded-xl p-4">
              <div className="flex justify-between items-center mb-4 pb-4 border-b border-surface-border">
                <h3 className="text-lg font-bold text-white">
                  {selectedMatchIdx === 'total' ? 'Overall Standings' : `Match ${scrim.matches[selectedMatchIdx]?.matchNumber} Points Upload`}
                </h3>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-dark-950 rounded-t-lg">
                      <th className="p-3 text-xs font-semibold text-dark-400 uppercase rounded-tl-lg">
                        {selectedMatchIdx === 'total' ? 'Rank & Team' : 'Team'}
                      </th>
                      <th className="p-3 text-xs font-semibold text-dark-400 uppercase text-center">
                        {selectedMatchIdx === 'total' ? 'Total Pos Pts' : 'Position Pts'}
                      </th>
                      <th className="p-3 text-xs font-semibold text-dark-400 uppercase text-center">
                        {selectedMatchIdx === 'total' ? 'Total Kill Pts' : 'Kill Pts'}
                      </th>
                      <th className="p-3 text-xs font-semibold text-dark-400 uppercase text-center rounded-tr-lg">
                        {selectedMatchIdx === 'total' ? 'Grand Total' : 'Match Total'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border border-b border-surface-border">
                    {selectedMatchIdx === 'total' ? (
                      registrations.map(reg => {
                        const tId = reg.team._id;
                        let totalPos = 0;
                        let totalKill = 0;
                        (scrim.matches || []).forEach((_, idx) => {
                          totalPos += (scores[idx]?.[tId]?.positionPoints || 0);
                          totalKill += (scores[idx]?.[tId]?.killPoints || 0);
                        });
                        const totalPts = totalPos + totalKill;
                        return { reg, totalPos, totalKill, totalPts };
                      })
                      .sort((a, b) => b.totalPts - a.totalPts)
                      .map(({ reg, totalPos, totalKill, totalPts }, idx) => (
                        <tr key={reg.team._id} className="hover:bg-dark-800/30 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-dark-400 font-bold w-6">#{idx + 1}</span>
                              <img src={reg.team.logo || 'https://via.placeholder.com/40'} className="w-6 h-6 rounded object-cover" />
                              <span className="text-sm font-bold text-white max-w-[120px] truncate" title={reg.team.name}>{reg.team.name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center text-white">{totalPos}</td>
                          <td className="p-3 text-center text-white">{totalKill}</td>
                          <td className="p-3 text-center">
                            <span className="text-sm font-bold text-neon-cyan bg-neon-cyan/10 px-3 py-1 rounded inline-block min-w-[40px]">
                              {totalPts}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      registrations.map((reg, actualIndex) => {
                        const tId = reg.team._id;
                        const pPts = scores[selectedMatchIdx]?.[tId]?.positionPoints || 0;
                        const kPts = scores[selectedMatchIdx]?.[tId]?.killPoints || 0;
                        const matchTotal = pPts + kPts;
                        
                        const slotCount = scrim.slotCount || 25;
                        const lockedCount = Math.max(0, 25 - slotCount);
                        const visualSlot = actualIndex + 1 + lockedCount;

                        return (
                          <tr key={tId} className="hover:bg-dark-800/30 transition-colors">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <span className="text-dark-500 font-bold text-xs w-6">#{visualSlot}</span>
                                <img src={reg.team.logo || 'https://via.placeholder.com/40'} className="w-6 h-6 rounded object-cover" />
                                <span className="text-sm font-bold text-white max-w-[120px] truncate" title={reg.team.name}>{reg.team.name}</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <input 
                                type="number" 
                                min="0"
                                value={pPts === 0 ? '' : pPts} 
                                onChange={(e) => handleScoreChange(tId, 'positionPoints', e.target.value)}
                                className="input-field text-center py-1.5 w-20 mx-auto"
                                placeholder="0"
                                disabled={existingResult?.status !== 'draft' && existingResult?.status}
                              />
                            </td>
                            <td className="p-3 text-center">
                              <input 
                                type="number" 
                                min="0"
                                value={kPts === 0 ? '' : kPts} 
                                onChange={(e) => handleScoreChange(tId, 'killPoints', e.target.value)}
                                className="input-field text-center py-1.5 w-20 mx-auto"
                                placeholder="0"
                                disabled={existingResult?.status !== 'draft' && existingResult?.status}
                              />
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-sm font-bold text-neon-cyan bg-neon-cyan/10 px-3 py-1 rounded inline-block min-w-[40px]">
                                {matchTotal}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Actions */}
              <div className="mt-6 flex items-center justify-between">
                <div className="text-sm text-dark-400">
                  {existingResult?.status === 'finalized' ? (
                    <span className="text-green-400 flex items-center gap-1"><HiStar /> Results Confirmed</span>
                  ) : existingResult?.status === 'pre_released' ? (
                    <span className="text-yellow-400 flex items-center gap-1"><HiExclamationCircle /> Pre-Released — Awaiting review</span>
                  ) : existingResult ? (
                    <span>Last saved: {new Date(existingResult.updatedAt).toLocaleString()}</span>
                  ) : (
                    <span>No results logged yet.</span>
                  )}
                </div>
                
                <div className="flex gap-3">
                  {(!existingResult || existingResult.status === 'draft') && (
                    <button 
                      onClick={handleSaveDraft}
                      disabled={saving || !isLiveOrCompleted}
                      className="btn-secondary text-sm px-6 py-2"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  )}
                  {existingResult && existingResult.status === 'pre_released' && (
                    <button 
                      onClick={handlePublishResults}
                      disabled={publishing || !isLiveOrCompleted}
                      className="btn-primary bg-green-600 hover:bg-green-500 text-white text-sm px-6 py-2"
                    >
                      {publishing ? 'Confirming...' : '✅ Confirm Result'}
                    </button>
                  )}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
};

export default OrganizerScrimDetail;
