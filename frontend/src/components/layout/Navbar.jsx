import { useState } from 'react';
import { Link, useNavigate, NavLink as RNavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { HiMenu, HiX, HiChevronDown, HiLogout, HiViewGrid, HiMail, HiOutlineGlobe, HiOutlineStar, HiOutlineShoppingBag, HiLightningBolt } from 'react-icons/hi';
import { SiGamejolt } from 'react-icons/si';

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { unreadCount } = useSocket();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setProfileOpen(false);
  };

  const getDashboardLink = () => {
    if (!user) return '/dashboard';
    switch (user.role) {
      case 'admin': return '/admin';
      case 'organizer': return '/organizer';
      default: return '/dashboard';
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 group">
            <div className="w-8 h-8 bg-gradient-to-br from-neon-cyan to-primary-600 rounded-lg flex items-center justify-center group-hover:shadow-lg group-hover:shadow-neon-cyan/20 transition-all">
              <SiGamejolt className="text-white text-lg" />
            </div>
            <span className="text-xl font-display font-bold text-white">
              Scrim<span className="text-neon-cyan">X</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1 ml-8">
            <NavLink to="/marketplace" icon={<HiOutlineShoppingBag />}>Marketplace</NavLink>
            <NavLink to="/tournaments" icon={<HiOutlineGlobe />}>View Tournaments</NavLink>
            <NavLink to="/leaderboard" icon={<HiOutlineStar />}>Leaderboard</NavLink>
            <NavLink to="/weekly-leaderboard" icon={<HiLightningBolt />}>Weekly LB</NavLink>
          </div>

          {/* Right side */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-neon-purple flex items-center justify-center text-sm font-bold text-white">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-sm font-medium text-gray-200">{user?.username}</span>
                  <HiChevronDown className={`text-gray-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                </button>

                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 mt-2 w-56 bg-dark-850 border border-surface-border rounded-xl shadow-2xl z-50 py-2 animate-slide-down">
                      <div className="px-4 py-2 border-b border-surface-border">
                        <p className="text-sm font-semibold text-white">{user?.username}</p>
                        <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                      </div>
                      <DropdownLink to={getDashboardLink()} icon={<HiViewGrid />} onClick={() => setProfileOpen(false)}>
                        Dashboard
                      </DropdownLink>
                      <DropdownLink to={`${getDashboardLink()}/inbox`} icon={<HiMail />} onClick={() => setProfileOpen(false)}>
                        <div className="flex items-center justify-between w-full">
                          <span>Inbox</span>
                          {unreadCount > 0 && (
                            <span className="bg-neon-cyan text-dark-950 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                          )}
                        </div>
                      </DropdownLink>
                      <div className="border-t border-surface-border mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <HiLogout />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="btn-ghost text-sm px-4 py-2">
                  Login
                </Link>
                <Link to="/register" className="btn-neon text-sm px-4 py-2">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            {mobileOpen ? <HiX className="text-xl" /> : <HiMenu className="text-xl" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-dark-900 border-t border-surface-border animate-slide-down">
          <div className="px-4 py-3 space-y-1">
            <MobileNavLink to="/marketplace" onClick={() => setMobileOpen(false)}>Marketplace</MobileNavLink>
            <MobileNavLink to="/tournaments" onClick={() => setMobileOpen(false)}>Tournaments</MobileNavLink>
            <MobileNavLink to="/leaderboard" onClick={() => setMobileOpen(false)}>Leaderboard</MobileNavLink>
            <MobileNavLink to="/weekly-leaderboard" onClick={() => setMobileOpen(false)}>Weekly LB</MobileNavLink>
            <div className="border-t border-surface-border pt-2 mt-2">
              {isAuthenticated ? (
                <>
                  <MobileNavLink to={getDashboardLink()} onClick={() => setMobileOpen(false)}>Dashboard</MobileNavLink>
                  <button
                    onClick={() => { handleLogout(); setMobileOpen(false); }}
                    className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <div className="flex space-x-2 pt-2">
                  <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-ghost text-sm flex-1 text-center">Login</Link>
                  <Link to="/register" onClick={() => setMobileOpen(false)} className="btn-neon text-sm flex-1 text-center">Sign Up</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

const NavLink = ({ to, icon, children }) => (
  <RNavLink
    to={to}
    className={({ isActive }) =>
      `flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all ${
        isActive
          ? 'text-neon-cyan bg-white/5'
          : 'text-gray-300 hover:text-neon-cyan hover:bg-white/5'
      }`
    }
  >
    {icon && <span className="text-lg">{icon}</span>}
    {children}
  </RNavLink>
);

const MobileNavLink = ({ to, children, onClick }) => (
  <RNavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `block px-4 py-2 text-sm rounded-lg transition-colors ${
        isActive
          ? 'text-neon-cyan bg-white/5 font-semibold'
          : 'text-gray-300 hover:text-white hover:bg-white/5'
      }`
    }
  >
    {children}
  </RNavLink>
);

const DropdownLink = ({ to, icon, children, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
  >
    <span className="text-gray-400">{icon}</span>
    <span>{children}</span>
  </Link>
);

export default Navbar;
