import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const socketUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

    const socket = io(socketUrl, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    socket.on('connect', () => {
      setConnected(true);
    });

    socket.on('disconnect', () => {
      setConnected(false);
    });

    // Global notifications
    socket.on('conversation_updated', () => {
      setUnreadCount(prev => prev + 1);
    });

    socket.on('new_join_request', (data) => {
      // Could trigger toast notification
    });

    socket.on('invite_link_received', (data) => {
      // Could trigger toast notification
    });

    socket.on('plan_request_updated', (data) => {
      // Could trigger toast notification
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user, token]);

  const joinConversation = (conversationId) => {
    socketRef.current?.emit('join_conversation', conversationId);
  };

  const leaveConversation = (conversationId) => {
    socketRef.current?.emit('leave_conversation', conversationId);
  };

  const sendSocketMessage = (conversationId, content, type = 'text') => {
    socketRef.current?.emit('send_message', { conversationId, content, type });
  };

  const markRead = (conversationId) => {
    socketRef.current?.emit('mark_read', conversationId);
  };

  const emitTyping = (conversationId) => {
    socketRef.current?.emit('typing', { conversationId });
  };

  const emitStopTyping = (conversationId) => {
    socketRef.current?.emit('stop_typing', { conversationId });
  };

  return (
    <SocketContext.Provider value={{
      socket: socketRef.current,
      connected,
      unreadCount,
      setUnreadCount,
      joinConversation,
      leaveConversation,
      sendSocketMessage,
      markRead,
      emitTyping,
      emitStopTyping
    }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
