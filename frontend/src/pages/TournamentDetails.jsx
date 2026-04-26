import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  HiOutlineCalendar, HiOutlineCash, HiOutlineUsers,
  HiX, HiPaperAirplane, HiArrowLeft, HiChat,
  HiOutlineLightningBolt, HiOutlineShieldCheck,
  HiOutlineUserGroup
} from 'react-icons/hi';
import api from '../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import MessageBubble from '../components/chat/MessageBubble';

const TournamentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, joinConversation, leaveConversation, markRead } = useSocket();

  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);

  // Chat state
  const [showChat, setShowChat] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);

  // Direct Join state
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [userTeams, setUserTeams] = useState([]);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [joiningTeamId, setJoiningTeamId] = useState(null);
  const [appliedTeams, setAppliedTeams] = useState(new Set());

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const [isRegistered, setIsRegistered] = useState(false);

  // Social Verification state
  const [showSocialModal, setShowSocialModal] = useState(false);
  const [proofImage, setProofImage] = useState(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [uploadedProofUrl, setUploadedProofUrl] = useState('');
  const [pendingAction, setPendingAction] = useState(null); // 'chat' or 'direct'
  const proofInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, [id, user]);

  const fetchData = async () => {
    try {
      const res = await api.get(`/tournaments/public/${id}`);
      if (res.success) {
        setTournament(res.data);
        // Check registration status if user is a player
        if (user && user.role !== 'organizer' && user.role !== 'admin') {
          const statusRes = await api.get(`/tournaments/${id}/my-status`);
          if (statusRes.success && statusRes.data) {
            setIsRegistered(true);
          }
        }
      }
    } catch {
      toast.error('Failed to load tournament data');
    } finally {
      setLoading(false);
    }
  };

  // ── Open Chat with Organizer ──────────────────────────────────────────────
  const handleOpenChat = async () => {
    if (!user) {
      toast.error('Please login to chat with the organizer');
      navigate('/login');
      return;
    }
    if (user.role === 'organizer' || user.role === 'admin') {
      toast.error('Only players can request slots');
      return;
    }

    if (tournament.socialRequirements?.requireFollow && !uploadedProofUrl) {
      setPendingAction('chat');
      setShowSocialModal(true);
      return;
    }

    setOpeningChat(true);
    try {
      const res = await api.post('/chat/conversations/open', {
        tournamentId: tournament?._id || id,
        firstMessage: `Hi! I'm interested in getting a slot for "${tournament?.title}". Can you help me?`
      });
      if (res.success) {
        setConversation(res.conversation);
        setShowChat(true);
        toast.success('Chat opened! Introduce yourself to the organizer 👋');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to open chat');
    } finally {
      setOpeningChat(false);
    }
  };

  // ── Direct Join ───────────────────────────────────────────────────────────
  const handleOpenDirectJoin = async () => {
    if (!user) {
      toast.error('Please login to join the tournament');
      navigate('/login');
      return;
    }
    if (user.role === 'organizer' || user.role === 'admin') {
      toast.error('Only players can join tournaments');
      return;
    }

    if (tournament.socialRequirements?.requireFollow && !uploadedProofUrl) {
      setPendingAction('direct');
      setShowSocialModal(true);
      return;
    }

    setShowTeamModal(true);
    setLoadingTeams(true);
    try {
      const res = await api.get('/teams/manage/my');
      setUserTeams(res.teams || []);
    } catch {
      toast.error('Failed to load your teams');
    } finally {
      setLoadingTeams(false);
    }
  };

  const handleDirectJoin = async (team) => {
    setJoiningTeamId(team._id);
    try {
      // Direct POST to register - backend will auto-approve if fee is 0
      const res = await api.post(`/tournaments/${tournament._id}/register`, {
        teamId: team._id,
        roster: team.members.map(p => ({
          playerId: p.user?._id || p.user,
          inGameName: p.ign || p.user?.ign || 'Unknown',
          inGameId: p.uid || p.user?.uid || 'Unknown',
          role: p.role === 'captain' || p.role === 'co-captain' ? 'captain' : 'player'
        })),
        followProofImage: uploadedProofUrl,
        termsAccepted: true
      });
      if (res.success) {
        toast.success('Successfully joined the tournament!');
        setShowTeamModal(false);
        navigate(`/tournaments/${tournament.shortCode || id}/my-portal`);
      }
    } catch (err) {
      console.error('JOIN ERROR:', err);
      if (err.message && err.message.toLowerCase().includes('already')) {
        toast.success('Your team is already applied to this tournament!');
        setAppliedTeams(prev => {
          const newSet = new Set(prev);
          newSet.add(team._id);
          return newSet;
        });
      } else {
        toast.error(err.message || 'Failed to join tournament');
      }
    } finally {
      setJoiningTeamId(null);
    }
  };

  // ── Handle Proof Upload ───────────────────────────────────────────────────
  const handleProofUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return toast.error('Image must be under 5MB.');

    setProofImage(URL.createObjectURL(file));
    setProofUploading(true);

    try {
      const fd = new FormData();
      fd.append('proof', file);
      const res = await api.post('/tournaments/upload-proof', fd);
      if (res.success) {
        setUploadedProofUrl(res.url);
        toast.success('Proof uploaded!');
      }
    } catch (err) {
      toast.error('Upload failed. Try again.');
      setProofImage(null);
    } finally {
      setProofUploading(false);
    }
  };

  // ── Load Messages ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!conversation?._id || !showChat) return;
    const load = async () => {
      setChatLoading(true);
      try {
        const data = await api.get(`/chat/conversations/${conversation._id}/messages?limit=100`);
        setMessages(data.messages || []);
        setTimeout(scrollToBottom, 80);
      } catch {}
      finally { setChatLoading(false); }
    };
    load();
    joinConversation(conversation._id);
    api.patch(`/chat/conversations/${conversation._id}/read`).catch(() => {});
    return () => leaveConversation(conversation._id);
  }, [conversation?._id, showChat]);

  // ── Real-time messages ────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket || !conversation?._id) return;
    const handleNew = (msg) => {
      if (msg.conversation === conversation._id || msg.conversation?._id === conversation._id) {
        setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
        setTimeout(scrollToBottom, 50);
        markRead(conversation._id);
      }
    };
    socket.on('new_message', handleNew);
    return () => socket.off('new_message', handleNew);
  }, [socket, conversation?._id]);

  // ── Send Message ─────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;
    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);
    try {
      const data = await api.post(`/chat/conversations/${conversation._id}/messages`, { content });
      setMessages(prev => prev.some(m => m._id === data.message._id) ? prev : [...prev, data.message]);
      setTimeout(scrollToBottom, 50);
    } catch {
      setNewMessage(content);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Group messages by date ────────────────────────────────────────────────
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.createdAt).toLocaleDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const getDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const getOtherName = () => {
    const other = conversation?.otherParticipant ||
      conversation?.participants?.find(p => p._id !== user?._id);
    return other?.organizerProfile?.displayName || other?.username || 'Organizer';
  };

  if (loading) return (
    <div className="min-h-screen bg-dark-950 flex justify-center items-center">
      <div className="w-8 h-8 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin" />
    </div>
  );
  if (!tournament) return (
    <div className="min-h-screen bg-dark-950 flex justify-center items-center text-white">Tournament not found</div>
  );

  const isFree = tournament.finance?.entryFee === 0;

  return (
    <div className="min-h-screen bg-dark-950 text-dark-200">
      {/* Hero Banner */}
      <div className="relative h-80 bg-dark-900 border-b border-surface-border flex items-end overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-dark-950 via-dark-950/60 to-transparent z-0" />
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 right-20 w-64 h-64 rounded-full bg-neon-cyan blur-3xl" />
          <div className="absolute bottom-0 left-20 w-48 h-48 rounded-full bg-primary-500 blur-3xl" />
        </div>
        <div className="max-w-6xl mx-auto w-full px-6 pb-10 relative z-10 flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <span className="bg-primary-500/20 text-primary-400 border border-primary-500/30 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded inline-block mb-3 mr-2">
              {tournament.game} / {tournament.format} / {tournament.mode}
            </span>
            {tournament.socialRequirements?.requireFollow && (
              <span className="bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded inline-block mb-3">
                🔒 Follow Required
              </span>
            )}
            <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-2">{tournament.title}</h1>
            <p className="text-lg text-dark-300">{tournament.subtitle}</p>
          </div>
          <div className="flex flex-col gap-3">
            {isRegistered ? (
               <button
                 onClick={() => navigate(`/tournaments/${tournament.shortCode || id}/my-portal`)}
                 className="flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-dark-950 bg-green-400 hover:bg-green-500 shadow-lg shadow-green-500/25 transition-all text-base"
               >
                 <HiOutlineLightningBolt className="text-xl" />
                 Go to Portal
               </button>
            ) : isFree ? (
               <button
                 onClick={handleOpenDirectJoin}
                 disabled={user?.role === 'organizer' || user?.role === 'admin'}
                 className="flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-dark-950 bg-green-400 hover:bg-green-500 shadow-lg shadow-green-500/25 transition-all disabled:opacity-50 text-base"
               >
                 <HiOutlineLightningBolt className="text-xl" />
                 Direct Join (Free)
               </button>
            ) : (
               <button
                 onClick={handleOpenChat}
                 disabled={openingChat || user?.role === 'organizer' || user?.role === 'admin'}
                 className="flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-dark-950 bg-neon-cyan hover:bg-neon-cyan/90 shadow-lg shadow-neon-cyan/25 transition-all disabled:opacity-50 text-base"
               >
                 {openingChat ? (
                   <span className="w-5 h-5 border-2 border-dark-950 border-t-transparent rounded-full animate-spin" />
                 ) : (
                   <HiChat className="text-xl" />
                 )}
                 {openingChat ? 'Opening Chat...' : '💬 Chat with Organizer'}
               </button>
            )}
            <p className="text-xs text-dark-500 text-center">
               {isRegistered ? 'You have already joined this tournament.' : isFree ? 'Instantly reserve your team\'s slot' : 'Opens a direct chat — no forms needed'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto w-full px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-dark-900 border border-surface-border rounded-2xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">About the Event</h2>
            <p className="text-dark-300 leading-relaxed whitespace-pre-wrap">
              {tournament.description || tournament.shortDescription}
            </p>
          </section>

          {tournament.rulesEngineId && (
            <section className="bg-dark-900 border border-surface-border rounded-2xl p-8">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <HiOutlineShieldCheck className="text-neon-cyan" /> Strict Eligibility & Rules
              </h2>
              <div className="space-y-3 text-sm text-dark-300">
                <p><span className="text-white font-bold">Allowed Devices:</span> {tournament.rulesEngineId.eligibility?.allowedDevices?.join(', ')}</p>
                <p><span className="text-white font-bold">Min Level:</span> {tournament.rulesEngineId.eligibility?.minAccountLevel || 'None'}</p>
                <p><span className="text-white font-bold">VPN Policy:</span> {tournament.rulesEngineId.policies?.vpnAllowed ? 'Allowed' : 'Strictly Prohibited'}</p>
              </div>
            </section>
          )}

          {/* How it works */}
          <section className="bg-dark-900 border border-surface-border rounded-2xl p-8">
            <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
              <HiOutlineLightningBolt className="text-yellow-400" /> How to Join
            </h2>
            <div className="space-y-4">
               {isFree ? (
                  [
                    { step: '1', title: 'Click "Direct Join (Free)"', desc: 'Select one of your existing teams to enroll instantly.' },
                    { step: '2', title: 'Get Confirmed', desc: 'You will immediately be granted access to the Player Portal.' },
                    { step: '3', title: 'Match Credentials', desc: 'Secure match credentials will be posted in the portal when the tournament begins.' },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-green-400/10 border border-green-400/30 flex items-center justify-center text-green-400 font-bold text-sm shrink-0">{step}</div>
                      <div>
                        <p className="text-white font-medium text-sm">{title}</p>
                        <p className="text-dark-400 text-xs mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))
               ) : (
                  [
                    { step: '1', title: 'Click "Chat with Organizer"', desc: 'Opens a private chat with the tournament organizer directly — like WhatsApp.' },
                    { step: '2', title: 'Introduce your team', desc: 'Tell the organizer about your team, IGN, UID and why you want to join.' },
                    { step: '3', title: 'Get confirmed', desc: 'Once approved, the organizer assigns you a slot number and room details.' },
                  ].map(({ step, title, desc }) => (
                    <div key={step} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center text-neon-cyan font-bold text-sm shrink-0">{step}</div>
                      <div>
                        <p className="text-white font-medium text-sm">{title}</p>
                        <p className="text-dark-400 text-xs mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))
               )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-dark-900 border border-surface-border rounded-2xl p-6 sticky top-6">
            <h3 className="text-lg font-bold text-white mb-6">Tournament Details</h3>
            <div className="space-y-5">
              {[
                { icon: <HiOutlineCash className="text-2xl text-green-400 mt-0.5" />, label: 'Entry Fee', value: tournament.finance?.entryFee > 0 ? `₹${tournament.finance.entryFee}` : 'FREE' },
                { icon: <HiOutlineCash className="text-2xl text-yellow-400 mt-0.5" />, label: 'Prize Pool', value: `₹${tournament.finance?.totalPrizePool || 0}` },
                { icon: <HiOutlineUsers className="text-2xl text-neon-cyan mt-0.5" />, label: 'Slot Capacity', value: tournament.participation?.maxTeams || '-' },
                { icon: <HiOutlineCalendar className="text-2xl text-primary-400 mt-0.5" />, label: 'Match Start', value: new Date(tournament.schedule?.matchStartDate).toLocaleString() },
              ].map(({ icon, label, value }) => (
                <div key={label} className="flex items-start gap-4">
                  {icon}
                  <div>
                    <p className="text-xs text-dark-400 uppercase tracking-widest font-bold">{label}</p>
                    <p className="text-lg font-bold text-white">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-surface-border">
               {isRegistered ? (
                  <button
                    onClick={() => navigate(`/tournaments/${tournament.shortCode || id}/my-portal`)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-dark-950 bg-green-400 hover:bg-green-500 shadow-lg shadow-green-500/20 transition-all"
                  >
                    <HiOutlineLightningBolt />
                    Go to Portal
                  </button>
               ) : isFree ? (
                  <button
                    onClick={handleOpenDirectJoin}
                    disabled={user?.role === 'organizer' || user?.role === 'admin'}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-dark-950 bg-green-400 hover:bg-green-500 shadow-lg shadow-green-500/20 transition-all disabled:opacity-50"
                  >
                    <HiOutlineLightningBolt />
                    Direct Join (Free)
                  </button>
               ) : (
                  <button
                    onClick={handleOpenChat}
                    disabled={openingChat || user?.role === 'organizer' || user?.role === 'admin'}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-dark-950 bg-neon-cyan hover:bg-neon-cyan/90 shadow-lg shadow-neon-cyan/20 transition-all disabled:opacity-50"
                  >
                    <HiChat />
                    {openingChat ? 'Opening...' : 'Request a Slot'}
                  </button>
               )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Team Selection Modal for Direct Join ────────────────────────────── */}
      {showTeamModal && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-dark-900 border border-surface-border rounded-2xl w-full max-w-md shadow-2xl p-6">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                     <HiOutlineUserGroup className="text-neon-cyan" />
                     Select Team to Join
                  </h3>
                  <button onClick={() => setShowTeamModal(false)} className="text-dark-400 hover:text-white">
                     <HiX size={20} />
                  </button>
               </div>

               {loadingTeams ? (
                  <div className="flex justify-center py-8">
                     <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
                  </div>
               ) : userTeams.length === 0 ? (
                  <div className="text-center py-8">
                     <p className="text-dark-300 mb-4">You need to create a team before joining a tournament.</p>
                     <button onClick={() => navigate('/dashboard')} className="btn-primary px-6 py-2">
                        Go to Dashboard
                     </button>
                  </div>
               ) : (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
                     {userTeams.map(team => (
                        <div key={team._id} className="bg-dark-950 border border-surface-border rounded-xl p-4 hover:border-neon-cyan/50 transition-colors flex items-center justify-between">
                           <div className="flex items-center gap-3">
                              {team.logoImage ? (
                                 <img src={team.logoImage} alt="logo" className="w-10 h-10 rounded-lg object-cover bg-dark-800" />
                              ) : (
                                 <div className="w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center text-dark-300 font-bold">
                                    {team.name?.[0]?.toUpperCase()}
                                 </div>
                              )}
                              <div>
                                 <p className="text-white font-bold text-sm">{team.name}</p>
                                 <p className="text-xs text-dark-400">{team.members?.length || 0} Members</p>
                              </div>
                           </div>
                           <button 
                              onClick={() => handleDirectJoin(team)}
                              disabled={joiningTeamId === team._id || appliedTeams.has(team._id)}
                              className={`px-4 py-2 font-bold text-sm rounded-lg transition-colors disabled:opacity-50 ${appliedTeams.has(team._id) ? 'bg-dark-700 text-white' : 'bg-green-500 hover:bg-green-600 text-dark-950'}`}
                           >
                              {appliedTeams.has(team._id) ? 'Applied' : joiningTeamId === team._id ? 'Joining...' : 'Select'}
                           </button>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>
      )}

       {/* ── Social Verification Modal ────────────────────────────────────────── */}
       {showSocialModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
             <div className="bg-dark-900 border border-surface-border rounded-2xl w-full max-w-md shadow-2xl p-6 animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <span className="text-2xl">🔒</span> Social Verification
                   </h3>
                   <button onClick={() => setShowSocialModal(false)} className="text-dark-400 hover:text-white">
                      <HiX size={20} />
                   </button>
                </div>

                <div className="space-y-6">
                   <div>
                      <p className="text-sm text-dark-300 mb-3">Please follow the organizer's social accounts before joining.</p>
                      <div className="flex flex-wrap gap-2">
                         {tournament.socialRequirements?.socialLinks?.instagram && (
                            <a href={tournament.socialRequirements.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[#E1306C]/10 text-[#E1306C] border border-[#E1306C]/30 rounded-lg text-sm font-bold hover:bg-[#E1306C]/20 transition-all">Instagram</a>
                         )}
                         {tournament.socialRequirements?.socialLinks?.youtube && (
                            <a href={tournament.socialRequirements.socialLinks.youtube} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[#FF0000]/10 text-[#FF0000] border border-[#FF0000]/30 rounded-lg text-sm font-bold hover:bg-[#FF0000]/20 transition-all">YouTube</a>
                         )}
                         {tournament.socialRequirements?.socialLinks?.discord && (
                            <a href={tournament.socialRequirements.socialLinks.discord} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-[#5865F2]/10 text-[#5865F2] border border-[#5865F2]/30 rounded-lg text-sm font-bold hover:bg-[#5865F2]/20 transition-all">Discord</a>
                         )}
                         {tournament.socialRequirements?.socialLinks?.custom && (
                            <a href={tournament.socialRequirements.socialLinks.custom} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-dark-800 text-white border border-surface-border rounded-lg text-sm font-bold hover:bg-dark-700 transition-all">Website</a>
                         )}
                      </div>
                   </div>

                   {tournament.socialRequirements?.requireScreenshot && (
                      <div>
                         <label className="text-sm font-bold text-white block mb-2">Upload Screenshot Proof</label>
                         {proofImage ? (
                            <div className="relative rounded-xl overflow-hidden border border-surface-border group mb-2">
                               <img src={proofImage} alt="Proof preview" className="w-full h-32 object-cover" />
                               {proofUploading && (
                                  <div className="absolute inset-0 bg-dark-950/70 flex items-center justify-center">
                                     <div className="w-6 h-6 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin"></div>
                                  </div>
                               )}
                               {!proofUploading && (
                                  <button type="button" onClick={() => { setProofImage(null); setUploadedProofUrl(''); }} className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <HiX className="text-sm" />
                                  </button>
                               )}
                            </div>
                         ) : (
                            <button
                               onClick={() => proofInputRef.current?.click()}
                               className="w-full h-32 border-2 border-dashed border-surface-border rounded-xl flex flex-col items-center justify-center gap-2 text-dark-400 hover:border-neon-cyan/50 hover:text-neon-cyan transition-all cursor-pointer mb-2"
                            >
                               <span className="text-2xl">📸</span>
                               <span className="text-sm font-medium">Click to upload screenshot</span>
                            </button>
                         )}
                         <input ref={proofInputRef} type="file" accept="image/*" onChange={handleProofUpload} className="hidden" />
                      </div>
                   )}

                   <button
                      disabled={proofUploading || (tournament.socialRequirements?.requireScreenshot && !uploadedProofUrl)}
                      onClick={() => {
                         setShowSocialModal(false);
                         if (pendingAction === 'chat') {
                            setOpeningChat(true);
                            api.post('/chat/conversations/open', {
                               tournamentId: tournament?._id || id,
                               firstMessage: `Hi! I'm interested in getting a slot for "${tournament?.title}". I have uploaded the social follow proof.`
                            }).then(res => {
                               if (res.success) {
                                  setConversation(res.conversation);
                                  setShowChat(true);
                                  toast.success('Chat opened! Introduce yourself to the organizer 👋');
                               }
                            }).catch(err => toast.error(err.message || 'Failed to open chat'))
                            .finally(() => setOpeningChat(false));
                         } else {
                            setShowTeamModal(true);
                            setLoadingTeams(true);
                            api.get('/teams/manage/my').then(res => setUserTeams(res.teams || []))
                            .catch(() => toast.error('Failed to load your teams'))
                            .finally(() => setLoadingTeams(false));
                         }
                      }}
                      className="w-full py-3 rounded-xl font-bold text-dark-950 bg-neon-cyan hover:bg-neon-cyan/90 transition-all disabled:opacity-50"
                   >
                      Verify & Continue
                   </button>
                </div>
             </div>
          </div>
       )}

       {/* ── Full-Screen Chat Overlay ──────────────────────────────────────── */}
       {showChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-dark-900 border border-surface-border rounded-2xl w-full max-w-lg flex flex-col shadow-2xl shadow-neon-cyan/10"
            style={{ height: '80vh', maxHeight: '680px' }}>

            {/* Chat Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-dark-850 border-b border-surface-border rounded-t-2xl shrink-0">
              <button
                onClick={() => { setShowChat(false); leaveConversation(conversation?._id); }}
                className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-dark-400 hover:text-white"
              >
                <HiX size={18} />
              </button>
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-neon-purple flex items-center justify-center text-sm font-bold text-white shrink-0">
                {getOtherName()[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{getOtherName()}</p>
                <p className="text-[10px] text-neon-cyan truncate">🏆 {tournament.title}</p>
              </div>
              <button
                onClick={() => navigate(user?.role === 'player' ? '/dashboard/inbox' : '/organizer/inbox')}
                className="text-[10px] text-dark-400 hover:text-neon-cyan transition-colors px-2 py-1 rounded-lg hover:bg-white/5 whitespace-nowrap"
              >
                Open Inbox →
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
              style={{ background: 'radial-gradient(ellipse at top, rgba(0,240,255,0.03) 0%, transparent 60%)' }}>
              {chatLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <div className="text-5xl mb-3 opacity-30">💬</div>
                  <p className="text-dark-400 text-sm">No messages yet</p>
                  <p className="text-dark-500 text-xs mt-1">Say hi to the organizer!</p>
                </div>
              ) : (
                Object.entries(groupedMessages).map(([date, msgs]) => (
                  <div key={date}>
                    <div className="flex justify-center my-3">
                      <span className="px-3 py-1 rounded-full bg-dark-800 text-[10px] text-dark-400 font-medium">
                        {getDateLabel(date)}
                      </span>
                    </div>
                    {msgs.map((msg, idx) => {
                      const isOwn = msg.sender?._id === user?._id || msg.sender === user?._id;
                      const prev = idx > 0 ? msgs[idx - 1] : null;
                      const showAvatar = !prev || (prev.sender?._id || prev.sender) !== (msg.sender?._id || msg.sender);
                      return (
                        <MessageBubble key={msg._id} message={msg} isOwn={isOwn} showAvatar={showAvatar} />
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="px-3 py-3 bg-dark-850 border-t border-surface-border rounded-b-2xl shrink-0">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message... (Enter to send)"
                  rows={1}
                  className="flex-1 bg-dark-800 border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-dark-500 resize-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/20 transition-all outline-none"
                  style={{ minHeight: '42px', maxHeight: '120px' }}
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sending}
                  className="p-2.5 rounded-xl bg-neon-cyan text-dark-950 hover:bg-neon-cyan/90 transition-all disabled:opacity-30 shrink-0 shadow-lg shadow-neon-cyan/20"
                >
                  <HiPaperAirplane className="text-xl rotate-90" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDetails;
