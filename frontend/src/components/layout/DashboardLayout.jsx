import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { SiGamejolt } from 'react-icons/si';
import {
  HiHome, HiCollection, HiUsers, HiCurrencyDollar, HiCog,
  HiChartBar, HiClipboardList, HiShieldCheck, HiTicket,
  HiLogout, HiMenuAlt2, HiX, HiCalendar, HiStar,
  HiUserGroup, HiCash, HiViewGrid, HiFlag, HiSupport, HiUser, HiLightningBolt, HiMail, HiChevronDown, HiChevronUp, HiFire
} from 'react-icons/hi';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const { unreadCount } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [moreExpanded, setMoreExpanded] = useState(false);
  const [localUnreadCount, setLocalUnreadCount] = useState(0);

  const { socket } = useSocket();

  useEffect(() => {
    if (!user) return;
    const fetchNotifs = async () => {
      try {
        const { notifications } = await api.get('/notifications');
        const unread = notifications.filter(n => !n.isRead).length;
        setLocalUnreadCount(unread);
      } catch (err) {}
    };
    fetchNotifs();

    if (socket) {
      const handleNewNotif = (notif) => {
        setLocalUnreadCount(prev => prev + 1);
        toast(notif.title, { icon: '🔔', duration: 4000 });
      };
      socket.on('new_notification', handleNewNotif);
      return () => socket.off('new_notification', handleNewNotif);
    }
  }, [socket, user]);

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', next.toString());
      return next;
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const base = user?.role === 'admin' ? '/admin' : user?.role === 'organizer' ? '/organizer' : '/dashboard';

  const checkIsActive = (linkPath) => {
    const cleanPath = linkPath.split('?')[0];
    if (cleanPath === base) {
      return location.pathname === cleanPath || location.pathname === `${cleanPath}/`;
    }
    return location.pathname.startsWith(cleanPath);
  };

  const getSidebarLinks = () => {
    if (user?.role === 'player') {
      return {
        primary: [
          { icon: <HiHome />, label: 'Overview', path: base },
          { icon: <HiMail />, label: 'Inbox', path: `${base}/inbox`, badge: localUnreadCount },
          { icon: <HiCollection />, label: 'My Scrims', path: `${base}/scrims` },
          { icon: <HiFlag />, label: 'My Tournaments', path: `${base}/tournaments` },
          { icon: <HiUserGroup />, label: 'My Teams', path: `${base}/teams` },
          { icon: <HiChartBar />, label: 'My Stats', path: `${base}/stats` },
          { icon: <HiStar />, label: 'Leaderboard', path: '/leaderboard' },
          { icon: <HiUser />, label: 'Profile', path: `${base}/profile` },
        ],
        more: [
          { icon: <HiClipboardList />, label: 'My Requests', path: `${base}/requests` },
          { icon: <HiMail />, label: 'Team Invites', path: `${base}/invites` },
          { icon: <HiUserGroup />, label: 'Find a Team', path: `${base}/teams/find` },
          { icon: <HiViewGrid />, label: 'Marketplace', path: '/marketplace' },
        ]
      };
    }

    const commonLinks = [
      { icon: <HiHome />, label: 'Overview', path: base },
    ];

    if (user?.role === 'organizer') {
      return {
        primary: [
          ...commonLinks,
          { icon: <HiMail />, label: 'Inbox', path: `${base}/inbox`, badge: localUnreadCount },
          { icon: <HiClipboardList />, label: 'Slot Requests', path: `${base}/slot-requests` },
          { icon: <HiFlag />, label: 'Tournaments', path: `${base}/tournaments` },
          { icon: <HiCurrencyDollar />, label: 'Points Wallet', path: `${base}/points` },
          { icon: <HiViewGrid />, label: 'Marketplace', path: '/marketplace' },
          { icon: <HiCalendar />, label: 'My Hosted Scrims', path: `${base}/scrims` },
          { icon: <HiChartBar />, label: 'Analytics', path: `${base}/analytics` },
          { icon: <HiStar />, label: 'Plans', path: `${base}/plans` },
          { icon: <HiUser />, label: 'Profile', path: `${base}/profile` },
          { icon: <HiSupport />, label: 'Support', path: `${base}/support` },
        ],
        more: []
      };
    }

    if (user?.role === 'admin') {
      return {
        primary: [
          ...commonLinks,
          { icon: <HiMail />, label: 'Inbox', path: `${base}/inbox`, badge: localUnreadCount },
          { icon: <HiCurrencyDollar />, label: 'Point Requests', path: `${base}/point-requests` },
          { icon: <HiStar />, label: 'Plan Requests', path: `${base}/plan-requests` },
          { icon: <HiFire />, label: 'Boosts', path: `${base}/boosts` },
          { icon: <HiUsers />, label: 'Users', path: `${base}/users` },
          { icon: <HiCollection />, label: 'Scrims', path: `${base}/scrims` },
          { icon: <HiShieldCheck />, label: 'Moderation', path: `${base}/moderation` },
          { icon: <HiSupport />, label: 'Disputes', path: `${base}/disputes` },
          { icon: <HiChartBar />, label: 'Analytics', path: `${base}/analytics` },
          { icon: <HiCog />, label: 'Settings', path: `${base}/settings` },
        ],
        more: []
      };
    }

    return { primary: commonLinks, more: [] };
  };

  const linksData = getSidebarLinks();
  const allLinks = [...linksData.primary, ...linksData.more];
  
  const currentLink = allLinks.find(l => checkIsActive(l.path));
  const pageTitle = currentLink?.label || 'Dashboard';

  const renderLink = (link) => {
    const isActive = checkIsActive(link.path);
    return (
      <NavLink
        key={link.path}
        to={link.path}
        onClick={() => setSidebarOpen(false)}
        title={isCollapsed ? link.label : ''}
        className={`flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
          isActive
            ? 'bg-neon-cyan/10 text-neon-cyan font-semibold border border-neon-cyan/20'
            : 'text-dark-300 hover:text-white hover:bg-dark-800'
        } ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
      >
        <span className="text-lg shrink-0">{link.icon}</span>
        {!isCollapsed && <span className="flex-1 truncate">{link.label}</span>}
        {!isCollapsed && link.badge !== undefined && link.badge > 0 && (
          <span className="bg-neon-cyan text-dark-950 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0">
            {link.badge > 99 ? '99+' : link.badge}
          </span>
        )}
        {isCollapsed && link.badge !== undefined && link.badge > 0 && (
          <span className="absolute right-1 top-1 w-2.5 h-2.5 bg-neon-cyan rounded-full border border-dark-900" />
        )}
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-dark-950 flex overflow-x-hidden">
      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 bottom-0 bg-dark-900 border-r border-surface-border z-50
        transform transition-all duration-300 ease-in-out lg:translate-x-0 lg:static flex flex-col
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isCollapsed ? 'w-20' : 'w-64'}
      `}>
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-surface-border shrink-0">
          <NavLink to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 shrink-0 bg-gradient-to-br from-neon-cyan to-primary-600 rounded-lg flex items-center justify-center">
              <SiGamejolt className="text-white text-lg" />
            </div>
            {!isCollapsed && (
              <span className="text-lg font-display font-bold text-white whitespace-nowrap overflow-hidden">
                Scrim<span className="text-neon-cyan">X</span>
              </span>
            )}
          </NavLink>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 hover:bg-white/5 rounded shrink-0">
            <HiX className="text-lg text-gray-400" />
          </button>
          {!sidebarOpen && (
            <button onClick={toggleCollapse} className="hidden lg:block p-1 hover:bg-white/5 rounded text-dark-400 hover:text-white shrink-0 ml-auto">
              <HiMenuAlt2 className="text-lg" />
            </button>
          )}
        </div>

        {/* User info */}
        <div className="px-4 py-4 border-b border-surface-border shrink-0">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-primary-500 to-neon-purple flex items-center justify-center text-sm font-bold text-white" title={user?.username}>
              {user?.username?.[0]?.toUpperCase() || 'U'}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
                <p className="text-xs text-neon-cyan capitalize truncate">{user?.role}</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto custom-scrollbar flex flex-col gap-1">
          {linksData.primary.map(renderLink)}

          {linksData.more.length > 0 && (
            <>
              {!isCollapsed && (
                <div className="mt-4 mb-2 px-3 flex items-center justify-between text-xs font-semibold text-dark-500 uppercase tracking-wider cursor-pointer hover:text-dark-300 transition-colors" onClick={() => setMoreExpanded(!moreExpanded)}>
                  <span>More Options</span>
                  {moreExpanded ? <HiChevronUp /> : <HiChevronDown />}
                </div>
              )}
              {(moreExpanded || isCollapsed) && (
                <div className="flex flex-col gap-1 mt-1">
                  {linksData.more.map(renderLink)}
                </div>
              )}
            </>
          )}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-surface-border shrink-0">
          <button
            onClick={handleLogout}
            title={isCollapsed ? 'Logout' : ''}
            className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all ${isCollapsed ? 'justify-center' : 'space-x-3'}`}
          >
            <HiLogout className="text-lg shrink-0" />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-dark-900/50 backdrop-blur-sm border-b border-surface-border flex items-center px-4 lg:px-6 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 hover:bg-white/5 rounded-lg mr-2"
          >
            <HiMenuAlt2 className="text-xl text-gray-300" />
          </button>
          
          <span className="text-sm font-semibold text-white ml-2 lg:ml-0">
            {pageTitle}
          </span>
          
          <div className="flex-1" />
          <div className="flex items-center space-x-2">
            <span className="text-xs text-dark-400 hidden sm:block capitalize">{user?.role} Dashboard</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-x-hidden pb-20 md:pb-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-dark-900/95 backdrop-blur border-t border-surface-border flex items-center justify-around px-2 py-2 safe-area-inset-bottom pb-4">
          {user?.role === 'player' ? (
            <>
              <NavLink to="/dashboard" end className={({isActive}) => `flex flex-col items-center justify-center w-full py-1 ${isActive ? 'text-neon-cyan border-t-2 border-neon-cyan -mt-[2px]' : 'text-dark-500'}`}><HiHome className="text-2xl" /><span className="text-[10px] mt-1">Home</span></NavLink>
              <NavLink to="/dashboard/scrims" className={({isActive}) => `flex flex-col items-center justify-center w-full py-1 ${isActive ? 'text-neon-cyan border-t-2 border-neon-cyan -mt-[2px]' : 'text-dark-500'}`}><HiCollection className="text-2xl" /><span className="text-[10px] mt-1">Scrims</span></NavLink>
              <NavLink to="/dashboard/teams" className={({isActive}) => `flex flex-col items-center justify-center w-full py-1 ${isActive ? 'text-neon-cyan border-t-2 border-neon-cyan -mt-[2px]' : 'text-dark-500'}`}><HiUserGroup className="text-2xl" /><span className="text-[10px] mt-1">Teams</span></NavLink>
              <NavLink to="/leaderboard" className={({isActive}) => `flex flex-col items-center justify-center w-full py-1 ${isActive ? 'text-neon-cyan border-t-2 border-neon-cyan -mt-[2px]' : 'text-dark-500'}`}><HiStar className="text-2xl" /><span className="text-[10px] mt-1">Rank</span></NavLink>
              <NavLink to="/dashboard/profile" className={({isActive}) => `flex flex-col items-center justify-center w-full py-1 ${isActive ? 'text-neon-cyan border-t-2 border-neon-cyan -mt-[2px]' : 'text-dark-500'}`}><HiUser className="text-2xl" /><span className="text-[10px] mt-1">Profile</span></NavLink>
            </>
          ) : user?.role === 'organizer' ? (
            <>
              <NavLink to="/organizer" end className={({isActive}) => `flex flex-col items-center justify-center w-full py-1 ${isActive ? 'text-neon-cyan border-t-2 border-neon-cyan -mt-[2px]' : 'text-dark-500'}`}><HiHome className="text-2xl" /><span className="text-[10px] mt-1">Home</span></NavLink>
              <NavLink to="/organizer/scrims" className={({isActive}) => `flex flex-col items-center justify-center w-full py-1 ${isActive ? 'text-neon-cyan border-t-2 border-neon-cyan -mt-[2px]' : 'text-dark-500'}`}><HiClipboardList className="text-2xl" /><span className="text-[10px] mt-1">Scrims</span></NavLink>
              <NavLink to="/organizer/slot-requests" className={({isActive}) => `flex flex-col items-center justify-center w-full py-1 ${isActive ? 'text-neon-cyan border-t-2 border-neon-cyan -mt-[2px]' : 'text-dark-500'}`}><HiMail className="text-2xl" /><span className="text-[10px] mt-1">Requests</span></NavLink>
              <NavLink to="/organizer/points" className={({isActive}) => `flex flex-col items-center justify-center w-full py-1 ${isActive ? 'text-neon-cyan border-t-2 border-neon-cyan -mt-[2px]' : 'text-dark-500'}`}><HiCurrencyDollar className="text-2xl" /><span className="text-[10px] mt-1">Earnings</span></NavLink>
              <NavLink to="/organizer/profile" className={({isActive}) => `flex flex-col items-center justify-center w-full py-1 ${isActive ? 'text-neon-cyan border-t-2 border-neon-cyan -mt-[2px]' : 'text-dark-500'}`}><HiUser className="text-2xl" /><span className="text-[10px] mt-1">Profile</span></NavLink>
            </>
          ) : null}
      </div>
    </div>
  );
};

export default DashboardLayout;
