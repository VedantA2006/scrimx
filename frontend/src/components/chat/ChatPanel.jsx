import { useState, useEffect, useRef, useCallback } from 'react';
import { HiPaperAirplane, HiPhotograph, HiArrowLeft, HiDotsVertical } from 'react-icons/hi';
import api from '../../lib/api';
import MessageBubble from './MessageBubble';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

const ChatPanel = ({ conversation, onBack }) => {
  const { user } = useAuth();
  const { socket, joinConversation, leaveConversation, markRead } = useSocket();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load messages
  useEffect(() => {
    if (!conversation?._id) return;

    const loadMessages = async () => {
      setLoading(true);
      try {
        const data = await api.get(`/chat/conversations/${conversation._id}/messages?limit=100`);
        setMessages(data.messages || []);
        setTimeout(scrollToBottom, 100);
      } catch (err) {
        console.error('Failed to load messages:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
    joinConversation(conversation._id);
    markRead(conversation._id);
    api.patch(`/chat/conversations/${conversation._id}/read`).catch(() => {});

    return () => {
      leaveConversation(conversation._id);
    };
  }, [conversation?._id]);

  // Listen for real-time messages
  useEffect(() => {
    if (!socket || !conversation?._id) return;

    const handleNewMessage = (message) => {
      if (message.conversation === conversation._id || message.conversation?._id === conversation._id) {
        setMessages(prev => {
          if (prev.some(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
        setTimeout(scrollToBottom, 50);
        markRead(conversation._id);
        api.patch(`/chat/conversations/${conversation._id}/read`).catch(() => {});
      }
    };

    socket.on('new_message', handleNewMessage);
    return () => socket.off('new_message', handleNewMessage);
  }, [socket, conversation?._id]);

  // Send message
  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    const content = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const data = await api.post(`/chat/conversations/${conversation._id}/messages`, { content });
      // Message will arrive via socket, but add it optimistically
      setMessages(prev => {
        if (prev.some(m => m._id === data.message._id)) return prev;
        return [...prev, data.message];
      });
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      setNewMessage(content); // Restore on failure
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Upload file
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await api.post(`/chat/conversations/${conversation._id}/upload`, formData);
      setMessages(prev => {
        if (prev.some(m => m._id === data.message._id)) return prev;
        return [...prev, data.message];
      });
      setTimeout(scrollToBottom, 50);
    } catch (err) {
      console.error('Upload failed:', err);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getDisplayName = () => {
    const other = conversation?.otherParticipant || conversation?.participants?.find(p => p._id !== user?._id);
    return other?.organizerProfile?.displayName || other?.username || 'Chat';
  };

  const getRoleBadge = () => {
    const other = conversation?.otherParticipant || conversation?.participants?.find(p => p._id !== user?._id);
    return other?.role;
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const date = new Date(msg.createdAt).toLocaleDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(msg);
    return groups;
  }, {});

  const getDateLabel = (dateStr) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
  };

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-dark-950">
        <div className="text-center">
          <div className="text-6xl mb-4 opacity-20">💬</div>
          <p className="text-dark-400 text-sm">Select a conversation to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-dark-950">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-dark-900 border-b border-surface-border flex-shrink-0">
        <button onClick={onBack} className="md:hidden p-1 hover:bg-white/5 rounded-lg transition-colors">
          <HiArrowLeft className="text-lg text-dark-300" />
        </button>
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-neon-purple flex items-center justify-center text-sm font-bold text-white">
          {getDisplayName()[0]?.toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{getDisplayName()}</p>
          <div className="flex items-center gap-2">
            {getRoleBadge() && (
              <span className="text-[10px] capitalize text-dark-400">{getRoleBadge()}</span>
            )}
            {conversation.tournament && (
              <span className="text-[10px] text-neon-cyan truncate">🏆 {conversation.tournament?.title || 'Tournament'}</span>
            )}
            {conversation.scrim && (
              <span className="text-[10px] text-neon-cyan truncate">⚔ {conversation.scrim.title}</span>
            )}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-dark-400 text-sm animate-pulse">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex justify-center py-8">
            <p className="text-dark-500 text-xs">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex justify-center my-4">
                <span className="px-3 py-1 rounded-full bg-dark-800 text-[10px] text-dark-400 font-medium">
                  {getDateLabel(date)}
                </span>
              </div>
              {/* Messages */}
              {msgs.map((msg, idx) => {
                const isOwn = msg.sender?._id === user?._id || msg.sender === user?._id;
                const prevMsg = idx > 0 ? msgs[idx - 1] : null;
                const showAvatar = !prevMsg || 
                  (prevMsg.sender?._id || prevMsg.sender) !== (msg.sender?._id || msg.sender) ||
                  prevMsg.type === 'system';
                
                return (
                  <MessageBubble
                    key={msg._id}
                    message={msg}
                    isOwn={isOwn}
                    showAvatar={showAvatar}
                  />
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="px-4 py-3 bg-dark-900 border-t border-surface-border flex-shrink-0">
        <div className="flex items-end gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,.pdf"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl hover:bg-white/5 text-dark-400 hover:text-neon-cyan transition-colors flex-shrink-0"
          >
            <HiPhotograph className="text-xl" />
          </button>
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className="flex-1 bg-dark-850 border border-surface-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-dark-400 resize-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/30 transition-all max-h-32"
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || sending}
            className="p-2.5 rounded-xl bg-neon-cyan text-dark-950 hover:bg-neon-cyan/90 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          >
            <HiPaperAirplane className="text-xl rotate-90" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPanel;
