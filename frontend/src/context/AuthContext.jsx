import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('scrimx_token'));

  const loadUser = useCallback(async () => {
    try {
      if (!token) {
        setLoading(false);
        return;
      }
      const data = await api.get('/auth/me');
      setUser(data.user);
    } catch (err) {
      localStorage.removeItem('scrimx_token');
      localStorage.removeItem('scrimx_user');
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (email, password) => {
    const data = await api.post('/auth/login', { email, password });
    localStorage.setItem('scrimx_token', data.token);
    localStorage.setItem('scrimx_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    toast.success('Welcome back!');
    return data.user;
  };

  const adminLogin = async (password) => {
    const data = await api.post('/auth/admin-login', { password });
    localStorage.setItem('scrimx_token', data.token);
    localStorage.setItem('scrimx_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    toast.success('Admin login successful!');
    return data.user;
  };

  const register = async (username, email, password, role) => {
    const data = await api.post('/auth/register', { username, email, password, role });
    localStorage.setItem('scrimx_token', data.token);
    localStorage.setItem('scrimx_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    toast.success('Account created successfully!');
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('scrimx_token');
    localStorage.removeItem('scrimx_user');
    setToken(null);
    setUser(null);
    toast.success('Logged out');
  };

  const updateUser = (updatedUser) => {
    if (!updatedUser) {
      console.warn('updateUser called with undefined/null user!');
      return;
    }
    setUser(updatedUser);
    localStorage.setItem('scrimx_user', JSON.stringify(updatedUser));
  };

  const value = {
    user,
    token,
    loading,
    login,
    adminLogin,
    register,
    logout,
    updateUser,
    loadUser,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isOrganizer: user?.role === 'organizer',
    isPlayer: user?.role === 'player',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
