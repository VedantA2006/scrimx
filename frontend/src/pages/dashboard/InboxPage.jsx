import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { 
  HiOutlineBell, HiCheckCircle, HiXCircle, HiLockOpen, 
  HiClipboardList, HiUserGroup, HiCalendar, HiCheck 
} from 'react-icons/hi';
import { useSocket } from '../../context/SocketContext';

const InboxPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { socket } = useSocket();

  const fetchNotifications = useCallback(async () => {
    try {
      const { notifications: data } = await api.get('/notifications');
      setNotifications(data || []);
    } catch (err) {
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;
    const handleNewNotif = (notif) => {
      setNotifications(prev => [notif, ...prev]);
    };
    socket.on('new_notification', handleNewNotif);
    return () => socket.off('new_notification', handleNewNotif);
  }, [socket]);

  const markAsRead = async (id, link) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      if (link) {
        navigate(link);
      }
    } catch (err) {
      // Ignore error for marking read
      if (link) navigate(link);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      toast.success('All notifications marked as read');
    } catch (err) {
      toast.error('Failed to mark all as read');
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'slot_approved': return <div className="p-2 bg-green-500/10 text-green-500 rounded-full"><HiCheckCircle size={20} /></div>;
      case 'slot_rejected': return <div className="p-2 bg-red-500/10 text-red-500 rounded-full"><HiXCircle size={20} /></div>;
      case 'room_released': return <div className="p-2 bg-yellow-500/10 text-yellow-500 rounded-full"><HiLockOpen size={20} /></div>;
      case 'result_published': return <div className="p-2 bg-neon-cyan/10 text-neon-cyan rounded-full"><HiClipboardList size={20} /></div>;
      case 'team_invite': return <div className="p-2 bg-purple-500/10 text-purple-500 rounded-full"><HiUserGroup size={20} /></div>;
      case 'scrim_starting': return <div className="p-2 bg-orange-500/10 text-orange-500 rounded-full"><HiCalendar size={20} /></div>;
      default: return <div className="p-2 bg-blue-500/10 text-blue-500 rounded-full"><HiOutlineBell size={20} /></div>;
    }
  };

  const groupNotifications = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const groups = { today: [], earlier: [] };
    
    notifications.forEach(n => {
      const date = new Date(n.createdAt);
      if (date >= today) {
        groups.today.push(n);
      } else {
        groups.earlier.push(n);
      }
    });
    
    return groups;
  };

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins || 1}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  const { today, earlier } = groupNotifications();

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <HiOutlineBell className="text-neon-cyan" />
            Notifications
          </h1>
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className="text-xs font-medium text-dark-300 hover:text-white flex items-center gap-1 transition-colors"
            >
              <HiCheck /> Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-dark-900 border border-surface-border p-4 rounded-xl animate-pulse flex gap-4">
                <div className="w-10 h-10 rounded-full bg-dark-800 shrink-0"></div>
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-dark-800 rounded w-1/4"></div>
                  <div className="h-3 bg-dark-800 rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-20 bg-dark-900 border border-surface-border rounded-xl">
            <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mx-auto mb-4 text-dark-500">
              <HiOutlineBell size={32} />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No notifications yet</h3>
            <p className="text-dark-400 text-sm max-w-sm mx-auto">
              You're all caught up! When you register for scrims or receive invites, they will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {today.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-dark-400 mb-3 px-1">Today</h3>
                <div className="space-y-2">
                  {today.map(n => (
                    <NotificationItem 
                      key={n._id} 
                      notification={n} 
                      onClick={() => markAsRead(n._id, n.link)} 
                      icon={getIcon(n.type)}
                      time={formatTime(n.createdAt)}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {earlier.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-dark-400 mb-3 px-1 mt-6">Earlier</h3>
                <div className="space-y-2">
                  {earlier.map(n => (
                    <NotificationItem 
                      key={n._id} 
                      notification={n} 
                      onClick={() => markAsRead(n._id, n.link)} 
                      icon={getIcon(n.type)}
                      time={formatTime(n.createdAt)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

const NotificationItem = ({ notification, onClick, icon, time }) => {
  return (
    <div 
      onClick={onClick}
      className={`relative p-4 rounded-xl border flex items-start gap-4 transition-all cursor-pointer hover:bg-dark-850 group ${
        !notification.isRead 
          ? 'bg-dark-900 border-neon-cyan/30 shadow-[0_0_15px_rgba(0,240,255,0.05)]' 
          : 'bg-dark-900/50 border-surface-border opacity-70 hover:opacity-100'
      }`}
    >
      {!notification.isRead && (
        <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00f0ff]"></div>
      )}
      
      <div className="shrink-0 pt-0.5">
        {icon}
      </div>
      
      <div className="flex-1 pr-6">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-white' : 'text-dark-200'}`}>
            {notification.title}
          </h4>
          <span className="text-[10px] text-dark-500 font-medium">{time}</span>
        </div>
        <p className={`text-xs ${!notification.isRead ? 'text-dark-300' : 'text-dark-400'}`}>
          {notification.body}
        </p>
      </div>
    </div>
  );
};

export default InboxPage;
