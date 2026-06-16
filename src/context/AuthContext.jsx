import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem('auth_token'));

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/auth/profile');
      setUser(res.data);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: t, user: u } = res.data;
    setToken(t);
    setUser(u);
    localStorage.setItem('auth_token', t);
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    return u;
  };

  const loginWithGoogle = () => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${baseUrl}/auth/google`;
  };

  const loginWithGithub = () => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${baseUrl}/auth/github`;
  };

  const loginWithMicrosoft = () => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    window.location.href = `${baseUrl}/auth/microsoft`;
  };

  // Called from /auth/callback route with ?token=xxx
  const handleOAuthCallback = useCallback((t) => {
    setToken(t);
    localStorage.setItem('auth_token', t);
    api.defaults.headers.common['Authorization'] = `Bearer ${t}`;
    fetchProfile();
  }, []);

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    delete api.defaults.headers.common['Authorization'];
  };

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider value={{
      user, token, loading,
      login, loginWithGoogle, loginWithGithub, loginWithMicrosoft,
      handleOAuthCallback, logout, updateUser,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
