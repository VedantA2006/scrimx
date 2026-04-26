import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../lib/api';
import DashboardLayout from '../../components/layout/DashboardLayout';
import Loader from '../../components/ui/Loader';
import Badge from '../../components/ui/Badge';
import { HiArrowLeft, HiUsers, HiStar, HiExclamationCircle, HiPencilAlt, HiKey, HiChevronDown, HiChevronRight, HiLightningBolt, HiOutlineLockClosed, HiOutlineCheck, HiOutlineX } from 'react-icons/hi';
import { fileToBase64 } from '../../utils/imageUtils';
import AutoExtractPanel from '../../components/scrims/AutoExtractPanel';
import LiveChat from '../../components/scrims/LiveChat';

const OrganizerEditScrim = () => {
  const { id } = useParams();
  const [scrim, setScrim] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [existingResult, setExistingResult] = useState(null);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'slotList', 'idp', 'results'
  const [selectedMatchIdx, setSelectedMatchIdx] = useState(0);

  // Forms states
  const [formData, setFormData] = useState({});
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [idpForms, setIdpForms] = useState({});
  const [scores, setScores] = useState({});
  const [playerKills, setPlayerKills] = useState({}); // { matchIdx: { teamId: { memberId: kills } } }
  const [expandedTeams, setExpandedTeams] = useState({});
  const [matchScreenshots, setMatchScreenshots] = useState([]);
  const [disputes, setDisputes] = useState([]);

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

      // Initialize Edit Details Form Data
      setFormData({
        title: fetchedScrim.title,
        description: fetchedScrim.description || '',
        banner: fetchedScrim.banner || '',
        date: fetchedScrim.date ? new Date(fetchedScrim.date).toISOString().split('T')[0] : '',
        startTime: fetchedScrim.startTime,
        endTime: fetchedScrim.endTime || '',
        format: fetchedScrim.format,
        mode: fetchedScrim.mode,
        slotCount: fetchedScrim.slotCount,
        entryFee: fetchedScrim.entryFee,
        prizePool: fetchedScrim.prizePool,
        rules: fetchedScrim.rules || ''
      });

      // Initialize IDP Forms Data
      const initIdp = {};
      if (fetchedScrim.matches) {
        fetchedScrim.matches.forEach((m, idx) => {
          initIdp[idx] = { roomId: m.roomId || '', roomPassword: m.roomPassword || '' };
        });
      }
      setIdpForms(initIdp);

      // 2. Fetch Registrations (Slot List)
      const regRes = await api.get(`/registrations/scrim/${id}`);
      const approvedRegs = regRes.registrations.filter(r => r.status === 'approved');
      setRegistrations(approvedRegs);

      // 3. Fetch Existing Results (if drafted)
      try {
        const resultRes = await api.get(`/results/scrim/${id}`);
        if (resultRes.result) {
          setExistingResult(resultRes.result);
          // Prepopulate scores map
          const initialScores = {};
          const initialPlayerKills = {};
          resultRes.result.standings.forEach(std => {
            const tId = std.team._id || std.team;
            std.matchScores.forEach(ms => {
              const mIdx = ms.matchNumber - 1;
              if (!initialScores[mIdx]) initialScores[mIdx] = {};
              initialScores[mIdx][tId] = {
                positionPoints: ms.positionPoints || 0,
                killPoints: ms.killPoints || 0
              };
              // Restore per-player kills
              if (ms.playerKills && ms.playerKills.length > 0) {
                if (!initialPlayerKills[mIdx]) initialPlayerKills[mIdx] = {};
                if (!initialPlayerKills[mIdx][tId]) initialPlayerKills[mIdx][tId] = {};
                ms.playerKills.forEach(pk => {
                  initialPlayerKills[mIdx][tId][pk.userId] = pk.kills || 0;
                });
              }
            });
          });
          setScores(initialScores);
          setPlayerKills(initialPlayerKills);
          setMatchScreenshots(resultRes.result.matchScreenshots || []);
        }
      } catch (err) {
        // 404 means no results drafted yet, perfectly fine
      }

      // 4. Fetch Disputes
      try {
        const disputeRes = await api.get(`/results/scrim/${id}/disputes`);
        setDisputes(disputeRes.disputes || []);
      } catch (e) {}
    } catch (err) {
      toast.error('Failed to load scrim details');
    } finally {
      setLoading(false);
    }
  };

  // ----- Details Handlers -----
  const handleDetailsChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleBannerFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setFormData(prev => ({ ...prev, banner: base64 }));
      } catch (err) {
        toast.error('Failed to read image file');
      }
    }
  };

  const handleUpdateDetails = async (e) => {
    e.preventDefault();
    setSavingDetails(true);
    try {
      await api.put(`/scrims/${id}`, formData);
      toast.success('Scrim details updated successfully!');
      setIsEditingDetails(false);
      fetchData(); // refresh the scrim data
    } catch (err) {
      toast.error(err.message || 'Failed to update scrim');
    } finally {
      setSavingDetails(false);
    }
  };

  // ----- IDP Handlers -----
  const handleReleaseIdp = async (matchIndex) => {
    try {
      const idpData = idpForms[matchIndex];
      if (!idpData.roomId || !idpData.roomPassword) {
        toast.error('Please enter both Room ID and Password');
        return;
      }
      
      await api.put(`/scrims/${scrim._id}/matches/${matchIndex}/idp`, idpData);
      toast.success(`IDP Released for Match ${matchIndex + 1}! Emails sent.`);
      fetchData(); // reload to get new isIdpReleased status
    } catch (err) {
      toast.error(err.message || 'Failed to release IDP');
    }
  };

  // ----- Results Handlers -----
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

  const handlePlayerKillChange = (teamId, memberId, value) => {
    const val = parseInt(value) || 0;
    setPlayerKills(prev => {
      const updated = {
        ...prev,
        [selectedMatchIdx]: {
          ...(prev[selectedMatchIdx] || {}),
          [teamId]: {
            ...(prev[selectedMatchIdx]?.[teamId] || {}),
            [memberId]: val
          }
        }
      };
      // Auto-update team killPoints as sum of player kills
      const teamKills = updated[selectedMatchIdx][teamId];
      const totalKills = Object.values(teamKills).reduce((sum, k) => sum + k, 0);
      setScores(sPrev => ({
        ...sPrev,
        [selectedMatchIdx]: {
          ...(sPrev[selectedMatchIdx] || {}),
          [teamId]: {
            ...(sPrev[selectedMatchIdx]?.[teamId] || { positionPoints: 0, killPoints: 0 }),
            killPoints: totalKills
          }
        }
      }));
      return updated;
    });
  };

  const toggleTeamExpand = (teamId) => {
    setExpandedTeams(prev => ({ ...prev, [teamId]: !prev[teamId] }));
  };

  const getTeamTotalKills = (teamId, matchIdx) => {
    const teamKills = playerKills[matchIdx]?.[teamId] || {};
    return Object.values(teamKills).reduce((sum, k) => sum + k, 0);
  };

  const handleMatchScreenshotChange = async (e, matchIdx) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setMatchScreenshots(prev => {
          const newArr = [...prev];
          newArr[matchIdx] = base64;
          return newArr;
        });
      } catch (err) {
        toast.error('Failed to read image file');
      }
    }
  };

  const handleSaveDraft = async () => {
    try {
      setSaving(true);
      
      const standingsPayload = registrations.map(reg => {
        const tId = reg.team._id;
        const matchScores = [];

        (scrim.matches || []).forEach((m, idx) => {
          const teamMatchScore = scores[idx]?.[tId] || { positionPoints: 0, killPoints: 0 };
          // Build per-player kills array
          const teamPlayerKills = playerKills[idx]?.[tId] || {};
          const playerKillsArr = (reg.team.members || []).map(member => {
            const mUser = member.user;
            const memberId = mUser?._id || mUser;
            return {
              userId: memberId,
              ign: member.ign || mUser?.ign || mUser?.username || '',
              kills: teamPlayerKills[memberId] || 0
            };
          });
          matchScores.push({
            matchNumber: m.matchNumber,
            positionPoints: teamMatchScore.positionPoints,
            killPoints: playerKillsArr.reduce((s, p) => s + p.kills, 0),
            playerKills: playerKillsArr
          });
        });

        return { teamId: tId, matchScores };
      });

      await api.post(`/results/scrim/${id}`, { standings: standingsPayload, matchScreenshots });
      toast.success('Results saved!');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to save results');
    } finally {
      setSaving(false);
    }
  };

  const handlePreRelease = async () => {
    // First save, then pre-release
    try {
      setSaving(true);
      
      const standingsPayload = registrations.map(reg => {
        const tId = reg.team._id;
        const matchScores = [];
        (scrim.matches || []).forEach((m, idx) => {
          const teamMatchScore = scores[idx]?.[tId] || { positionPoints: 0, killPoints: 0 };
          const teamPlayerKills = playerKills[idx]?.[tId] || {};
          const playerKillsArr = (reg.team.members || []).map(member => {
            const mUser = member.user;
            const memberId = mUser?._id || mUser;
            return {
              userId: memberId,
              ign: member.ign || mUser?.ign || mUser?.username || '',
              kills: teamPlayerKills[memberId] || 0
            };
          });
          matchScores.push({
            matchNumber: m.matchNumber,
            positionPoints: teamMatchScore.positionPoints,
            killPoints: playerKillsArr.reduce((s, p) => s + p.kills, 0),
            playerKills: playerKillsArr
          });
        });
        return { teamId: tId, matchScores };
      });

      await api.post(`/results/scrim/${id}`, { standings: standingsPayload, matchScreenshots });
      await api.put(`/results/scrim/${id}/pre-release`);
      toast.success('Results pre-released! Players can now review them.');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to pre-release');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmResults = async () => {
    if (!window.confirm('Are you sure you want to CONFIRM results? This will distribute prizes and cannot be undone!')) {
      return;
    }
    try {
      setPublishing(true);
      await api.put(`/results/scrim/${id}/publish`);
      toast.success('Results confirmed & prizes distributed!');
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Failed to confirm results');
    } finally {
      setPublishing(false);
    }
  };

  const handleAutoExtractImport = (mappedData) => {
    setScores(prev => ({
      ...prev,
      [selectedMatchIdx]: {
        ...(prev[selectedMatchIdx] || {}),
        ...mappedData.scores
      }
    }));
    setPlayerKills(prev => ({
      ...prev,
      [selectedMatchIdx]: {
        ...(prev[selectedMatchIdx] || {}),
        ...mappedData.playerKills
      }
    }));
    setActiveTab('results'); // jump to preview
  };

  if (loading) return <DashboardLayout><div className="flex justify-center p-12"><Loader /></div></DashboardLayout>;
  if (!scrim) return <DashboardLayout><div className="text-center p-12 text-white">Scrim not found</div></DashboardLayout>;

  const isLiveOrCompleted = ['live', 'completed'].includes(scrim.status);

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link to="/organizer/scrims" className="text-dark-400 hover:text-white flex items-center gap-1 text-sm mb-2 transition-colors">
            <HiArrowLeft /> Back to My Scrims
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-white">Manage Scrim: {scrim.title}</h1>
            <Badge variant="info">{scrim.status.toUpperCase()}</Badge>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-surface-border mb-6 scrollbar-hide">
        <button 
          className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'details' ? 'border-neon-cyan text-neon-cyan' : 'border-transparent text-dark-400 hover:text-white'}`}
          onClick={() => setActiveTab('details')}
        >
          <div className="flex items-center gap-2"><HiPencilAlt /> Basic Details</div>
        </button>
        <button 
          className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'slotList' ? 'border-neon-cyan text-neon-cyan' : 'border-transparent text-dark-400 hover:text-white'}`}
          onClick={() => setActiveTab('slotList')}
        >
          <div className="flex items-center gap-2"><HiUsers /> Slot List</div>
        </button>
        <button 
          className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'idp' ? 'border-neon-cyan text-neon-cyan' : 'border-transparent text-dark-400 hover:text-white'}`}
          onClick={() => setActiveTab('idp')}
        >
          <div className="flex items-center gap-2"><HiKey /> IDP Release</div>
        </button>
        <button 
          className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'results' ? 'border-neon-cyan text-neon-cyan' : 'border-transparent text-dark-400 hover:text-white'}`}
          onClick={() => setActiveTab('results')}
        >
          <div className="flex items-center gap-2"><HiStar /> Declare Results</div>
        </button>
        <button 
          className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'autoExtract' ? 'border-neon-cyan text-neon-cyan' : 'border-transparent text-dark-400 hover:text-white'}`}
          onClick={() => setActiveTab('autoExtract')}
        >
          <div className="flex items-center gap-2"><HiLightningBolt /> Auto Extract Results</div>
        </button>
        <button 
          className={`px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === 'chat' ? 'border-neon-cyan text-neon-cyan' : 'border-transparent text-dark-400 hover:text-white'}`}
          onClick={() => setActiveTab('chat')}
        >
          <div className="flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
             Live Dispute Chat
          </div>
        </button>
      </div>

      <div className="pb-12">
        {/* DETAILS TAB */}
        {activeTab === 'details' && (
          <div className="bg-dark-900 border border-surface-border rounded-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-white">Scrim Details</h3>
              {!isEditingDetails ? (
                <button onClick={() => setIsEditingDetails(true)} className="btn-secondary text-sm px-4 py-1.5 flex items-center gap-2">
                  <HiPencilAlt /> Edit Details
                </button>
              ) : (
                <button onClick={() => { setIsEditingDetails(false); fetchData(); }} className="btn-ghost text-sm px-4 py-1.5">
                  Cancel Edit
                </button>
              )}
            </div>

            <form onSubmit={handleUpdateDetails} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-dark-300 block mb-1">Title</label>
                  <input required name="title" value={formData.title} onChange={handleDetailsChange} disabled={!isEditingDetails} className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-300 block mb-1">Banner Image Upload</label>
                  <div className="flex flex-col gap-2">
                    {formData.banner && <img src={formData.banner} alt="Banner Preview" className="h-16 w-32 object-cover rounded border border-surface-border" />}
                    <input type="file" accept="image/*" onChange={handleBannerFileChange} disabled={!isEditingDetails} className="input-field cursor-pointer file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-neon-cyan/20 file:text-neon-cyan hover:file:bg-neon-cyan/30" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-300 block mb-1">Date</label>
                  <input required type="date" name="date" value={formData.date} onChange={handleDetailsChange} disabled={!isEditingDetails} className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-300 block mb-1">Scrim Start Time <span className="text-xs text-dark-500 font-normal">(IST)</span></label>
                  <input required type="time" name="startTime" value={formData.startTime} onChange={handleDetailsChange} disabled={!isEditingDetails} className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-300 block mb-1">Scrim End Time <span className="text-xs text-dark-500 font-normal">(IST)</span></label>
                  <input required type="time" name="endTime" value={formData.endTime} onChange={handleDetailsChange} disabled={!isEditingDetails} className="input-field" />
                  <p className="text-[10px] text-dark-500 mt-1">Registration closes at this time</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-300 block mb-1">Format</label>
                  <select name="format" value={formData.format} onChange={handleDetailsChange} disabled={!isEditingDetails} className="input-field">
                    <option value="squad">Squad</option>
                    <option value="duo">Duo</option>
                    <option value="solo">Solo</option>
                    <option value="tdm">TDM</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-300 block mb-1">Mode</label>
                  <select name="mode" value={formData.mode} onChange={handleDetailsChange} disabled={!isEditingDetails} className="input-field">
                    <option value="tpp">TPP</option>
                    <option value="fpp">FPP</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-300 block mb-1">Total Slots</label>
                  <input required type="number" name="slotCount" value={formData.slotCount} onChange={handleDetailsChange} disabled={!isEditingDetails} className="input-field" />
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-300 block mb-1">Entry Fee</label>
                  <input required type="number" name="entryFee" value={formData.entryFee} onChange={handleDetailsChange} disabled={!isEditingDetails} className="input-field" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-dark-300 block mb-1">Description</label>
                <textarea name="description" value={formData.description} onChange={handleDetailsChange} disabled={!isEditingDetails} rows="3" className="input-field" />
              </div>

              {isEditingDetails && (
                <div className="flex justify-end pt-4 border-t border-surface-border">
                  <button type="submit" disabled={savingDetails} className="btn-primary">
                    {savingDetails ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

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
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-dark-950/50 border-b border-surface-border">
                    <tr>
                      <th className="p-4 text-xs font-semibold text-dark-400 uppercase w-20">Slot</th>
                      <th className="p-4 text-xs font-semibold text-dark-400 uppercase">Team</th>
                      <th className="p-4 text-xs font-semibold text-dark-400 uppercase hidden sm:table-cell">Registered By</th>
                      <th className="p-4 text-xs font-semibold text-dark-400 uppercase w-32">Status</th>
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
                            <td className="p-4 text-xs font-bold text-dark-500">#{visualSlot}</td>
                            <td className="p-4">
                              <span className="text-dark-600 italic text-xs">🔒 Reserved / Locked</span>
                            </td>
                            <td className="p-4 hidden sm:table-cell"></td>
                            <td className="p-4">
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
                            <td className="p-4 text-xs font-bold text-white">#{visualSlot}</td>
                            <td className="p-4">
                              <Link to={`/teams/${reg.team._id}`} target="_blank" className="flex items-center gap-3 group">
                                <img src={reg.team.logo || 'https://via.placeholder.com/40'} alt={reg.team.name} className="w-8 h-8 rounded-lg object-cover" />
                                <div>
                                  <p className="text-sm font-bold text-white group-hover:text-neon-cyan transition-colors">{reg.team.name}</p>
                                  <p className="text-xs text-dark-400">[{reg.team.tag}]</p>
                                </div>
                              </Link>
                            </td>
                            <td className="p-4 text-sm text-dark-300 hidden sm:table-cell">{reg.registeredBy?.username || 'N/A'}</td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 px-2 py-0.5 rounded-full"><HiOutlineCheck /> Filled</span>
                            </td>
                          </tr>
                        );
                      } else {
                        return (
                          <tr key={`empty-${visualSlot}`} className="hover:bg-dark-800/50 transition-colors">
                            <td className="p-4 text-xs font-bold text-dark-500">#{visualSlot}</td>
                            <td className="p-4">
                              <span className="text-dark-600 italic text-xs">— Empty Slot —</span>
                            </td>
                            <td className="p-4 hidden sm:table-cell"></td>
                            <td className="p-4">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-dark-800 text-dark-500 border border-surface-border px-2 py-0.5 rounded-full"><HiOutlineX /> Empty</span>
                            </td>
                          </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* IDP TAB */}
        {activeTab === 'idp' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white mb-4">Release IDP</h3>
            {scrim.matches && scrim.matches.map((match, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-dark-900 border border-surface-border">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                  <span className="text-base font-semibold text-white">Match {match.matchNumber} - {match.map}</span>
                  <div className="flex items-center gap-3 text-sm text-dark-300">
                    <span>IDP Time: <span className="text-white">{match.idpTime}</span></span>
                    <span>Start: <span className="text-white">{match.startTime}</span></span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="text-xs text-dark-400 block mb-1">Room ID</label>
                    <input 
                      type="text" 
                      value={idpForms[idx]?.roomId || ''} 
                      onChange={e => setIdpForms(prev => ({...prev, [idx]: {...prev[idx], roomId: e.target.value}}))}
                      className="input-field" 
                      placeholder="Enter Room ID"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-dark-400 block mb-1">Password</label>
                    <input 
                      type="text" 
                      value={idpForms[idx]?.roomPassword || ''} 
                      onChange={e => setIdpForms(prev => ({...prev, [idx]: {...prev[idx], roomPassword: e.target.value}}))}
                      className="input-field" 
                      placeholder="Enter Password"
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2">
                  {match.isIdpReleased && (
                    <span className="text-xs text-green-400 flex items-center gap-1">✅ IDP Released</span>
                  )}
                  {!match.isIdpReleased && <span />}
                  <button onClick={() => handleReleaseIdp(idx)} className="btn-primary text-sm px-6 py-2">
                    {match.isIdpReleased ? '🔄 Re-Release IDP' : 'Release & Notify Teams'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RESULTS TAB */}
        {activeTab === 'results' && (
          <div className="space-y-6">

            <div className="flex flex-col md:flex-row gap-6">
              {/* Match Selector */}
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
                  {selectedMatchIdx !== 'total' && (
                    <div className="flex items-center gap-2">
                       <label className="text-xs text-dark-400">Match Screenshot:</label>
                       <input 
                         type="file" 
                         accept="image/*" 
                         onChange={(e) => handleMatchScreenshotChange(e, selectedMatchIdx)}
                         disabled={existingResult?.status === 'finalized'}
                         className="text-xs text-dark-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-dark-800 file:text-white hover:file:bg-dark-700 cursor-pointer w-48"
                       />
                       {matchScreenshots[selectedMatchIdx] && <span className="text-xs text-green-400">✓ Attached</span>}
                    </div>
                  )}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="bg-dark-950 rounded-t-lg">
                        <th className="p-3 text-xs font-semibold text-dark-400 uppercase rounded-tl-lg">
                          {selectedMatchIdx === 'total' ? 'Rank & Team' : 'Slot - Team / Player'}
                        </th>
                        <th className="p-3 text-xs font-semibold text-dark-400 uppercase text-center">
                          {selectedMatchIdx === 'total' ? 'Total Pos Pts' : 'Position Pts'}
                        </th>
                        <th className="p-3 text-xs font-semibold text-dark-400 uppercase text-center">
                          {selectedMatchIdx === 'total' ? 'Total Kill Pts' : 'Kills'}
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
                            totalKill += getTeamTotalKills(tId, idx);
                          });
                          const totalPts = totalPos + totalKill;
                          return { reg, totalPos, totalKill, totalPts };
                        })
                        .sort((a, b) => b.totalPts - a.totalPts)
                        .map(({ reg, totalPos, totalKill, totalPts }, idx) => {
                          const tId = reg.team._id;
                          const isExpanded = expandedTeams[`total-${tId}`];
                          const members = reg.team.members || [];
                          return (
                            <React.Fragment key={tId}>
                              <tr className="hover:bg-dark-800/30 transition-colors cursor-pointer" onClick={() => setExpandedTeams(p => ({ ...p, [`total-${tId}`]: !p[`total-${tId}`] }))}>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? <HiChevronDown className="text-dark-400" /> : <HiChevronRight className="text-dark-400" />}
                                    <span className="text-dark-400 font-bold w-6">#{idx + 1}</span>
                                    <img src={reg.team.logo || 'https://via.placeholder.com/40'} className="w-6 h-6 rounded object-cover" />
                                    <span className="text-sm font-bold text-white max-w-[120px] truncate" title={reg.team.name}>{reg.team.name}</span>
                                    <span className="text-xs text-dark-500 ml-1">({members.length})</span>
                                  </div>
                                </td>
                                <td className="p-3 text-center text-white">{totalPos}</td>
                                <td className="p-3 text-center text-white">{totalKill}</td>
                                <td className="p-3 text-center">
                                  <span className="text-sm font-bold text-neon-cyan bg-neon-cyan/10 px-3 py-1 rounded inline-block min-w-[40px]">{totalPts}</span>
                                </td>
                              </tr>
                              {isExpanded && members.map(member => {
                                const mUser = member.user || {};
                                const memberId = mUser._id || mUser;
                                const memberIgn = member.ign || mUser.ign || mUser.username || 'Unknown';
                                let memberTotalKills = 0;
                                (scrim.matches || []).forEach((_, mIdx) => {
                                  memberTotalKills += (playerKills[mIdx]?.[tId]?.[memberId] || 0);
                                });
                                return (
                                  <tr key={String(memberId)} className="bg-dark-950/30">
                                    <td className="p-2 pl-14">
                                      <div className="flex items-center gap-2">
                                        <div className="w-5 h-5 rounded bg-dark-700 flex items-center justify-center text-[10px] text-dark-400 overflow-hidden">
                                          {mUser.avatar ? <img src={mUser.avatar} className="w-full h-full object-cover" /> : (mUser.username || '?')[0].toUpperCase()}
                                        </div>
                                        <span className="text-xs text-dark-300">{memberIgn}</span>
                                        {member.role === 'captain' && <span className="text-[10px] text-yellow-400 font-bold">C</span>}
                                      </div>
                                    </td>
                                    <td className="p-2 text-center text-xs text-dark-500">—</td>
                                    <td className="p-2 text-center text-xs text-white">{memberTotalKills}</td>
                                    <td className="p-2 text-center text-xs text-dark-500">—</td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })
                      ) : (
                        registrations.map(reg => {
                          const tId = reg.team._id;
                          const pPts = scores[selectedMatchIdx]?.[tId]?.positionPoints || 0;
                          const kPts = getTeamTotalKills(tId, selectedMatchIdx);
                          const matchTotal = pPts + kPts;
                          const isExpanded = expandedTeams[tId];
                          const members = reg.team.members || [];
                          
                          return (
                            <React.Fragment key={tId}>
                              {/* Team Row */}
                              <tr className="hover:bg-dark-800/30 transition-colors cursor-pointer" onClick={() => toggleTeamExpand(tId)}>
                                <td className="p-3">
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? <HiChevronDown className="text-neon-cyan" /> : <HiChevronRight className="text-dark-400" />}
                                    <span className="text-sm text-dark-400">#{reg.slotNumber}</span>
                                    <img src={reg.team.logo || 'https://via.placeholder.com/40'} className="w-6 h-6 rounded object-cover" />
                                    <span className="text-sm font-bold text-white max-w-[120px] xl:max-w-none truncate" title={reg.team.name}>{reg.team.name}</span>
                                    <span className="text-xs text-dark-500">({members.length})</span>
                                  </div>
                                </td>
                                <td className="p-3 text-center">
                                  <input 
                                    type="number" 
                                    min="0"
                                    value={pPts === 0 ? '' : pPts} 
                                    onChange={(e) => { e.stopPropagation(); handleScoreChange(tId, 'positionPoints', e.target.value); }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="input-field text-center py-1.5 w-20 mx-auto bg-dark-950"
                                    placeholder="0"
                                    disabled={existingResult?.status === 'finalized'}
                                  />
                                </td>
                                <td className="p-3 text-center">
                                  <span className="text-sm font-semibold text-white">{kPts}</span>
                                </td>
                                <td className="p-3 text-center">
                                  <span className="text-sm font-bold text-neon-cyan bg-neon-cyan/10 px-3 py-1 rounded inline-block min-w-[40px]">{matchTotal}</span>
                                </td>
                              </tr>
                              {/* Player Rows (expanded) */}
                              {isExpanded && members.map(member => {
                                const mUser = member.user || {};
                                const memberId = mUser._id || mUser;
                                const memberIgn = member.ign || mUser.ign || mUser.username || 'Unknown';
                                const memberKills = playerKills[selectedMatchIdx]?.[tId]?.[memberId] || 0;
                                return (
                                  <tr key={String(memberId)} className="bg-dark-950/50 border-l-2 border-l-primary-500/30">
                                    <td className="p-2 pl-14">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded bg-dark-700 flex items-center justify-center text-xs text-dark-400 overflow-hidden flex-shrink-0">
                                          {mUser.avatar ? <img src={mUser.avatar} className="w-full h-full object-cover" /> : (mUser.username || '?')[0].toUpperCase()}
                                        </div>
                                        <span className="text-sm text-dark-300">{memberIgn}</span>
                                        {member.role === 'captain' && <span className="text-[10px] text-yellow-400 font-bold">C</span>}
                                      </div>
                                    </td>
                                    <td className="p-2 text-center text-xs text-dark-500">—</td>
                                    <td className="p-2 text-center">
                                      <input
                                        type="number"
                                        min="0"
                                        value={memberKills === 0 ? '' : memberKills}
                                        onChange={(e) => handlePlayerKillChange(tId, memberId, e.target.value)}
                                        className="input-field text-center py-1 w-16 mx-auto bg-dark-900 text-sm"
                                        placeholder="0"
                                        disabled={existingResult?.status === 'finalized'}
                                      />
                                    </td>
                                    <td className="p-2 text-center text-xs text-dark-500">—</td>
                                  </tr>
                                );
                              })}
                            </React.Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="text-sm text-dark-400">
                    {existingResult?.status === 'finalized' ? (
                      <span className="text-green-400 flex items-center gap-1"><HiStar /> Results Confirmed & Prizes Distributed</span>
                    ) : existingResult?.status === 'pre_released' ? (
                      <span className="text-yellow-400 flex items-center gap-1"><HiExclamationCircle /> Pre-Released — Awaiting player review</span>
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
                        disabled={saving}
                        className="btn-secondary text-sm px-5 py-2"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    )}
                    {(!existingResult?.status || existingResult?.status === 'draft' || existingResult?.status === 'pre_released') && (
                      <button 
                        onClick={handlePreRelease}
                        disabled={saving}
                        className="btn-primary text-sm px-5 py-2 flex items-center gap-2"
                      >
                        {saving ? 'Releasing...' : (existingResult?.status === 'pre_released' ? '🔄 Update & Re-release' : '📢 Pre-Release')}
                      </button>
                    )}
                    {existingResult && existingResult.status === 'pre_released' && (
                      <button 
                        onClick={handleConfirmResults}
                        disabled={publishing}
                        className="btn-primary bg-green-600 hover:bg-green-500 text-white text-sm px-5 py-2 flex items-center gap-2"
                      >
                        {publishing ? 'Confirming...' : '✅ Confirm Result'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Disputes Section (visible when pre-released) */}
                {existingResult?.status === 'pre_released' && (
                  <div className="mt-6 border-t border-surface-border pt-6">
                    <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                      <HiExclamationCircle className="text-yellow-400" /> Player Disputes ({disputes.length})
                    </h4>
                    {disputes.length === 0 ? (
                      <div className="bg-dark-950 border border-surface-border rounded-lg p-4 text-center text-sm text-dark-400">
                        No disputes raised yet. Players are reviewing the results.
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {disputes.map(d => (
                          <div key={d._id} className="bg-dark-950 border border-orange-500/20 rounded-lg p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-6 h-6 rounded bg-dark-700 flex items-center justify-center text-xs text-dark-400 overflow-hidden flex-shrink-0">
                                {d.raisedBy?.avatar ? <img src={d.raisedBy.avatar} className="w-full h-full object-cover" /> : (d.raisedBy?.username || '?')[0].toUpperCase()}
                              </div>
                              <span className="text-sm font-semibold text-white">{d.raisedBy?.ign || d.raisedBy?.username}</span>
                              <span className="text-xs text-dark-500">{new Date(d.createdAt).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-dark-300">{d.description}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}

      </div>
      
      {activeTab === 'autoExtract' && (
         <AutoExtractPanel 
             scrim={scrim}
             registrations={registrations}
             selectedMatchIdx={selectedMatchIdx}
             setSelectedMatchIdx={setSelectedMatchIdx}
             onImport={handleAutoExtractImport}
         />
      )}

      {activeTab === 'chat' && (
         <div className="mx-auto w-full max-w-4xl">
            <LiveChat scrim={scrim} />
         </div>
      )}

    </DashboardLayout>
  );
};

export default OrganizerEditScrim;
