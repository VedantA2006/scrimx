import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { HiPaperAirplane, HiOutlineSpeakerphone, HiChat, HiLightningBolt, HiOutlinePhotograph, HiOutlineX } from 'react-icons/hi';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const TournamentChatTab = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isAnnouncement, setIsAnnouncement] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const isOrganizer = user?.role === 'organizer' || user?.role === 'admin';

  // Load persisted chat history and join socket room
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('join_tournament_chat', id);

    // Load saved history
    const loadHistory = async () => {
      try {
        const res = await api.get(`/tournaments/${id}/chat-history`);
        if (res.success && res.data?.length > 0) {
          setMessages(res.data);
        } else {
          setMessages([{
            _id: 'sys-welcome',
            type: 'system',
            content: `Welcome to the Community Chat for this tournament. Stay updated with announcements from the organizer.`,
            createdAt: new Date().toISOString(),
          }]);
        }
      } catch {
        setMessages([{
          _id: 'sys-welcome',
          type: 'system',
          content: `Welcome to the Community Chat for this tournament.`,
          createdAt: new Date().toISOString(),
        }]);
      }
    };
    loadHistory();

    socket.on('tournament_message', (msg) => {
      setMessages(prev => [...prev, msg]);
    });

    return () => {
      socket.emit('leave_tournament_chat', id);
      socket.off('tournament_message');
    };
  }, [socket, id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('File must be under 5MB'); return; }
    setAttachmentFile(file);
    if (file.type.startsWith('image/')) {
      setAttachmentPreview(URL.createObjectURL(file));
    } else {
      setAttachmentPreview(null);
    }
  };

  const clearAttachment = () => {
    setAttachmentFile(null);
    setAttachmentPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content && !attachmentFile) return;
    if (!socket) return;

    let attachmentUrl = null;
    if (attachmentFile) {
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', attachmentFile);
        const uploadRes = await api.post('/upload', formData);
        if (uploadRes.success) {
          attachmentUrl = uploadRes.url;
        } else {
          toast.error('Upload failed'); setUploading(false); return;
        }
      } catch { toast.error('Upload failed'); setUploading(false); return; }
      setUploading(false);
    }

    socket.emit('tournament_message', {
      tournamentId: id,
      content: content || '',
      type: isOrganizer && isAnnouncement ? 'announcement' : 'message',
      attachment: attachmentUrl,
    });

    setInput('');
    clearAttachment();
    inputRef.current?.focus();
  };

  const formatTime = (iso) => {
    try { return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }); }
    catch { return ''; }
  };

  const [showBroadcast, setShowBroadcast] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastFiles, setBroadcastFiles] = useState([]);
  const [broadcasting, setBroadcasting] = useState(false);
  const broadcastFileRef = useRef(null);

  const addBroadcastFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (broadcastFiles.length + files.length > 5) return toast.error('Max 5 attachments.');
    const valid = files.filter(f => f.size <= 10 * 1024 * 1024);
    if (valid.length < files.length) toast.error('Files over 10MB were skipped.');
    setBroadcastFiles(prev => [...prev, ...valid]);
    if (broadcastFileRef.current) broadcastFileRef.current.value = '';
  };

  const removeBroadcastFile = (idx) => {
    setBroadcastFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const sendBroadcast = async () => {
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return toast.error('Title and message are required.');
    setBroadcasting(true);
    try {
      const formData = new FormData();
      formData.append('title', broadcastTitle.trim());
      formData.append('body', broadcastBody.trim());
      broadcastFiles.forEach(f => formData.append('attachments', f));

      const res = await api.post(`/tournaments/${id}/broadcast`, formData);
      if (res.success) {
        toast.success(`Announcement sent to ${res.recipientCount || 'all'} registered teams!`);
        setBroadcastTitle('');
        setBroadcastBody('');
        setBroadcastFiles([]);
        setShowBroadcast(false);
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to send announcement.');
    } finally {
      setBroadcasting(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: '0', height: 'calc(100vh - 220px)' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <HiChat className="text-neon-cyan text-xl" />
            Community Chat
          </h2>
          <p className="text-xs text-dark-400 mt-0.5">
            All approved participants are auto-joined · Organizer can broadcast announcements
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isOrganizer && (
            <button
              onClick={() => setShowBroadcast(!showBroadcast)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                showBroadcast
                  ? 'bg-amber-500/15 text-amber-400 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.2)]'
                  : 'bg-dark-800 text-dark-400 border-dark-700 hover:border-amber-500/30 hover:text-amber-400'
              }`}
            >
              <HiOutlineSpeakerphone className="text-sm" />
              Broadcast
            </button>
          )}
          <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-1.5 rounded-full">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>
            Live
          </div>
        </div>
      </div>

      {/* Broadcast Announcement Panel */}
      {isOrganizer && showBroadcast && (
        <div className="mb-4 flex-shrink-0 bg-gradient-to-br from-amber-500/10 to-dark-900 border border-amber-500/30 rounded-2xl p-5 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <HiOutlineSpeakerphone className="text-amber-400 text-lg" />
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Broadcast to All Registered Teams</h3>
          </div>
          <input
            type="text"
            value={broadcastTitle}
            onChange={e => setBroadcastTitle(e.target.value)}
            placeholder="Announcement title..."
            className="w-full input-field mb-3 text-sm border-amber-500/20 focus:border-amber-500/50"
            maxLength={120}
          />
          <textarea
            value={broadcastBody}
            onChange={e => setBroadcastBody(e.target.value)}
            placeholder="Write your announcement message..."
            rows={3}
            className="w-full input-field text-sm mb-3 resize-none border-amber-500/20 focus:border-amber-500/50"
            maxLength={1000}
          />

          {/* File Attachments */}
          <div className="mb-3">
            <input type="file" ref={broadcastFileRef} onChange={addBroadcastFiles} multiple accept="image/*,.pdf,.doc,.docx,.xlsx,.txt" className="hidden" />
            <button
              type="button"
              onClick={() => broadcastFileRef.current?.click()}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-dark-800 text-dark-400 border border-dark-700 hover:text-white hover:border-dark-500 transition-colors"
            >
              <HiOutlinePhotograph className="text-sm" />
              Attach Files ({broadcastFiles.length}/5)
            </button>
            {broadcastFiles.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {broadcastFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-lg px-2.5 py-1.5 text-xs text-dark-300">
                    📎 {f.name.length > 20 ? f.name.substring(0, 17) + '...' : f.name}
                    <span className="text-dark-500">({(f.size / 1024).toFixed(0)}KB)</span>
                    <button onClick={() => removeBroadcastFile(i)} className="text-red-400 hover:text-red-300 ml-1">
                      <HiOutlineX className="text-xs" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <p className="text-[10px] text-dark-500">Shown in community feed.</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setShowBroadcast(false); setBroadcastFiles([]); }}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-dark-800 text-dark-400 border border-dark-700 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendBroadcast}
                disabled={broadcasting || !broadcastTitle.trim() || !broadcastBody.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-amber-500 text-dark-950 hover:bg-amber-400 disabled:opacity-40 transition-all flex items-center gap-2"
              >
                <HiOutlineSpeakerphone className="text-sm" />
                {broadcasting ? 'Sending...' : 'Send Broadcast'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 min-h-0 mb-4">
        {messages.map((msg, i) => {
          if (msg.type === 'system') {
            return (
              <div key={msg._id || i} className="flex justify-center py-2">
                <span className="text-[11px] text-dark-500 bg-dark-800 px-3 py-1 rounded-full border border-dark-700">
                  {msg.content}
                </span>
              </div>
            );
          }

          if (msg.type === 'announcement') {
            return (
              <div key={msg._id || i} className="mx-1">
                <div className="bg-gradient-to-r from-neon-cyan/10 to-primary-500/10 border border-neon-cyan/30 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <HiOutlineSpeakerphone className="text-neon-cyan text-sm flex-shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-neon-cyan">
                      Organizer Announcement
                    </span>
                    <span className="text-[10px] text-dark-500 ml-auto">{formatTime(msg.createdAt)}</span>
                  </div>
                  {msg.content && <p className="text-sm text-white font-medium leading-relaxed">{msg.content}</p>}
                  {msg.attachment && (
                    <div className="mt-2">
                      <img src={msg.attachment} alt="attachment" className="max-w-full max-h-64 rounded-lg border border-dark-700 cursor-pointer hover:opacity-90 transition-opacity" onClick={() => window.open(msg.attachment, '_blank')} />
                    </div>
                  )}
                  <p className="text-[10px] text-dark-500 mt-1">{msg.sender?.username}</p>
                </div>
              </div>
            );
          }

          const isMine = msg.sender?._id?.toString() === user?._id?.toString();
          const isOrg = msg.sender?.role === 'organizer' || msg.sender?.role === 'admin';

          return (
            <div key={msg._id || i} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isOrg ? 'bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30' : 'bg-dark-700 text-dark-300'}`}>
                {msg.sender?.username?.[0]?.toUpperCase() || '?'}
              </div>

              <div className={`max-w-[72%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                {!isMine && (
                  <span className={`text-[10px] mb-0.5 font-semibold ${isOrg ? 'text-neon-cyan' : 'text-dark-400'}`}>
                    {msg.sender?.username}
                    {isOrg && <span className="ml-1 text-[9px] bg-neon-cyan/10 text-neon-cyan px-1 rounded">ORG</span>}
                  </span>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  isMine
                    ? 'bg-primary-600 text-white rounded-tr-sm'
                    : isOrg
                      ? 'bg-dark-800 border border-neon-cyan/20 text-white rounded-tl-sm'
                      : 'bg-dark-800 text-dark-100 rounded-tl-sm'
                }`}>
                  {msg.content}
                  {msg.attachment && (
                    <img src={msg.attachment} alt="attachment" className="mt-2 max-w-full max-h-48 rounded-lg border border-dark-700/50 cursor-pointer hover:opacity-90" onClick={() => window.open(msg.attachment, '_blank')} />
                  )}
                </div>
                <span className="text-[9px] text-dark-600 mt-0.5 px-1">{formatTime(msg.createdAt)}</span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input Bar */}
      <div className="flex-shrink-0 border-t border-surface-border pt-4">
        {/* Announcement Toggle (organizer only) */}
        {isOrganizer && (
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setIsAnnouncement(!isAnnouncement)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                isAnnouncement
                  ? 'bg-neon-cyan/15 text-neon-cyan border-neon-cyan/40 shadow-[0_0_8px_rgba(34,211,238,0.2)]'
                  : 'bg-dark-800 text-dark-400 border-dark-700 hover:border-dark-600'
              }`}
            >
              <HiLightningBolt className={isAnnouncement ? 'text-neon-cyan' : 'text-dark-500'} />
              {isAnnouncement ? 'Sending as Announcement' : 'Send as Announcement'}
            </button>
            {isAnnouncement && (
              <span className="text-[10px] text-dark-400">All participants will see this highlighted</span>
            )}
          </div>
        )}

        {/* Attachment Preview */}
        {attachmentPreview && (
          <div className="mb-3 relative inline-block">
            <img src={attachmentPreview} alt="preview" className="max-h-24 rounded-lg border border-surface-border" />
            <button onClick={clearAttachment} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs hover:bg-red-400">
              <HiOutlineX />
            </button>
          </div>
        )}
        {attachmentFile && !attachmentPreview && (
          <div className="mb-3 flex items-center gap-2 bg-dark-800 border border-surface-border rounded-lg px-3 py-2 text-xs text-dark-300 inline-flex">
            📎 {attachmentFile.name}
            <button onClick={clearAttachment} className="text-red-400 hover:text-red-300">
              <HiOutlineX />
            </button>
          </div>
        )}

        <form onSubmit={sendMessage} className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,.pdf,.doc,.docx" className="hidden" />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 bg-dark-800 border border-surface-border rounded-xl text-dark-400 hover:text-white hover:border-dark-500 transition-colors flex-shrink-0"
            title="Attach image or file"
          >
            <HiOutlinePhotograph className="text-lg" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={
              isOrganizer && isAnnouncement
                ? 'Type announcement...'
                : 'Type a message to all participants...'
            }
            className={`flex-1 input-field py-2.5 text-sm transition-colors ${
              isOrganizer && isAnnouncement ? 'border-neon-cyan/40 bg-neon-cyan/5' : ''
            }`}
            maxLength={500}
          />
          <button
            type="submit"
            disabled={(!input.trim() && !attachmentFile) || uploading}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${
              isOrganizer && isAnnouncement
                ? 'bg-neon-cyan text-dark-950 hover:bg-neon-cyan/90 disabled:opacity-40'
                : 'btn-primary disabled:opacity-40'
            }`}
          >
            <HiPaperAirplane className="rotate-90" />
            {uploading ? 'Uploading...' : isOrganizer && isAnnouncement ? 'Announce' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TournamentChatTab;
