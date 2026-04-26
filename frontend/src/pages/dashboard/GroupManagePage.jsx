import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HiArrowLeft, HiOutlineUserGroup, HiOutlineLockClosed, HiOutlineClipboardList,
  HiOutlineLightningBolt, HiOutlineChat, HiOutlineRefresh,
  HiOutlineCheck, HiOutlineX, HiOutlineSave, HiOutlineEye, HiOutlineEyeOff,
  HiOutlineExclamationCircle, HiOutlineShieldCheck, HiOutlineUpload,
  HiPaperAirplane, HiOutlineSpeakerphone, HiPhotograph,
  HiOutlineLink, HiOutlineDuplicate, HiOutlineCollection
} from 'react-icons/hi';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { fileToBase64 } from '../../utils/imageUtils';
import AutoExtractPanel from '../../components/scrims/AutoExtractPanel';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'slotList',      label: 'Slot List',            icon: HiOutlineUserGroup },
  { id: 'idp',           label: 'Important Messages',    icon: HiOutlineLockClosed },
  { id: 'results',       label: 'Declare Results',       icon: HiOutlineClipboardList },
  { id: 'extract',       label: 'Auto Extract Results',  icon: HiOutlineLightningBolt },
  { id: 'chat',          label: 'Group Chat',            icon: HiOutlineChat },
  { id: 'promote',       label: 'Qualify Teams',         icon: HiOutlineShieldCheck },
  { id: 'import',        label: 'Import Teams',          icon: HiOutlineCollection },
  { id: 'announce',      label: 'Announcements',         icon: HiOutlineSpeakerphone },
];
// isFinalStage is computed after groupStage is loaded (see derived block near render)

const MAP_OPTIONS = ['Erangel', 'Miramar', 'Sanhok', 'Vikendi', 'Livik', 'Karakin'];

