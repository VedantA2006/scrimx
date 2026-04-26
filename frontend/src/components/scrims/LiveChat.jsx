import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { HiPaperAirplane, HiUserCircle } from 'react-icons/hi';
import { useAuth } from '../../context/AuthContext';

const LiveChat = ({ scrim }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef(null);
  const socketRef = useRef(null);

  useEffect(() => {
    // Fetch initial chat history
    const fetchHistory = async () => {
      try {
        const res = await api.get(`/chat/${scrim._id}`);
        if(res.messages) {
           setMessages(res.messages);
        }
      } catch (err) {
        toast.error('Failed to load chat history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();

    // Initialize Socket
    const wsUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    socketRef.current = io(wsUrl, {
      withCredentials: true
    });

    socketRef.current.on('connect', () => {
      socketRef.current.emit('join_scrim', scrim._id);
    });

    socketRef.current.on('receive_message', (message) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_scrim', scrim._id);
        socketRef.current.disconnect();
      }
    };
  }, [scrim._id]);

  useEffect(() => {
    // Auto scroll down
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    socketRef.current.emit('send_message', {
      scrimId: scrim._id,
      senderId: user._id,
      message: newMessage
    });
    setNewMessage('');
  };

  if (loading) return <div className="p-4 text-center text-dark-400">Loading chat...</div>;

  return (
    <div className="flex flex-col h-[500px] bg-dark-900 border border-surface-border rounded-xl overflow-hidden mt-6">
      <div className="bg-dark-950 p-4 border-b border-surface-border">
        <h3 className="text-white font-bold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
          Live Dispute Chat
        </h3>
        <p className="text-xs text-dark-400">Communicate with Organizer and other Teams.</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="text-center text-dark-500 mt-10 text-sm">No messages yet. Start the conversation!</div>
        ) : (
          messages.map((msg, idx) => {
            const isMe = user && (msg.sender?._id || msg.sender) === user._id;
            const isOrganizer = (msg.sender?._id === scrim.organizer) || (msg.sender?._id === scrim.organizer?._id) || (msg.sender === scrim.organizer);
            
            return (
              <div key={msg._id || idx} className={`flex gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 bg-dark-700 mt-1">
                  {msg.sender?.avatar ? (
                    <img src={msg.sender.avatar} className="w-full h-full object-cover" />
                  ) : (
                    <HiUserCircle className="w-full h-full text-dark-400" />
                  )}
                </div>
                <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${isOrganizer ? 'text-neon-cyan' : 'text-dark-300'}`}>
                      {msg.sender?.ign || msg.sender?.username || 'Unknown'}
                    </span>
                    {isOrganizer && (
                      <span className="text-[10px] bg-neon-cyan/10 text-neon-cyan px-1.5 py-0.5 rounded border border-neon-cyan/20">
                        Organizer
                      </span>
                    )}
                  </div>
                  <div className={`p-3 rounded-2xl text-sm ${isMe ? 'bg-primary-600 text-white rounded-tr-sm' : 'bg-dark-800 text-gray-200 rounded-tl-sm border border-surface-border'}`}>
                    {msg.message}
                  </div>
                  <span className="text-[10px] text-dark-500 mt-1">
                    {msg.createdAt && new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-3 bg-dark-950 border-t border-surface-border">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="input-field flex-1"
          />
          <button type="submit" disabled={!newMessage.trim()} className="btn-primary px-4 py-2 flex items-center justify-center">
            <HiPaperAirplane className="rotate-90" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default LiveChat;
