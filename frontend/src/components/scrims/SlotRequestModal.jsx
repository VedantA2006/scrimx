import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { HiX, HiPaperAirplane, HiChat, HiArrowRight } from 'react-icons/hi';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import MessageBubble from '../chat/MessageBubble';

const SlotRequestModal = ({ scrim, onClose }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { socket, joinConversation, leaveConversation, markRead } = useSocket();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [opening, setOpening] = useState(true);
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Open or resume conversation on mount
  useEffect(() => {
    const open = async () => {
      try {
        const res = await api.post('/chat/conversations/open', {
          scrimId: scrim._id,
        });
        if (res.success) {
          setConversation(res.conversation);
        }
      } catch (err) {
        toast.error(err.message || 'Failed to open chat');
        onClose();
      } finally {
        setOpening(false);
      }
    };
    open();
  }, [scrim._id]);

  // Load messages when conversation is ready
  useEffect(() => {
    if (!conversation?._id) return;
    const load = async () => {
      try {
        const data = await api.get(`/chat/conversations/${conversation._id}/messages?limit=100`);
        setMessages(data.messages || []);
        setTimeout(scrollToBottom, 80);
      } catch {}
    };
    load();
    joinConversation(conversation._id);
    api.patch(`/chat/conversations/${conversation._id}/read`).catch(() => {});
    return () => leaveConversation(conversation._id);
  }, [conversation?._id]);

  // Real-time new messages
  useEffect(() => {
    if (!socket || !conversation?._id) return;
    const handle = (msg) => {
      if (msg.conversation === conversation._id || msg.conversation?._id === conversation._id) {
        setMessages(prev => prev.some(m => m._id === msg._id) ? prev : [...prev, msg]);
        setTimeout(scrollToBottom, 50);
      }
    };
    socket.on('new_message', handle);
    return () => socket.off('new_message', handle);
  }, [socket, conversation?._id]);

  const handleSend = async () => {
    if (!newMessage.trim() || sending || !conversation) return;
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

  const getOrganizerName = () => {
    const other = conversation?.otherParticipant ||
      conversation?.participants?.find(p => p._id !== user?._id);
    return other?.organizerProfile?.displayName || other?.username || 'Organizer';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative bg-dark-900 border border-surface-border rounded-2xl w-full max-w-md shadow-2xl shadow-neon-cyan/10 flex flex-col overflow-hidden"
        style={{ height: '540px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-dark-850 border-b border-surface-border shrink-0">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-neon-purple flex items-center justify-center text-sm font-bold text-white shrink-0">
            {opening ? '?' : getOrganizerName()[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">
              {opening ? 'Connecting...' : getOrganizerName()}
            </p>
            <p className="text-[10px] text-neon-cyan truncate">⚔ {scrim.title}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {conversation && (
              <button
                onClick={() => { onClose(); navigate('/dashboard/inbox'); }}
                className="text-[10px] text-dark-400 hover:text-neon-cyan transition-colors px-2 py-1 rounded-lg hover:bg-white/5 flex items-center gap-1"
              >
                Full Inbox <HiArrowRight />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg transition-colors text-dark-400 hover:text-white">
              <HiX size={16} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto px-4 py-3"
          style={{ background: 'radial-gradient(ellipse at top, rgba(0,240,255,0.03) 0%, transparent 60%)' }}
        >
          {opening ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <div className="w-7 h-7 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin" />
              <p className="text-dark-400 text-xs">Opening chat with organizer...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <HiChat className="text-4xl text-dark-700 mb-3" />
              <p className="text-dark-400 text-sm">Chat opened!</p>
              <p className="text-dark-500 text-xs mt-1">Say something to the organizer</p>
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
                  return <MessageBubble key={msg._id} message={msg} isOwn={isOwn} showAvatar={showAvatar} />;
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Composer */}
        <div className="px-3 py-3 bg-dark-850 border-t border-surface-border shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={opening ? 'Please wait...' : 'Type a message... (Enter to send)'}
              disabled={opening || !conversation}
              rows={1}
              className="flex-1 bg-dark-800 border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-dark-500 resize-none focus:border-neon-cyan/50 outline-none transition-all disabled:opacity-40"
              style={{ minHeight: '42px', maxHeight: '100px' }}
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending || opening || !conversation}
              className="p-2.5 rounded-xl bg-neon-cyan text-dark-950 hover:bg-neon-cyan/90 transition-all disabled:opacity-30 shrink-0 shadow-lg shadow-neon-cyan/20"
            >
              <HiPaperAirplane className="text-xl rotate-90" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SlotRequestModal;