const GroupManagePage = () => {
  const { id: tournamentId, groupId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [activeTab, setActiveTab] = useState('slotList');
  const [group, setGroup]     = useState(null);
  const [slots, setSlots]     = useState([]);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);

  // IDP Matches state — array of { _id?, matchNumber, mapName, roomId, roomPassword, isReleased, showPwd }
  const [matches, setMatches] = useState([]);
  const [matchSaving, setMatchSaving] = useState({});

  // Results state — { [teamId]: { placement: '', kills: '' } }
  const [resultData, setResultData]     = useState({});
  const [savedResult, setSavedResult]   = useState(null);
  const [resultSaving, setResultSaving] = useState(false);

  // Auto Extract state
  const [extractSession, setExtractSession]   = useState(null);
  const [extractMatch, setExtractMatch]       = useState(1);
  const [extractFiles, setExtractFiles]       = useState([]);
  const [extractPreviews, setExtractPreviews] = useState([]);
  const [extracting, setExtracting]           = useState(false);
  const [extractResults, setExtractResults]   = useState([]);
  const extractInputRef = useRef(null);

  // Live Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]       = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const chatBottomRef = useRef(null);
  const chatInputRef  = useRef(null);
  const isOrganizer   = user?.role === 'organizer' || user?.role === 'admin';

  // ── Invite Link state ────────────────────────────────────────────────────
  const [inviteLink, setInviteLink]           = useState('');
  const [inviteExpiry, setInviteExpiry]       = useState(null);
  const [multiLinks, setMultiLinks]           = useState([]);
  const [inviteLoading, setInviteLoading]     = useState(false);
  const [inviteMode, setInviteMode]           = useState('single'); // 'single' | 'multi'
  const [groupStage, setGroupStage]           = useState(null);

  // ── Email Notification state ─────────────────────────────────────────────────
  const [emailSubject, setEmailSubject]       = useState('');
  const [emailBody, setEmailBody]             = useState('');
  const [emailSending, setEmailSending]       = useState(false);
  const [emailResult, setEmailResult]         = useState(null);
  const [emailAttachments, setEmailAttachments] = useState([]); // [{file, preview, id}]
  const emailFileInputRef = useRef(null);

  // ── Import Teams state ───────────────────────────────────────────────────────
  const [importableTeams, setImportableTeams] = useState([]);
  const [selectedImports, setSelectedImports] = useState(new Set());
  const [importing, setImporting] = useState(false);

  useEffect(() => {
     if (activeTab === 'import') {
        fetchImportableTeams();
     }
  }, [activeTab]);

  const fetchImportableTeams = async () => {
      try {
         const res = await api.get(`/tournaments/${tournamentId}/results`);
         if (res.success && res.data) {
            const qualified = [];
            res.data.forEach(result => {
               if (result.groupId?.toString() === groupId) return;
               (result.standings || []).forEach(s => {
                  if (s.isQualifiedForNextStage && s.teamId) {
                     qualified.push(s.teamId);
                  }
               });
            });
            const unique = [];
            const ids = new Set();
            for (const t of qualified) {
               const idStr = t._id?.toString();
               if (!ids.has(idStr)) {
                  ids.add(idStr);
                  unique.push(t);
               }
            }
            setImportableTeams(unique);
         }
      } catch (err) {
         toast.error("Failed to load importable teams");
      }
  };

  const toggleImportSelection = (teamId) => {
     const next = new Set(selectedImports);
     if (next.has(teamId)) next.delete(teamId);
     else next.add(teamId);
     setSelectedImports(next);
  };

  const handleImportTeams = async () => {
     if (selectedImports.size === 0) return;
     setImporting(true);
     try {
        const res = await api.post(`/tournaments/${tournamentId}/groups/${groupId}/add-teams`, {
           teamIds: Array.from(selectedImports)
        });
        if (res.success) {
           toast.success(res.message);
           setSelectedImports(new Set());
           fetchAll(); 
           setActiveTab('slotList');
        }
     } catch (err) {
        toast.error(err.response?.data?.message || "Import failed");
     } finally {
        setImporting(false);
     }
  };

  useEffect(() => { fetchAll(); }, [groupId]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [slotsRes, roomsRes, resultsRes, disputesRes] = await Promise.all([
        api.get(`/tournaments/${tournamentId}/slots`),
        api.get(`/tournaments/${tournamentId}/rooms`),
        api.get(`/tournaments/${tournamentId}/groups/${groupId}/results`).catch(() => ({ success: false, data: null })),
        api.get(`/tournaments/${tournamentId}/disputes`).catch(() => ({ success: false, data: [] })),
      ]);

      // ── Groups & Slots ──────────────────────────────────────────────────
      if (slotsRes.success && slotsRes.data) {
        const thisGroup = (slotsRes.data.groups || []).find(g => g._id === groupId);
        setGroup(thisGroup || null);

        // Enrich group with linked stage info
        if (thisGroup?.stageId) {
          const linkedStage = (slotsRes.data.stages || []).find(s => s._id === thisGroup.stageId);
          setGroupStage(linkedStage || null);
        }
        const gSlots = (slotsRes.data.slots || [])
          .filter(s => s.groupId === groupId)
          .sort((a, b) => a.slotNumber - b.slotNumber);
        setSlots(gSlots);
      }

      // ── Results — use dedicated group endpoint which returns a single result ──
      const existing = resultsRes.success ? resultsRes.data : null;
      if (existing) {
        setSavedResult(existing);
        const map = {};
        (existing.standings || []).forEach(s => {
          map[s.teamId?._id || s.teamId] = {
            placement: s.rank || '',
            kills: s.totalKills || '',
          };
        });
        setResultData(map);
      } else {
        setSavedResult(null);
      }

      // ── Room / IDP — load all matches for this group ─────────────────────
      if (roomsRes.success && Array.isArray(roomsRes.data)) {
        const groupRooms = roomsRes.data
          .filter(r => r.groupId?.toString() === groupId)
          .sort((a, b) => a.matchNumber - b.matchNumber);
        if (groupRooms.length) {
          setMatches(groupRooms.map(r => ({
            _id: r._id,
            matchNumber: r.matchNumber,
            mapName: r.mapName || 'Erangel',
            roomId: r.roomId || '',
            roomPassword: r.roomPassword || '',
            isReleased: r.isReleased || false,
            showPwd: false,
          })));
        } else {
          // Default: one empty match card
          setMatches([{ matchNumber: 1, mapName: 'Erangel', roomId: '', roomPassword: '', isReleased: false, showPwd: false }]);
        }
      }

      // ── Disputes ────────────────────────────────────────────────────────
      if (disputesRes.success && Array.isArray(disputesRes.data)) {
        setDisputes(disputesRes.data);
      }
    } catch (err) {
      toast.error('Failed to load group data');
    } finally {
      setLoading(false);
    }
  };

  // ── IDP helpers ──────────────────────────────────────────────────────────
  const addMatch = () => {
    const nextNum = matches.length ? Math.max(...matches.map(m => m.matchNumber)) + 1 : 1;
    setMatches(prev => [...prev, { matchNumber: nextNum, mapName: 'Erangel', roomId: '', roomPassword: '', isReleased: false, showPwd: false }]);
  };

  const removeMatch = async (match, idx) => {
    if (match._id) {
      try {
        await api.delete(`/tournaments/${tournamentId}/rooms/${match._id}`);
        toast.success(`Match ${match.matchNumber} removed`);
      } catch { toast.error('Remove failed'); return; }
    }
    setMatches(prev => prev.filter((_, i) => i !== idx));
  };

  const updateMatch = (idx, field, value) => {
    setMatches(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const saveMatch = async (match, idx, releaseOverride) => {
    if (!match.roomId.trim()) return toast.error('Room ID is required');
    setMatchSaving(prev => ({ ...prev, [idx]: true }));
    try {
      const payload = {
        groupId,
        matchNumber: match.matchNumber,
        roomId: match.roomId.trim(),
        roomPassword: match.roomPassword.trim(),
        mapName: match.mapName,
        isReleased: releaseOverride !== undefined ? releaseOverride : match.isReleased,
      };
      const res = await api.post(`/tournaments/${tournamentId}/rooms`, payload);
      if (res.success) {
        setMatches(prev => prev.map((m, i) => i === idx ? { ...m, _id: res.data?._id || m._id, isReleased: payload.isReleased } : m));
        toast.success(releaseOverride === true ? `🔓 Match ${match.matchNumber} released!` :
                      releaseOverride === false ? `🔒 Match ${match.matchNumber} revoked` : `Match ${match.matchNumber} saved`);
      }
    } catch { toast.error('Save failed'); }
    finally { setMatchSaving(prev => ({ ...prev, [idx]: false })); }
  };

  // ── Invite Link handlers ──────────────────────────────────────────────────
  const handleGenerateSingleLink = async () => {
    setInviteLoading(true);
    try {
      const res = await api.post(`/tournaments/${tournamentId}/groups/${groupId}/invite-link`);
      if (res.success) {
        setInviteLink(res.inviteUrl);
        setInviteExpiry(res.expiresAt);
        toast.success('Invite link generated!');
      } else toast.error(res.message || 'Failed');
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setInviteLoading(false); }
  };

  const handleGenerateMultiLinks = async () => {
    setInviteLoading(true);
    try {
      const res = await api.post(`/tournaments/${tournamentId}/groups/${groupId}/multi-invite`);
      if (res.success) {
        setMultiLinks(res.links || []);
        setInviteExpiry(res.expiresAt);
        toast.success(res.message);
      } else toast.error(res.message || 'Failed');
    } catch (err) { toast.error(err.message || 'Failed'); }
    finally { setInviteLoading(false); }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Copied!'));
  };

  // Is this group a Grand Final or a Paid stage? (determines multi-join availability)
  const isGrandFinalOrPaid = groupStage?.type === 'final' || groupStage?.stageCategory === 'paid' ||
    (typeof groupStage?.name === 'string' && groupStage.name.toLowerCase().includes('final'));

  // ── Results submit ────────────────────────────────────────────────────────
  const handleSubmitResults = async () => {
    const filledSlots = slots.filter(s => s.occupyingTeam);
    const payload = filledSlots.map(slot => {
      const teamId = slot.occupyingTeam._id;
      const entry  = resultData[teamId] || {};
      return {
        teamId,
        placement: parseInt(entry.placement) || 0,
        kills: parseInt(entry.kills) || 0,
      };
    });
    if (!payload.length) return toast.error('No teams slotted — nothing to submit');
    setResultSaving(true);
    try {
      const res = await api.post(`/tournaments/${tournamentId}/results`, { data: payload, groupId });
      if (res.success) { toast.success('Results submitted successfully!'); fetchAll(); }
    } catch { toast.error('Failed to submit results'); }
    finally { setResultSaving(false); }
  };

  // ── Promotions ───────────────────────────────────────────────────────────
  const [autoPromoting, setAutoPromoting] = useState(false);
  const [topN, setTopN] = useState('');
  const [promotingTopN, setPromotingTopN] = useState(false);
  const [togglingTeams, setTogglingTeams] = useState(new Set());

  const handlePromoteTopN = async () => {
    if (!topN || isNaN(topN) || topN <= 0) return toast.error('Enter a valid number of teams to promote.');
    setPromotingTopN(true);
    try {
      const res = await api.post(`/tournaments/${tournamentId}/groups/${groupId}/promote-top`, { topN });
      if (res.success) {
        toast.success(res.message);
        fetchAll();
      } else {
        toast.error(res.message || 'Failed to promote top teams.');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to promote top teams.');
    } finally {
      setPromotingTopN(false);
    }
  };

  const handleToggleQualify = async (teamId, isCurrentlyPromoted) => {
    if (togglingTeams.has(teamId)) return;
    setTogglingTeams(prev => { const next = new Set(prev); next.add(teamId); return next; });
    try {
      const res = await api.put(`/tournaments/${tournamentId}/groups/${groupId}/qualify/${teamId}`, {
        isQualified: !isCurrentlyPromoted
      });
      if (res.success) {
        toast.success(res.message || (isCurrentlyPromoted ? 'Promotion Revoked' : '✅ Team Promoted'));
        fetchAll();
      } else {
        toast.error(res.message || 'Toggle failed.');
      }
    } catch (err) {
      toast.error(err.message || 'Toggle failed.');
    } finally {
      setTogglingTeams(prev => { const next = new Set(prev); next.delete(teamId); return next; });
    }
  };

  const handleAutoPromote = async () => {
    if (!window.confirm('This will read the stage roadmap configuration and auto-promote the top teams across all ranks. Proceed?')) return;
    
    setAutoPromoting(true);
    try {
      const res = await api.post(`/tournaments/${tournamentId}/groups/${groupId}/auto-promote`);
      if (res.success) {
        toast.success(res.message);
        fetchAll();
      } else {
        toast.error(res.message || 'Auto-promote failed.');
      }
    } catch (err) {
      toast.error(err.message || 'Auto-promote failed.');
    } finally {
      setAutoPromoting(false);
    }
  };

  // ── Auto Extract helpers ─────────────────────────────────────────────────
  const getOrCreateSession = async () => {
    if (extractSession) return extractSession;
    // Use groupId as the fake scrim ID since Mongoose expects a valid ObjectId
    const fakeScrimId = groupId;
    try {
      const res = await api.get(`/extractions/scrim/${fakeScrimId}/match/${extractMatch - 1}/session`);
      const session = res.session || res.data;
      setExtractSession(session);
      if (session?.screenshots?.length) setExtractPreviews(session.screenshots.map(s => s.url || s));
      return session;
    } catch (err) { 
      console.error("Session initialize error:", err);
      toast.error(err.response?.data?.message || 'Could not initialize session'); 
      return null; 
    }
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const session = await getOrCreateSession();
    if (!session) return;
    
    let lastSession = session;
    for (const f of files) {
        try {
            const base64 = await fileToBase64(f);
            const res = await api.post(`/extractions/session/${session._id}/upload`, { imageUrl: base64 });
            if (res.success && res.session) lastSession = res.session;
        } catch { toast.error(`Failed to upload screenshot`); }
    }
    
    if (lastSession?.screenshots) {
      setExtractPreviews(lastSession.screenshots.map(s => s.url || s));
      toast.success(`${files.length} screenshot(s) uploaded`);
    }
  };

  const handleRemoveScreenshot = async (url) => {
    if (!extractSession) return;
    try {
      await api.post(`/extractions/session/${extractSession._id}/screenshot/remove`, { url });
      setExtractPreviews(prev => prev.filter(p => p !== url));
    } catch { toast.error('Remove failed'); }
  };

  const handleStartExtraction = async () => {
    const session = await getOrCreateSession();
    if (!session) return;
    if (!extractPreviews.length) return toast.error('Upload at least one screenshot first');
    setExtracting(true);
    try {
      await api.post(`/extractions/session/${session._id}/extract`);
      toast.success('AI Extraction started. Refinement can take up to 60 seconds...');
      
      const poll = setInterval(async () => {
        try {
          const sessionRes = await api.get(`/extractions/scrim/${groupId}/match/${extractMatch - 1}/session`);
          const updated = sessionRes.session || sessionRes.data;
          
          if (updated) {
            setExtractSession(updated);
            if (updated.status === 'extracted' || updated.status === 'imported') {
              clearInterval(poll);
              const r = await api.get(`/extractions/session/${updated._id}/results`);
              setExtractResults(r.teams || []);
              setExtracting(false);
              toast.success('Extraction complete!');
            } else if (updated.status === 'failed') {
              clearInterval(poll);
              toast.error('Extraction failed server-side.');
              setExtracting(false);
            }
          }
        } catch { /* silent */ }
      }, 3000);
      
    } catch { toast.error('Extraction failed to start'); setExtracting(false); }
  };

  const handleImportResults = async () => {
    if (!extractSession || !extractResults.length) return toast.error('Nothing to import yet');
    try {
      await api.post(`/extractions/session/${extractSession._id}/import`);

      // Populate local state directly from already fetched results
      const newResultData = { ...resultData };
      let importedCount = 0;
      extractResults.forEach(t => {
         if (t.matchedTeamId) {
             newResultData[t.matchedTeamId] = {
                 placement: t.placement || '',
                 kills: t.teamKills || t.kills || 0
             };
             importedCount++;
         }
      });
      setResultData(newResultData);
      
      if (importedCount === 0) {
          toast.error("Couldn't map any teams automatically. Are they registered in the Slot List?");
      } else {
          toast.success(`✅ ${importedCount} team results successfully imported! Check 'Declare Results'.`);
      }
    } catch { toast.error('Import failed'); }
  };

  // ── Socket Chat ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !groupId) return;
    socket.emit('join_group_chat', groupId);
    setChatMessages([{
      _id: 'sys-1', type: 'system',
      content: `Group Chat — organizers can broadcast announcements, and all players in this group can talk.`,
      createdAt: new Date().toISOString(),
    }]);
    socket.on('group_message', msg => setChatMessages(prev => [...prev, msg]));
    return () => {
      socket.emit('leave_group_chat', groupId);
      socket.off('group_message');
    };
  }, [socket, groupId]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const sendChatMessage = (e) => {
    e.preventDefault();
    const content = chatInput.trim();
    if (!content || !socket) return;
    socket.emit('group_message', {
      groupId,
      content,
      type: isOrganizer && isAnnouncement ? 'announcement' : 'message',
    });
    setChatInput('');
    chatInputRef.current?.focus();
  };

  const formatTime = (iso) => {
    try { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); }
    catch { return ''; }
  };

  const filledSlots  = slots.filter(s => s.occupyingTeam);
  const emptyCount   = slots.filter(s => !s.occupyingTeam).length;
  const fillPct      = group?.teamsLimit > 0 ? Math.round((filledSlots.length / group.teamsLimit) * 100) : 0;

  // Detect if this is the Grand Finals / Final stage — no promotion, show prize push instead
  const isFinalStage = (
    groupStage?.stageCategory === 'final' ||
    groupStage?.type === 'final' ||
    group?.name?.toLowerCase().includes('grand final') ||
    group?.name?.toLowerCase().includes('grand finals')
  );

  // Build visible tabs — for final stage, replace Promote Teams with nothing (we show a button instead)
  const visibleTabs = TABS.filter(t => isFinalStage ? t.id !== 'promote' : true);


  if (loading) return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!group) return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center text-dark-400">
      <div className="text-center">
        <HiOutlineExclamationCircle className="text-5xl mb-3 mx-auto text-red-400" />
        <p>Group not found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 btn-ghost text-sm px-4 py-2">← Go Back</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-dark-950 text-white flex flex-col">

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <div className="bg-dark-900 border-b border-surface-border px-6 py-4 shrink-0">
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-dark-400 hover:text-white transition-colors text-sm">
              <HiArrowLeft /> Back to Groups
            </button>
            <div className="w-px h-5 bg-surface-border" />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white">
                  Manage Group: <span className="text-neon-cyan">{group.name}</span>
                </h1>
                <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border ${
                  matches.some(m => m.isReleased)
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : 'bg-dark-800 text-dark-400 border-surface-border'
                }`}>
                  {matches.some(m => m.isReleased) ? '🔓 IDP Live' : '🔒 IDP Pending'}
                </span>
              </div>
              <p className="text-xs text-dark-400 mt-0.5">
                {filledSlots.length}/{group.teamsLimit} teams · {emptyCount} empty · {fillPct}% filled
              </p>
            </div>
          </div>
          <button onClick={fetchAll} className="btn-ghost text-sm flex items-center gap-1.5 px-3 py-2">
            <HiOutlineRefresh /> Refresh
          </button>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────────────────────── */}
      <div className="bg-dark-900 border-b border-surface-border px-6 shrink-0">
        <div className="max-w-7xl mx-auto flex overflow-x-auto items-center">
          {visibleTabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-neon-cyan text-neon-cyan'
                    : 'border-transparent text-dark-400 hover:text-white hover:border-dark-400'
                }`}
              >
                <Icon className="text-base" /> {tab.label}
              </button>
            );
          })}

          {/* For Grand Finals: show Push Results button in tab bar instead of Promote */}
          {isFinalStage && (
            <button
              onClick={() => navigate(`/organizer/tournaments/${tournamentId}/results?groupId=${groupId}`)}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-500/20 transition-all whitespace-nowrap"
            >
              🏆 Push Results & Prize Pool
            </button>
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">

          {/* ════════════ SLOT LIST ════════════ */}
          {activeTab === 'slotList' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Capacity',  val: group.teamsLimit,       color: 'text-white' },
                  { label: 'Filled',    val: filledSlots.length,     color: 'text-neon-cyan' },
                  { label: 'Empty',     val: emptyCount,             color: emptyCount > 0 ? 'text-yellow-400' : 'text-dark-600' },
                  { label: 'Fill Rate', val: `${fillPct}%`,          color: fillPct >= 100 ? 'text-green-400' : 'text-primary-400' },
                ].map(s => (
                  <div key={s.label} className="bg-dark-900 border border-surface-border rounded-xl p-4 text-center">
                    <p className="text-[10px] text-dark-400 uppercase tracking-widest mb-1">{s.label}</p>
                    <p className={`text-3xl font-bold ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-neon-cyan to-primary-500 rounded-full transition-all duration-700"
                  style={{ width: `${fillPct}%` }} />
              </div>

              {/* ── Invite Link Panel ───────────────────────────────────────── */}
              <div className="bg-dark-900 border border-surface-border rounded-2xl overflow-hidden">
                <div className="bg-dark-950 px-5 py-4 border-b border-surface-border flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <HiOutlineLink className="text-neon-cyan text-lg" />
                    <h2 className="font-bold text-white">Invite Link</h2>
                    <span className="text-[10px] text-dark-400 bg-dark-800 px-2 py-0.5 rounded-full border border-surface-border">
                      Share with teams to join this group
                    </span>
                  </div>
                  {/* Mode toggle — only for Grand Final / Paid groups */}
                  {isGrandFinalOrPaid && (
                    <div className="flex items-center bg-dark-800 rounded-lg p-1 gap-1">
                      {['single', 'multi'].map(m => (
                        <button key={m} onClick={() => setInviteMode(m)}
                          className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                            inviteMode === m
                              ? 'bg-neon-cyan text-dark-900 shadow'
                              : 'text-dark-400 hover:text-white'
                          }`}>
                          {m === 'single' ? '🔗 Single Link' : '📋 Multi-Join'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  {/* SINGLE LINK MODE */}
                  {inviteMode === 'single' && (
                    <div className="space-y-3">
                      <p className="text-xs text-dark-400">
                        Generate one shared link — any team captain can click it to claim an empty slot.
                      </p>
                      <div className="flex gap-2">
                        <button onClick={handleGenerateSingleLink} disabled={inviteLoading}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-dark-900 bg-neon-cyan hover:bg-neon-cyan/80 transition-colors disabled:opacity-50">
                          <HiOutlineLink /> {inviteLoading ? 'Generating...' : 'Generate Link'}
                        </button>
                        {inviteLink && (
                          <button onClick={() => copyToClipboard(inviteLink)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold border border-surface-border text-dark-300 hover:text-white hover:border-neon-cyan/40 transition-colors">
                            <HiOutlineDuplicate /> Copy
                          </button>
                        )}
                      </div>
                      {inviteLink && (
                        <div className="bg-dark-800 border border-surface-border rounded-lg px-4 py-3 flex items-center gap-3">
                          <span className="text-xs text-neon-cyan font-mono break-all flex-1">{inviteLink}</span>
                          <button onClick={() => copyToClipboard(inviteLink)} title="Copy">
                            <HiOutlineDuplicate className="text-dark-400 hover:text-white transition-colors" />
                          </button>
                        </div>
                      )}
                      {inviteExpiry && (
                        <p className="text-[10px] text-dark-500">
                          Expires: {new Date(inviteExpiry).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  )}

                  {/* MULTI-JOIN MODE (Grand Final / Paid only) */}
                  {inviteMode === 'multi' && (
                    <div className="space-y-3">
                      <p className="text-xs text-dark-400">
                        Generate one unique link per empty slot — each link can only be used once by one team captain.
                        Share each link privately with the specific team.
                      </p>
                      <button onClick={handleGenerateMultiLinks} disabled={inviteLoading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-dark-900 bg-neon-cyan hover:bg-neon-cyan/80 transition-colors disabled:opacity-50">
                        <HiOutlineCollection /> {inviteLoading ? 'Generating...' : `Generate ${emptyCount} Unique Links`}
                      </button>
                      {multiLinks.length > 0 && (
                        <div className="space-y-2 max-h-72 overflow-y-auto custom-scrollbar pr-1">
                          {multiLinks.map((link, i) => (
                            <div key={i} className="flex items-center gap-3 bg-dark-800 border border-surface-border rounded-lg px-3 py-2.5">
                              <span className="text-[10px] font-bold text-dark-400 w-16 shrink-0">Slot #{link.slotNumber}</span>
                              <span className="text-[10px] text-neon-cyan font-mono truncate flex-1">{link.url}</span>
                              <button onClick={() => copyToClipboard(link.url)}
                                className="shrink-0 text-dark-400 hover:text-white transition-colors" title="Copy">
                                <HiOutlineDuplicate />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {multiLinks.length > 0 && (
                        <button onClick={() => {
                          const all = multiLinks.map(l => `Slot #${l.slotNumber}: ${l.url}`).join('\n');
                          copyToClipboard(all);
                        }} className="text-xs text-dark-400 hover:text-white underline transition-colors">
                          Copy all links as text
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-dark-900 border border-surface-border rounded-2xl overflow-hidden">
                <div className="bg-dark-950 px-5 py-4 border-b border-surface-border flex items-center gap-2">
                  <HiOutlineUserGroup className="text-neon-cyan" />
                  <h2 className="font-bold text-white">Team Slot Assignments</h2>
                  <span className="ml-auto text-xs text-dark-400 bg-dark-800 px-2 py-1 rounded-full">
                    {filledSlots.length} / {group.teamsLimit}
                  </span>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-dark-950 border-b border-surface-border">
                    <tr>
                      <th className="px-5 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-wider">Slot</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-wider">Team</th>
                      <th className="px-5 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {Array.from({ length: 25 }, (_, i) => {
                      const visualSlot = i + 1;
                      const teamsLimit = group.teamsLimit || 25;
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

                      // Find actual slot (assuming DB slotNumber starts at 1)
                      const actualSlotNumber = visualSlot - lockedCount;
                      const actualSlot = slots.find(s => s.slotNumber === actualSlotNumber);

                      if (!actualSlot || !actualSlot.occupyingTeam) {
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

                      return (
                        <tr key={actualSlot._id} className="hover:bg-dark-800/50 transition-colors">
                          <td className="px-5 py-3 text-xs font-bold text-dark-500">#{visualSlot}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={actualSlot.occupyingTeam.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(actualSlot.occupyingTeam.name)}&size=32&background=1a1d24&color=00d9ff&bold=true`}
                                alt={actualSlot.occupyingTeam.name}
                                className="w-8 h-8 rounded-lg object-cover border border-surface-border bg-dark-800 shrink-0"
                              />
                              <div>
                                <span className="font-semibold text-white block">{actualSlot.occupyingTeam.name}</span>
                                {actualSlot.occupyingTeam.members && actualSlot.occupyingTeam.members.length > 0 && (
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                    {actualSlot.occupyingTeam.members.map((m, idx) => (
                                      <span key={idx} className="text-[10px] bg-dark-800 text-dark-400 px-1.5 py-0.5 rounded truncate max-w-[80px]" title={m.ign || m.user?.username}>
                                        {m.ign || m.user?.username || 'Player'}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 px-2 py-0.5 rounded-full"><HiOutlineCheck /> Filled</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ════════════ IMPORTANT MESSAGES ════════════ */}
          {activeTab === 'idp' && (
            <div className="space-y-4 max-w-2xl">

              {/* Header row */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-white text-lg flex items-center gap-2">
                    <HiOutlineLockClosed className="text-primary-400" /> IDP Match Releases — {group.name}
                  </h2>
                  <p className="text-xs text-dark-400 mt-0.5">Add one card per match. Save credentials then release to players.</p>
                </div>
                <button onClick={addMatch}
                  className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
                  + Add Match
                </button>
              </div>

              {/* Match Cards */}
              {matches.map((match, idx) => (
                <div key={idx} className={`bg-dark-900 border rounded-2xl overflow-hidden transition-colors ${
                  match.isReleased ? 'border-green-500/30' : 'border-surface-border'
                }`}>
                  {/* Card header */}
                  <div className="bg-dark-950 px-5 py-3 border-b border-surface-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white">Match {match.matchNumber}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                        match.isReleased
                          ? 'bg-green-500/10 text-green-400 border-green-500/30'
                          : 'bg-dark-800 text-dark-500 border-surface-border'
                      }`}>
                        {match.isReleased ? '🔓 Live' : '🔒 Hidden'}
                      </span>
                    </div>
                    <button onClick={() => removeMatch(match, idx)}
                      className="text-dark-500 hover:text-red-400 transition-colors p-1">
                      <HiOutlineX className="text-base" />
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    {/* Map + Room ID row */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-dark-400 mb-2">Map</label>
                        <select
                          value={match.mapName}
                          onChange={e => updateMatch(idx, 'mapName', e.target.value)}
                          className="w-full bg-dark-950 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-neon-cyan transition-colors"
                        >
                          {MAP_OPTIONS.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-dark-400 mb-2">Room ID</label>
                        <input
                          type="text" placeholder="e.g. 8347291"
                          value={match.roomId}
                          onChange={e => updateMatch(idx, 'roomId', e.target.value)}
                          className="w-full bg-dark-950 border border-surface-border rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-neon-cyan transition-colors font-mono"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-dark-400 mb-2">Room Password</label>
                      <div className="relative">
                        <input
                          type={match.showPwd ? 'text' : 'password'}
                          placeholder="Enter password..."
                          value={match.roomPassword}
                          onChange={e => updateMatch(idx, 'roomPassword', e.target.value)}
                          className="w-full bg-dark-950 border border-surface-border rounded-xl px-4 py-2.5 pr-10 text-white text-sm outline-none focus:border-neon-cyan transition-colors font-mono"
                        />
                        <button onClick={() => updateMatch(idx, 'showPwd', !match.showPwd)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white">
                          {match.showPwd ? <HiOutlineEyeOff /> : <HiOutlineEye />}
                        </button>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => saveMatch(match, idx)}
                        disabled={matchSaving[idx]}
                        className="flex-1 btn-ghost border border-surface-border flex items-center justify-center gap-2 py-2">
                        <HiOutlineSave /> {matchSaving[idx] ? 'Saving...' : 'Save Draft'}
                      </button>
                      <button
                        onClick={() => saveMatch(match, idx, !match.isReleased)}
                        disabled={matchSaving[idx] || !match.roomId.trim()}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl font-bold text-sm transition-all disabled:opacity-50 ${
                          match.isReleased
                            ? 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                            : 'btn-primary'
                        }`}
                      >
                        {match.isReleased
                          ? <><HiOutlineLockClosed /> Revoke</>   
                          : <><HiOutlineUpload /> Release to Teams</>}
                      </button>
                    </div>

                    {/* Preview (only if filled) */}
                    {match.roomId && (
                      <div className="bg-dark-950 border border-surface-border rounded-xl p-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-dark-500 mb-3">Player Preview</p>
                        <div className="space-y-2">
                          {[
                            { label: 'Map',      val: match.mapName },
                            { label: 'Room ID',  val: match.roomId,       mono: true },
                            { label: 'Password', val: match.roomPassword || '—', mono: true },
                          ].map(item => (
                            <div key={item.label} className="flex justify-between items-center">
                              <span className="text-xs text-dark-400">{item.label}</span>
                              <span className={`text-xs font-bold text-white ${item.mono ? 'font-mono' : ''}`}>{item.val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* Add first match prompt if empty */}
              {matches.length === 0 && (
                <div className="bg-dark-900 border border-dashed border-surface-border rounded-2xl p-10 text-center">
                  <p className="text-dark-400 mb-4">No matches added yet</p>
                  <button onClick={addMatch} className="btn-primary px-6 py-2">+ Add First Match</button>
                </div>
              )}
            </div>
          )}

          {/* ════════════ DECLARE RESULTS ════════════ */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              {filledSlots.length === 0 ? (
                <div className="bg-dark-900 border border-surface-border rounded-2xl p-10 text-center text-dark-400">
                  <HiOutlineExclamationCircle className="text-4xl mx-auto mb-3 text-yellow-400" />
                  <p className="font-bold text-white mb-1">No teams in this group yet</p>
                  <p className="text-sm">Go to Slot List tab and ensure teams are seeded first.</p>
                </div>
              ) : (
                <div className="bg-dark-900 border border-surface-border rounded-2xl overflow-hidden">
                  <div className="bg-dark-950 px-5 py-4 border-b border-surface-border flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HiOutlineClipboardList className="text-primary-400" />
                      <h2 className="font-bold text-white">Match Results — {group.name}</h2>
                    </div>
                    {savedResult && (
                      <span className="text-[10px] font-bold bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded-full">
                        ✓ Saved
                      </span>
                    )}
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm min-w-[600px]">
                      <thead className="bg-dark-950 border-b border-surface-border">
                        <tr>
                          <th className="px-5 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-wider">Slot</th>
                          <th className="px-5 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-wider">Team</th>
                          <th className="px-5 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-wider text-center">Placement</th>
                          <th className="px-5 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-wider text-center">Kill Pts</th>
                          <th className="px-5 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-wider text-center">Pos Pts</th>
                          <th className="px-5 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-wider text-center">Total Pts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {filledSlots.map(slot => {
                          const teamId = slot.occupyingTeam._id;
                          const entry  = resultData[teamId] || { placement: '', kills: '' };
                          const posMap = [0,10,6,5,4,3,2,1,1,0,0,0,0,0,0,0,0,0,0,0,0];
                          const posPts = entry.posPts !== undefined ? entry.posPts : (posMap[parseInt(entry.placement) || 0] || 0);
                          const killPts = parseInt(entry.kills) || 0;
                          const total  = entry.totalPts !== undefined ? entry.totalPts : (posPts + killPts);
                          const lockedCount = Math.max(0, 25 - (group.teamsLimit || 25));
                          const visualSlot = slot.slotNumber + lockedCount;

                          return (
                            <tr key={slot._id} className="hover:bg-dark-800/50 transition-colors">
                              <td className="px-5 py-3 text-xs font-bold text-dark-500">#{visualSlot}</td>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={slot.occupyingTeam.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(slot.occupyingTeam.name)}&size=32&background=1a1d24&color=00d9ff&bold=true`}
                                    alt={slot.occupyingTeam.name}
                                    className="w-7 h-7 rounded-lg object-cover border border-surface-border shrink-0"
                                  />
                                  <div>
                                    <span className="font-semibold text-white block">{slot.occupyingTeam.name}</span>
                                    {slot.occupyingTeam.members && slot.occupyingTeam.members.length > 0 && (
                                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                        {slot.occupyingTeam.members.map((m, idx) => (
                                          <span key={idx} className="text-[10px] bg-dark-800 text-dark-400 px-1.5 py-0.5 rounded truncate max-w-[80px]" title={m.ign || m.user?.username}>
                                            {m.ign || m.user?.username || 'Player'}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-center">
                                <input
                                  type="number" min="1" max="20" placeholder="—"
                                  value={entry.placement}
                                  onChange={e => setResultData(prev => ({ ...prev, [teamId]: { ...entry, placement: e.target.value, posPts: undefined, totalPts: undefined } }))}
                                  className="w-20 bg-dark-950 border border-surface-border rounded-lg px-3 py-1.5 text-center text-white text-sm outline-none focus:border-neon-cyan transition-colors mx-auto block"
                                />
                              </td>
                              <td className="px-5 py-3 text-center">
                                <input
                                  type="number" min="0" placeholder="0"
                                  value={entry.kills}
                                  onChange={e => setResultData(prev => ({ ...prev, [teamId]: { ...entry, kills: e.target.value, totalPts: undefined } }))}
                                  className="w-20 bg-dark-950 border border-surface-border rounded-lg px-3 py-1.5 text-center text-white text-sm outline-none focus:border-neon-cyan transition-colors mx-auto block"
                                />
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span className="inline-block font-bold text-white bg-dark-800 border border-surface-border px-3 py-1.5 rounded-lg min-w-[48px] text-center">
                                  {posPts}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-center">
                                <span className="inline-block font-bold text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/20 px-3 py-1.5 rounded-lg min-w-[48px] text-center">
                                  {total}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="px-5 py-4 bg-dark-950 border-t border-surface-border flex justify-end gap-3">
                    <button onClick={handleSubmitResults} disabled={resultSaving}
                      className="btn-primary flex items-center gap-2 px-6 py-2.5">
                      <HiOutlineShieldCheck /> {resultSaving ? 'Submitting...' : 'Submit Results'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════ AUTO EXTRACT RESULTS ════════════ */}
          {activeTab === 'extract' && (
            <div className="max-w-6xl w-full">
              <AutoExtractPanel 
                scrim={{ _id: groupId, matches: matches.map(m => ({ ...m, map: m.mapName })) }}
                registrations={slots.filter(s => s.status === 'filled').map(s => ({ team: s.occupyingTeam, slotNumber: s.slotNumber }))}
                selectedMatchIdx={extractMatch - 1}
                setSelectedMatchIdx={(idx) => setExtractMatch(idx + 1)}
                onImport={(mappedData, teams) => {
                  const newResultData = { ...resultData };
                  let importedCount = 0;
                  if (teams && Array.isArray(teams)) {
                    teams.forEach(t => {
                       if (t.matchedTeamId) {
                           const tId = t.matchedTeamId.toString();
                           newResultData[tId] = {
                               placement: t.teamConfidence === 'none' ? '' : (t.placement || ''),
                               kills: t.teamKills || t.kills || 0
                           };
                           if (mappedData && mappedData.scores && mappedData.scores[tId]) {
                               newResultData[tId].posPts = mappedData.scores[tId].positionPoints || 0;
                               newResultData[tId].totalPts = (mappedData.scores[tId].killPoints || 0) + (mappedData.scores[tId].positionPoints || 0);
                           }
                           importedCount++;
                       }
                    });
                  }
                  if (importedCount > 0) {
                     setResultData(newResultData);
                     setActiveTab('results');
                  } else {
                     toast.error("0 teams mapped. Ensure the group has the matched slots correctly associated!");
                  }
                }}
              />
            </div>
          )}

          {/* ════════════ GROUP CHAT ════════════ */}
          {activeTab === 'chat' && (
            <div className="flex flex-col bg-dark-900 border border-surface-border rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
              {/* Chat header */}
              <div className="bg-dark-950 px-5 py-3 border-b border-surface-border flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <HiOutlineChat className="text-neon-cyan text-lg" />
                  <span className="font-bold text-white">Group Chat — {group.name}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse inline-block" />
                  Live
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                {chatMessages.map((msg, i) => {
                  if (msg.type === 'system') return (
                    <div key={msg._id || i} className="flex justify-center py-1">
                      <span className="text-[11px] text-dark-500 bg-dark-800 px-3 py-1 rounded-full border border-dark-700">{msg.content}</span>
                    </div>
                  );
                  if (msg.type === 'announcement') return (
                    <div key={msg._id || i} className="bg-gradient-to-r from-neon-cyan/10 to-primary-500/10 border border-neon-cyan/30 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <HiOutlineSpeakerphone className="text-neon-cyan text-sm" />
                        <span className="text-[10px] font-bold uppercase text-neon-cyan tracking-widest">Organizer Announcement</span>
                        <span className="text-[10px] text-dark-500 ml-auto">{formatTime(msg.createdAt)}</span>
                      </div>
                      <p className="text-sm text-white font-medium">{msg.content}</p>
                    </div>
                  );
                  const isMine = msg.sender?._id?.toString() === user?._id?.toString();
                  const isOrg  = msg.sender?.role === 'organizer' || msg.sender?.role === 'admin';
                  return (
                    <div key={msg._id || i} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isOrg ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'bg-dark-700 text-dark-300'}`}>
                        {msg.sender?.username?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className={`max-w-[72%] flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                        {!isMine && <span className={`text-[10px] mb-0.5 font-semibold ${isOrg ? 'text-neon-cyan' : 'text-dark-400'}`}>{msg.sender?.username}{isOrg && <span className="ml-1 text-[9px] bg-neon-cyan/10 text-neon-cyan px-1 rounded">ORG</span>}</span>}
                        <div className={`px-3 py-2 rounded-2xl text-sm ${isMine ? 'bg-primary-600 text-white rounded-tr-sm' : isOrg ? 'bg-dark-800 border border-neon-cyan/20 text-white rounded-tl-sm' : 'bg-dark-800 text-dark-100 rounded-tl-sm'}`}>
                          {msg.content}
                        </div>
                        <span className="text-[9px] text-dark-600 mt-0.5 px-1">{formatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Input */}
              <div className="shrink-0 border-t border-surface-border p-4">
                {isOrganizer && (
                  <button type="button" onClick={() => setIsAnnouncement(v => !v)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold mb-3 border transition-all ${isAnnouncement ? 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/40' : 'bg-dark-800 text-dark-400 border-dark-700 hover:border-dark-500'}`}>
                    <HiOutlineSpeakerphone /> {isAnnouncement ? 'Sending as Announcement' : 'Send as Announcement'}
                  </button>
                )}
                <form onSubmit={sendChatMessage} className="flex gap-3">
                  <input ref={chatInputRef} type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                    placeholder={isOrganizer && isAnnouncement ? 'Type announcement to all participants...' : 'Type a message...'}
                    className={`flex-1 bg-dark-950 border rounded-xl px-4 py-2.5 text-sm text-white outline-none transition-colors ${isOrganizer && isAnnouncement ? 'border-neon-cyan/40 bg-neon-cyan/5' : 'border-surface-border focus:border-neon-cyan/40'}`}
                    maxLength={500}
                  />
                  <button type="submit" disabled={!chatInput.trim()}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-40 ${isOrganizer && isAnnouncement ? 'bg-neon-cyan text-dark-950 hover:bg-neon-cyan/90' : 'btn-primary'}`}>
                    <HiPaperAirplane className="rotate-90" />
                    {isOrganizer && isAnnouncement ? 'Announce' : 'Send'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ════════════ PROMOTE TEAMS ════════════ */}
          {activeTab === 'promote' && (
             <div className="space-y-6">
               {!savedResult ? (
                 <div className="bg-dark-900 border border-surface-border rounded-2xl p-10 text-center text-dark-400">
                    <HiOutlineClipboardList className="mx-auto text-5xl mb-4 opacity-50" />
                    <p className="font-semibold text-white mb-1">Results Cannot Be Qualified Yet</p>
                    <p className="text-sm">Please declare and submit the match results first so teams can be natively sorted by their total points.</p>
                 </div>
               ) : (
                 <div className="bg-dark-900 border border-surface-border rounded-2xl overflow-hidden">
                    {/* Header with Qualify Top N */}
                    <div className="bg-dark-950 px-5 py-4 border-b border-surface-border">
                       <div className="flex items-center justify-between flex-wrap gap-3">
                          <h2 className="font-bold text-white flex items-center gap-2">
                             <HiOutlineShieldCheck className="text-neon-cyan" /> Final Qualification List
                          </h2>
                          <div className="flex items-center gap-2 flex-wrap">
                             <span className="text-xs text-dark-400 mr-1">Qualify Top N:</span>
                             <input
                               type="number"
                               min="1"
                               max={savedResult?.standings?.length || 99}
                               placeholder="e.g. 3"
                               value={topN}
                               onChange={e => setTopN(e.target.value)}
                               className="w-20 bg-dark-800 border border-surface-border rounded-lg px-2 py-1.5 text-sm text-white outline-none focus:border-neon-cyan/60 text-center"
                             />
                             <button
                               onClick={handlePromoteTopN}
                               disabled={promotingTopN || !topN}
                               className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold bg-neon-cyan text-dark-950 hover:bg-neon-cyan/80 disabled:opacity-40 transition-all shadow-lg shadow-neon-cyan/20"
                             >
                               {promotingTopN ? (
                                 <span className="w-3 h-3 border-2 border-dark-900 border-t-transparent rounded-full animate-spin" />
                               ) : (
                                 <HiOutlineShieldCheck className="text-sm" />
                               )}
                               {promotingTopN ? 'Qualifying...' : 'Qualify Top'}
                             </button>
                          </div>
                       </div>
                    </div>
                    <table className="w-full text-left text-sm">
                       <thead className="bg-dark-950/50 border-b border-surface-border">
                          <tr>
                             <th className="px-5 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-wider">Rank</th>
                             <th className="px-5 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-wider">Team</th>
                             <th className="px-5 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-wider text-center">Total Pts</th>
                             <th className="px-5 py-3 text-[10px] font-bold text-dark-400 uppercase tracking-wider text-right">Action</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-surface-border">
                          {[...(savedResult.standings || [])].sort((a,b) => (b.totalPoints || 0) - (a.totalPoints || 0)).map((s, idx) => {
                             const tm = s.teamId;
                             // We use the actual objects sent by backend .populate('standings.teamId')
                             const isPromoted = Boolean(s.isQualifiedForNextStage);
                             const tmName = tm?.name || 'Unknown Team';
                             const tmId = tm?._id?.toString() || tm?.toString();
                             
                             return (
                                <tr key={tmId} className={`transition-colors ${
                                  isPromoted
                                    ? 'bg-neon-cyan/5 border-l-2 border-l-neon-cyan opacity-70'
                                    : 'hover:bg-dark-800/50'
                                }`}>
                                   <td className="px-5 py-3 font-bold text-dark-500">#{idx + 1}</td>
                                   <td className="px-5 py-3">
                                      <div className="flex items-center gap-3">
                                         <img src={tm?.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(tmName)}&size=32&background=1a1d24&color=00d9ff&bold=true`} className="w-8 h-8 rounded-lg object-cover border border-surface-border bg-dark-800 shrink-0" />
                                         <div>
                                            <span className="font-bold text-white block">{tmName}</span>
                                            {isPromoted && <span className="text-[10px] uppercase tracking-widest text-neon-cyan font-bold block mt-0.5 mb-0.5">✓ Qualified</span>}
                                            {tm?.members && tm.members.length > 0 && (
                                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                                                {tm.members.map((m, idx) => (
                                                  <span key={idx} className="text-[10px] bg-dark-800 text-dark-400 px-1.5 py-0.5 rounded truncate max-w-[80px]" title={m.ign || m.user?.username}>
                                                    {m.ign || m.user?.username || 'Player'}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                         </div>
                                      </div>
                                   </td>
                                   <td className="px-5 py-3 text-center font-bold text-white">
                                      <span className="text-neon-cyan bg-neon-cyan/10 px-2.5 py-1 rounded-md">{s.totalPoints || 0}</span>
                                   </td>
                                   <td className="px-5 py-3 text-right">
                                      {isPromoted ? (
                                         <button onClick={() => handleToggleQualify(tmId, isPromoted)} disabled={togglingTeams.has(tmId)} className="btn-ghost inline-flex items-center justify-end gap-2 text-xs py-1.5 px-3 text-orange-400 hover:text-orange-300 disabled:opacity-50">
                                            {togglingTeams.has(tmId) ? <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <HiOutlineX className="text-sm" />} Revoke
                                         </button>
                                      ) : (
                                         <button onClick={() => handleToggleQualify(tmId, isPromoted)} disabled={togglingTeams.has(tmId)} className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold text-dark-900 bg-neon-cyan hover:bg-neon-cyan/80 transition-colors shadow-lg shadow-neon-cyan/20 disabled:opacity-50">
                                            {togglingTeams.has(tmId) ? 'Processing...' : 'Qualify'} <HiOutlineCheck />
                                         </button>
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

          {/* ════════════ IMPORT TEAMS ════════════ */}
          {activeTab === 'import' && (
            <div className="space-y-6">
               <div className="bg-dark-900 border border-surface-border rounded-2xl overflow-hidden">
                  <div className="bg-dark-950 px-5 py-4 border-b border-surface-border flex items-center justify-between">
                     <div>
                        <h2 className="font-bold text-white flex items-center gap-2">
                           <HiOutlineCollection className="text-neon-cyan" /> Import Qualified Teams
                        </h2>
                        <p className="text-[11px] text-dark-400 mt-1">Select teams from other groups that have been marked as Qualified.</p>
                     </div>
                     <button
                        onClick={handleImportTeams}
                        disabled={selectedImports.size === 0 || importing}
                        className="px-4 py-2 bg-neon-cyan text-dark-950 font-bold rounded-lg text-xs hover:bg-neon-cyan/80 disabled:opacity-50 transition-colors"
                     >
                        {importing ? 'Importing...' : `Import ${selectedImports.size} Teams`}
                     </button>
                  </div>
                  
                  {importableTeams.length === 0 ? (
                     <div className="p-10 text-center">
                        <HiOutlineExclamationCircle className="mx-auto text-4xl text-dark-600 mb-3" />
                        <p className="text-white font-bold">No Qualified Teams Found</p>
                        <p className="text-sm text-dark-400 mt-1">Teams must be marked as 'Qualified' in their respective groups before they appear here.</p>
                     </div>
                  ) : (
                     <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {importableTeams.map(tm => {
                           const isSelected = selectedImports.has(tm._id?.toString());
                           return (
                              <div
                                 key={tm._id}
                                 onClick={() => toggleImportSelection(tm._id?.toString())}
                                 className={`cursor-pointer border rounded-xl p-3 flex items-center gap-3 transition-colors ${
                                    isSelected 
                                       ? 'bg-neon-cyan/10 border-neon-cyan' 
                                       : 'bg-dark-950 border-surface-border hover:border-dark-600'
                                 }`}
                              >
                                 <img src={tm.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(tm.name)}&background=1a1d24&color=00d9ff&bold=true`} className="w-10 h-10 rounded-lg object-cover" />
                                 <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-white truncate">{tm.name}</p>
                                    <p className="text-[10px] text-dark-400 truncate">Tap to select</p>
                                 </div>
                                 <div className={`w-5 h-5 rounded flex items-center justify-center border ${isSelected ? 'bg-neon-cyan border-neon-cyan text-dark-900' : 'border-surface-border text-transparent'}`}>
                                    <HiOutlineCheck className="text-xs font-bold" />
                                 </div>
                              </div>
                           );
                        })}
                     </div>
                  )}
               </div>
            </div>
          )}

          {/* ════════════ ANNOUNCEMENTS ════════════ */}
          {activeTab === 'announce' && (
            <div className="space-y-6">

              {/* ── Email Notification ─────────────────────────────────────── */}
              <div className="bg-dark-900 border border-surface-border rounded-2xl overflow-hidden">
                <div className="bg-dark-950 px-5 py-4 border-b border-surface-border flex items-center gap-3">
                  <HiOutlineSpeakerphone className="text-neon-cyan text-lg" />
                  <div>
                    <h2 className="font-bold text-white">Email Notification</h2>
                    <p className="text-[11px] text-dark-400 mt-0.5">Sends to all registered player emails in this group via BCC</p>
                  </div>
                  {emailResult && (
                    <span className={`ml-auto text-xs font-bold px-3 py-1 rounded-full ${
                      emailResult.success
                        ? 'text-green-400 bg-green-400/10 border border-green-400/20'
                        : 'text-red-400 bg-red-400/10 border border-red-400/20'
                    }`}>
                      {emailResult.message}
                    </span>
                  )}
                </div>
                <div className="p-5 space-y-4">

                  {/* Subject */}
                  <div>
                    <label className="block text-xs font-bold text-dark-400 mb-1.5 uppercase tracking-wider">Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={e => setEmailSubject(e.target.value)}
                      placeholder="e.g. Grand Finals — Room ID Released"
                      className="w-full bg-dark-800 border border-surface-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors"
                    />
                  </div>

                  {/* Body */}
                  <div>
                    <label className="block text-xs font-bold text-dark-400 mb-1.5 uppercase tracking-wider">Message</label>
                    <textarea
                      rows={5}
                      value={emailBody}
                      onChange={e => setEmailBody(e.target.value)}
                      placeholder={`Hi Teams,\n\nYour match details for ${group?.name} are ready...\n\nRoom ID: ___\nPassword: ___\nMap: ___\n\nGood luck!`}
                      className="w-full bg-dark-800 border border-surface-border rounded-lg px-4 py-3 text-sm text-white placeholder-dark-500 focus:outline-none focus:border-neon-cyan/50 transition-colors resize-none"
                    />
                  </div>

                  {/* Attachments */}
                  <div>
                    <label className="block text-xs font-bold text-dark-400 mb-1.5 uppercase tracking-wider">Attachments <span className="text-dark-600 normal-case font-normal">(optional • max 5 files • 10MB each • images, PDF, DOCX, XLSX)</span></label>

                    {/* Drop zone */}
                    <div
                      onClick={() => emailFileInputRef.current?.click()}
                      onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-neon-cyan/60'); }}
                      onDragLeave={e => e.currentTarget.classList.remove('border-neon-cyan/60')}
                      onDrop={e => {
                        e.preventDefault();
                        e.currentTarget.classList.remove('border-neon-cyan/60');
                        const dropped = Array.from(e.dataTransfer.files);
                        const combined = [...emailAttachments];
                        for (const f of dropped) {
                          if (combined.length >= 5) break;
                          combined.push({ file: f, id: Date.now() + Math.random(), preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null });
                        }
                        setEmailAttachments(combined);
                      }}
                      className="border-2 border-dashed border-surface-border rounded-xl px-4 py-6 text-center cursor-pointer hover:border-neon-cyan/40 transition-colors group"
                    >
                      <HiOutlineUpload className="mx-auto text-2xl text-dark-500 group-hover:text-neon-cyan/60 transition-colors mb-2" />
                      <p className="text-xs text-dark-400">Drag & drop files here, or <span className="text-neon-cyan">click to browse</span></p>
                      <input
                        ref={emailFileInputRef}
                        type="file"
                        multiple
                        accept="image/*,.pdf,.docx,.xlsx,.txt"
                        className="hidden"
                        onChange={e => {
                          const chosen = Array.from(e.target.files);
                          const combined = [...emailAttachments];
                          for (const f of chosen) {
                            if (combined.length >= 5) break;
                            combined.push({ file: f, id: Date.now() + Math.random(), preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null });
                          }
                          setEmailAttachments(combined);
                          e.target.value = '';
                        }}
                      />
                    </div>

                    {/* Attached file chips */}
                    {emailAttachments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {emailAttachments.map((att, i) => (
                          <div key={att.id} className="flex items-center gap-2 bg-dark-800 border border-surface-border rounded-lg px-3 py-2 max-w-[220px]">
                            {att.preview
                              ? <img src={att.preview} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                              : <div className="w-8 h-8 rounded bg-dark-700 flex items-center justify-center shrink-0">
                                  <span className="text-[9px] font-bold text-dark-300 uppercase">
                                    {att.file.name.split('.').pop()}
                                  </span>
                                </div>
                            }
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] text-white truncate">{att.file.name}</p>
                              <p className="text-[9px] text-dark-500">{(att.file.size / 1024).toFixed(0)} KB</p>
                            </div>
                            <button
                              onClick={() => setEmailAttachments(prev => prev.filter((_, idx) => idx !== i))}
                              className="shrink-0 text-dark-500 hover:text-red-400 transition-colors"
                            >
                              <HiOutlineX className="text-sm" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer row */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[11px] text-dark-500">
                      📧 {slots.filter(s => s.status === 'filled').length} teams · via BCC
                      {emailAttachments.length > 0 && ` · ${emailAttachments.length} attachment${emailAttachments.length > 1 ? 's' : ''}`}
                    </p>
                    <button
                      onClick={async () => {
                        if (!emailSubject.trim() || !emailBody.trim()) { toast.error('Subject and message are required'); return; }
                        setEmailSending(true);
                        setEmailResult(null);
                        try {
                          const formData = new FormData();
                          formData.append('subject', emailSubject);
                          formData.append('body', emailBody);
                          emailAttachments.forEach(att => formData.append('attachments', att.file));

                          const res = await api.post(
                            `/tournaments/${tournamentId}/groups/${groupId}/notify-email`,
                            formData,
                            { headers: { 'Content-Type': 'multipart/form-data' } }
                          );
                          setEmailResult({ success: res.success, message: res.message });
                          if (res.success) {
                            toast.success(res.message);
                            setEmailSubject(''); setEmailBody(''); setEmailAttachments([]);
                          } else toast.error(res.message || 'Send failed');
                        } catch (err) {
                          const msg = err.message || 'Failed to send';
                          setEmailResult({ success: false, message: msg });
                          toast.error(msg);
                        } finally { setEmailSending(false); }
                      }}
                      disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-xs font-bold text-dark-900 bg-neon-cyan hover:bg-neon-cyan/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-neon-cyan/20"
                    >
                      <HiPaperAirplane className="rotate-90" />
                      {emailSending ? 'Sending...' : 'Send Email Notification'}
                    </button>
                  </div>

                </div>
              </div>

              {/* ── Quick Share ──────────────────────────────────────────────── */}
              <div className="bg-dark-900 border border-surface-border rounded-2xl overflow-hidden">
                <div className="bg-dark-950 px-5 py-4 border-b border-surface-border flex items-center gap-2">
                  <HiOutlineLink className="text-neon-cyan text-lg" />
                  <div>
                    <h2 className="font-bold text-white">Quick Share</h2>
                    <p className="text-[11px] text-dark-400 mt-0.5">Instantly share room/match info to messaging platforms</p>
                  </div>
                </div>
                <div className="p-5 space-y-4">
                  {/* Preview of what will be shared */}
                  <div className="bg-dark-800 border border-surface-border rounded-lg p-4 font-mono text-xs text-dark-300 whitespace-pre-wrap">
                    {`📢 ${group?.name} — Match Update\n\n` +
                      (matches[0]?.isReleased
                        ? `🔑 Room ID: ${matches[0]?.roomId}\n🔒 Password: ${matches[0]?.roomPassword}\n🗺️ Map: ${matches[0]?.mapName}`
                        : `📌 Room details not yet released. Stay tuned!`)}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* WhatsApp */}
                    <button
                      onClick={() => {
                        const text = `🎮 *${group?.name} — Match Update*\n\n` +
                          (matches[0]?.isReleased
                            ? `🔑 Room ID: *${matches[0]?.roomId}*\n🔒 Password: *${matches[0]?.roomPassword}*\n🗺️ Map: ${matches[0]?.mapName}`
                            : `📌 Room details not yet released. Stay tuned!`);
                        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-[#25D366]/15 text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/25 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.099.538 4.073 1.477 5.794L0 24l6.393-1.477A11.971 11.971 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.82 0-3.528-.49-5-.341l-3.506.81.826-3.417A9.818 9.818 0 012.182 12C2.182 6.584 6.584 2.182 12 2.182S21.818 6.584 21.818 12 17.416 21.818 12 21.818z"/></svg>
                      WhatsApp
                    </button>

                    {/* Telegram */}
                    <button
                      onClick={() => {
                        const text = `🎮 ${group?.name} — Match Update\n\n` +
                          (matches[0]?.isReleased
                            ? `🔑 Room ID: ${matches[0]?.roomId}\n🔒 Password: ${matches[0]?.roomPassword}\n🗺️ Map: ${matches[0]?.mapName}`
                            : `📌 Room details not yet released. Stay tuned!`);
                        window.open(`https://t.me/share/url?url=https://scrimx.app&text=${encodeURIComponent(text)}`, '_blank');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-[#2AABEE]/15 text-[#2AABEE] border border-[#2AABEE]/30 hover:bg-[#2AABEE]/25 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 12 12 12 0 0011.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                      Telegram
                    </button>

                    {/* Copy text */}
                    <button
                      onClick={() => {
                        const text = `📢 ${group?.name} — Match Update\n\n` +
                          (matches[0]?.isReleased
                            ? `Room ID: ${matches[0]?.roomId}\nPassword: ${matches[0]?.roomPassword}\nMap: ${matches[0]?.mapName}`
                            : `Room details not yet released. Stay tuned!`);
                        navigator.clipboard.writeText(text);
                        toast.success('Copied to clipboard!');
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-dark-700 text-dark-300 border border-surface-border hover:text-white hover:border-neon-cyan/30 transition-colors"
                    >
                      <HiOutlineDuplicate /> Copy Text
                    </button>
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default GroupManagePage;
