import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HiOutlineCheckCircle, HiOutlineClock, HiOutlineShieldCheck,
  HiOutlineExclamationCircle, HiOutlineBan, HiOutlineSpeakerphone,
  HiOutlineUsers, HiOutlineArrowLeft, HiOutlineChat, HiPaperAirplane
} from 'react-icons/hi';
import api from '../../lib/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import toast from 'react-hot-toast';

import RoundProgressTracker from './portal/RoundProgressTracker';
import GroupSystemView from './portal/GroupSystemView';
import GroupDashboard from './portal/GroupDashboard';

const STATUS_CONFIG = {
  pending:              { label: 'Under Review',           color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/30',  glow: 'shadow-[0_0_15px_rgba(234,179,8,0.2)]',    icon: HiOutlineClock },
  payment_verification: { label: 'Payment Pending',        color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30',  glow: 'shadow-[0_0_15px_rgba(249,115,22,0.2)]',   icon: HiOutlineClock },
  approved:             { label: 'Approved & Checked In',  color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30',    glow: 'shadow-[0_0_15px_rgba(74,222,128,0.2)]',   icon: HiOutlineCheckCircle },
  'checked-in':         { label: 'Approved & Checked In',  color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/30',    glow: 'shadow-[0_0_15px_rgba(74,222,128,0.2)]',   icon: HiOutlineCheckCircle },
  waitlist:             { label: 'Waitlisted',             color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30',  glow: 'shadow-[0_0_15px_rgba(168,85,247,0.2)]',   icon: HiOutlineClock },
  rejected:             { label: 'Not Selected',           color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/30',        glow: 'shadow-[0_0_15px_rgba(239,68,68,0.2)]',    icon: HiOutlineBan },
};

const TournamentPlayerPortal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [data, setData] = useState(null);
  const [tournament, setTournament] = useState(null);
  const [roadmapData, setRoadmapData] = useState({ stages: [], groups: [], slots: [], results: [] });
  const [activeStageId, setActiveStageId] = useState(null);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [groupMatchRooms, setGroupMatchRooms] = useState([]);

  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const chatBottomRef = useRef(null);

  // Community (tournament-wide) chat
  const [communityMessages, setCommunityMessages] = useState([]);
  const [communityInput, setCommunityInput] = useState('');
  const communityBottomRef = useRef(null);

  // Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, tournamentRes, roadmapRes] = await Promise.all([
          api.get(`/tournaments/${id}/my-status`),
          api.get(`/tournaments/public/${id}`),
          api.get(`/tournaments/${id}/public-roadmap`).catch(() => ({ success: false, data: null }))
        ]);
        if (statusRes.success) setData(statusRes.data);
        if (tournamentRes.success) setTournament(tournamentRes.data);
        if (roadmapRes?.success) {
          setRoadmapData(roadmapRes.data);
          const playerGroupId = statusRes.data?.registration?.groupId;
          if (playerGroupId) {
            setActiveGroupId(playerGroupId);
            const group = roadmapRes.data.groups.find(g => g._id === playerGroupId);
            if (group) setActiveStageId(group.stageId);
          } else if (roadmapRes.data.stages.length > 0) {
            setActiveStageId(roadmapRes.data.stages[0]._id);
          }
        }
      } catch {
        toast.error('Failed loading tournament status.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // Real-time roadmap updates
  useEffect(() => {
    if (!socket) return;
    socket.on('tournament_roadmap_updated', async () => {
      const res = await api.get(`/tournaments/${id}/public-roadmap`).catch(() => null);
      if (res?.success) setRoadmapData(res.data);
    });
    return () => socket.off('tournament_roadmap_updated');
  }, [socket, id]);

  // Chat: join/leave based on activeGroupId — load history
  useEffect(() => {
    if (!socket || !activeGroupId) return;
    socket.emit('join_group_chat', activeGroupId);

    // Load saved group chat history
    const loadGroupChat = async () => {
      try {
        const res = await api.get(`/tournaments/${id}/groups/${activeGroupId}/chat-history`);
        if (res.success && res.data?.length > 0) {
          setChatMessages(res.data);
        } else {
          setChatMessages([{
            _id: `sys-${activeGroupId}`,
            type: 'system',
            content: `Connected to group channel.`,
            createdAt: new Date().toISOString(),
          }]);
        }
      } catch {
        setChatMessages([{
          _id: `sys-${activeGroupId}`,
          type: 'system',
          content: `Connected to group channel.`,
          createdAt: new Date().toISOString(),
        }]);
      }
    };
    loadGroupChat();

    socket.on('group_message', msg => setChatMessages(prev => [...prev, msg]));
    return () => {
      socket.emit('leave_group_chat', activeGroupId);
      socket.off('group_message');
    };
  }, [socket, activeGroupId]);

  // Fetch group-specific match rooms whenever activeGroupId changes
  useEffect(() => {
    if (!activeGroupId || !id) { setGroupMatchRooms([]); return; }
    const fetchRooms = async () => {
      try {
        const res = await api.get(`/tournaments/${id}/groups/${activeGroupId}/match-rooms`);
        if (res.success) setGroupMatchRooms(res.data || []);
        else setGroupMatchRooms([]);
      } catch { setGroupMatchRooms([]); }
    };
    fetchRooms();
  }, [activeGroupId, id]);

  // Community announcements: join tournament room — load history
  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('join_tournament_chat', id);

    const loadCommunityHistory = async () => {
      try {
        const res = await api.get(`/tournaments/${id}/chat-history`);
        if (res.success && res.data?.length > 0) {
          setCommunityMessages(res.data);
        } else {
          setCommunityMessages([]);
        }
      } catch {
        setCommunityMessages([]);
      }
    };
    loadCommunityHistory();

    socket.on('tournament_message', msg => setCommunityMessages(prev => [...prev, msg]));
    return () => {
      socket.emit('leave_tournament_chat', id);
      socket.off('tournament_message');
    };
  }, [socket, id]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);
  useEffect(() => { communityBottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [communityMessages]);

  const sendCommunityMessage = (e) => {
    e.preventDefault();
    const content = communityInput.trim();
    if (!content || !socket || !id) return;
    socket.emit('tournament_message', { tournamentId: id, content, type: 'message' });
    setCommunityInput('');
  };

  const sendChatMessage = (e) => {
    e.preventDefault();
    const content = chatInput.trim();
    if (!content || !socket || !activeGroupId) return;
    socket.emit('group_message', { groupId: activeGroupId, content, type: 'message' });
    setChatInput('');
  };

  const formatTime = (iso) => {
    try { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); }
    catch { return ''; }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`, { icon: '📋' });
  };

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const reg = data?.registration;
  const matchRooms = data?.matchRooms || [];
  const statusCfg = reg ? (STATUS_CONFIG[reg.status] || STATUS_CONFIG.pending) : null;

  return (
    <div className="max-w-7xl mx-auto animate-fade-in pb-12">

      {/* Back Button */}
      <div className="px-4 md:px-8 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-dark-400 hover:text-white text-sm font-bold transition-colors mb-2"
        >
          <HiOutlineArrowLeft /> Back
        </button>
      </div>

      {/* Hero Banner */}
      {tournament && (
        <div className="relative h-64 md:h-80 w-full rounded-b-3xl overflow-hidden mb-8 border-b border-surface-border shadow-2xl">
          <div className="absolute inset-0 bg-dark-950">
            {tournament.banner && <img src={tournament.banner} alt="banner" className="w-full h-full object-cover opacity-30" />}
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-900/60 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="bg-primary-600/20 text-neon-cyan border border-primary-500/30 px-3 py-1 rounded-full text-xs font-bold tracking-widest backdrop-blur-sm">{tournament.game}</span>
                <span className="bg-dark-800/80 text-dark-200 border border-dark-600 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">{tournament.format?.toUpperCase()}</span>
                <span className="bg-dark-800/80 text-dark-200 border border-dark-600 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">{tournament.region}</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-display font-black text-white tracking-tight drop-shadow-lg">{tournament.title}</h1>
            </div>
            <div className="hidden md:flex items-center gap-2 text-dark-300 text-sm font-medium bg-dark-900/50 px-4 py-2 rounded-xl backdrop-blur-md border border-white/5">
              <HiOutlineShieldCheck className="text-neon-cyan text-xl" />
              Official Player Portal
            </div>
          </div>
        </div>
      )}

      <div className="px-4 md:px-8">

        {/* Not Registered */}
        {!reg ? (
          <div className="max-w-2xl mx-auto bg-dark-900/50 backdrop-blur-xl border border-surface-border rounded-3xl p-12 text-center shadow-xl">
            <div className="w-20 h-20 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-dark-700">
              <HiOutlineExclamationCircle className="text-5xl text-dark-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-dark-300 font-medium mb-8">You must be registered to access this terminal.</p>
            <button onClick={() => navigate(`/tournaments/${id}`)} className="btn-primary px-8 py-3 rounded-xl font-bold">View Tournament Overview</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* Left: Status */}
            <div className="lg:col-span-1 space-y-6">
              <div className={`relative overflow-hidden rounded-3xl border bg-dark-900/80 backdrop-blur-xl p-6 ${statusCfg.bg} ${statusCfg.glow}`}>
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <statusCfg.icon className="text-9xl" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-6">
                    <div className={`w-2 h-2 rounded-full animate-pulse ${statusCfg.color.replace('text-', 'bg-')}`}></div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-dark-400">Mission Status</p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className={`text-4xl ${statusCfg.color} p-3 rounded-2xl bg-dark-950/50 border border-white/5`}>
                      <statusCfg.icon />
                    </div>
                    <div>
                      <h3 className={`text-2xl font-black tracking-tight ${statusCfg.color}`}>{statusCfg.label}</h3>
                      <p className="text-sm text-dark-300 mt-1 flex items-center gap-2">
                        <HiOutlineUsers className="text-dark-500" />
                        Squad: <span className="text-white font-bold">{reg.teamId?.name}</span>
                      </p>
                    </div>
                  </div>
                  {reg.status === 'waitlist' && reg.waitlistRank > 0 && (
                    <div className="mt-6 bg-dark-950/80 rounded-xl p-4 border border-purple-500/20">
                      <p className="text-sm text-purple-300 flex items-center gap-2">
                        <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded font-bold">#{reg.waitlistRank}</span>
                        In Priority Queue
                      </p>
                      <div className="w-full bg-dark-800 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full animate-pulse" style={{ width: '45%' }}></div>
                      </div>
                    </div>
                  )}
                  {reg.organizerNotes && (
                    <div className="mt-6 bg-dark-950/80 rounded-xl p-4 border border-surface-border">
                      <p className="text-xs font-bold text-dark-400 uppercase tracking-wider mb-1">Organizer Dispatch</p>
                      <p className="text-sm text-dark-200">{reg.organizerNotes}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Timeline */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-dark-900/80 backdrop-blur-xl border border-surface-border rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-neon-cyan/5 via-dark-900 to-dark-900 z-0 pointer-events-none"></div>
                <div className="relative z-10">
                  <h2 className="text-2xl font-bold text-white mb-2">Tournament Communications & Ops</h2>
                  <p className="text-dark-300 mb-8 max-w-lg">
                    {reg.groupId
                      ? 'Your group assignment is complete. Access your group dashboard below.'
                      : 'Your group chat and match credentials will appear below once you are assigned to a group.'}
                  </p>
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-dark-700 before:via-dark-700 before:to-transparent">
                    {/* Step 1 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-dark-900 bg-primary-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)] z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                        <HiOutlineCheckCircle className="text-xl" />
                      </div>
                      <div className="w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl bg-dark-950/50 border border-primary-500/30">
                        <h3 className="font-bold text-white text-sm">Registration Submitted</h3>
                        <p className="text-xs text-dark-400 mt-1">Your team roster has been successfully locked in.</p>
                      </div>
                    </div>
                    {/* Step 2 */}
                    <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group`}>
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-dark-900 z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${reg.status === 'approved' ? 'bg-primary-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-dark-800 text-dark-500'}`}>
                        <HiOutlineClock className="text-xl" />
                      </div>
                      <div className={`w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border ${reg.status === 'approved' ? 'bg-dark-950/50 border-primary-500/30' : 'bg-dark-950/20 border-surface-border'}`}>
                        <h3 className={`font-bold text-sm ${reg.status === 'approved' ? 'text-white' : 'text-dark-400'}`}>Approval & Check-in</h3>
                        <p className="text-xs text-dark-500 mt-1">Awaiting organizer approval.</p>
                      </div>
                    </div>
                    {/* Step 3 */}
                    <div className={`relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group`}>
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-dark-900 z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 ${reg.groupId ? 'bg-primary-500 text-white shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-dark-800 text-dark-500'}`}>
                        <HiOutlineUsers className="text-xl" />
                      </div>
                      <div className={`w-[calc(100%-3rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border ${reg.groupId ? 'bg-dark-950/50 border-primary-500/30' : 'bg-dark-950/20 border-surface-border'}`}>
                        <h3 className={`font-bold text-sm ${reg.groupId ? 'text-white' : 'text-dark-400'}`}>Group Assignment</h3>
                        <p className="text-xs text-dark-500 mt-1">{reg.groupId ? 'You have been assigned to a group stage.' : 'You will be placed into a group to receive match credentials.'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Announcement note */}
              <div className="bg-dark-900/80 backdrop-blur-xl border border-surface-border rounded-3xl p-6 shadow-xl flex items-start gap-4">
                <div className="p-3 bg-neon-cyan/10 rounded-xl shrink-0">
                  <HiOutlineSpeakerphone className="text-neon-cyan text-2xl" />
                </div>
                <div>
                  <h3 className="font-bold text-white mb-1">Stay Tuned for Announcements</h3>
                  <p className="text-sm text-dark-300">Global tournament broadcasts appear in your group chat feed below.</p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Community Announcements */}
        {reg && (
          <div className="mt-8">
            <div className="flex flex-col bg-dark-900/80 backdrop-blur-xl border border-neon-cyan/20 rounded-3xl overflow-hidden">
              <div className="bg-gradient-to-r from-dark-800 to-dark-900 px-6 py-4 border-b border-surface-border flex items-center gap-3 shrink-0">
                <div className="p-2 bg-neon-cyan/10 rounded-lg">
                  <HiOutlineSpeakerphone className="text-neon-cyan text-xl" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">Community Announcements</h2>
                  <p className="text-[10px] text-dark-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    Live updates from organizer
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar">
                {communityMessages.filter(m => m.type !== 'system').length === 0 ? (
                  <div className="text-center py-10">
                    <div className="w-14 h-14 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-dark-700">
                      <HiOutlineSpeakerphone className="text-dark-500 text-2xl" />
                    </div>
                    <p className="text-dark-400 text-sm font-medium">No announcements yet</p>
                    <p className="text-dark-600 text-xs mt-1">Organizer broadcasts will appear here in real-time.</p>
                  </div>
                ) : (
                  communityMessages.filter(m => m.type !== 'system').map((msg, i) => (
                    <div key={i} className="relative overflow-hidden bg-gradient-to-br from-dark-950 to-dark-900 border border-surface-border rounded-2xl p-5 hover:border-neon-cyan/30 transition-all group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-neon-cyan"></div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-neon-cyan to-blue-600 rounded-xl flex items-center justify-center text-xs font-black text-white flex-shrink-0">
                          {msg.sender?.username?.[0]?.toUpperCase() || '📢'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-bold text-neon-cyan">{msg.sender?.username || 'Organizer'}</span>
                          <span className="ml-2 text-[9px] bg-neon-cyan/20 text-neon-cyan px-1.5 py-0.5 rounded border border-neon-cyan/30">ORG</span>
                        </div>
                        <span className="text-[10px] text-dark-500 font-mono">{formatTime(msg.createdAt)}</span>
                      </div>
                      <p className="text-sm text-dark-100 pl-11 leading-relaxed">{msg.content}</p>
                      {msg.attachment && (
                        <div className="pl-11 mt-2">
                          <img src={msg.attachment} alt="attachment" className="max-w-full max-h-64 rounded-lg border border-dark-700 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.attachment, '_blank')} />
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={communityBottomRef} />
              </div>
            </div>
          </div>
        )}

        {/* Live Tournament Roadmap */}
        {reg && roadmapData?.stages?.length > 0 && (
          <div className="mt-8 pt-8 border-t border-surface-border/50 animate-fade-in">
            <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <HiOutlineShieldCheck className="text-primary-500" />
              Live Tournament Roadmap
            </h1>

            <RoundProgressTracker
              stages={roadmapData.stages}
              activeStageId={activeStageId}
              onStageSelect={setActiveStageId}
            />

            {activeStageId && (
              <>
                <GroupSystemView
                  groups={roadmapData.groups.filter(g => g.stageId === activeStageId)}
                  activeGroupId={activeGroupId}
                  onGroupSelect={setActiveGroupId}
                  stage={roadmapData.stages.find(s => s._id === activeStageId)}
                />

                {activeGroupId && (() => {
                  const myTeamId = reg.teamId?._id || reg.teamId;
                  const groupSlots = roadmapData.slots.filter(s => s.groupId === activeGroupId);
                  const isTeamInGroup = activeGroupId === reg.groupId || 
                    groupSlots.some(s => s.occupyingTeam?._id === myTeamId || s.occupyingTeam === myTeamId);
                  
                  return (
                    <GroupDashboard
                      isOwnGroup={isTeamInGroup}
                      matchRooms={groupMatchRooms}
                      chatMessages={chatMessages}
                      chatInput={chatInput}
                      setChatInput={setChatInput}
                      sendChatMessage={sendChatMessage}
                      chatBottomRef={chatBottomRef}
                      slots={groupSlots}
                      results={roadmapData.results.find(r => r.groupId === activeGroupId)}
                      stage={roadmapData.stages.find(s => s._id === activeStageId)}
                      myTeamId={myTeamId}
                      maxSlots={roadmapData.stages.find(s => s._id === activeStageId)?.teamsPerGroup || 20}
                      formatTime={formatTime}
                      copyToClipboard={copyToClipboard}
                      user={user}
                    />
                  );
                })()}
              </>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default TournamentPlayerPortal;
