import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEY = 'panacea_auth';
const BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL;

const decodeJwt = (token) => {
  try {
    return JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const loginWithGoogle = useCallback(() => {
    window.location.href = `${BACKEND_URL}/auth/google`;
  }, []);

  const loginWithCredentials = useCallback(async (email, password) => {
    setAuthError(null);
    const body = new URLSearchParams({ username: email, password });
    const res = await fetch(`${BACKEND_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail || 'Credenciales incorrectas.');
    }
    const { access_token, socio_id } = await res.json();
    const payload = decodeJwt(access_token);
    const auth = { access_token, socio_id, email: payload?.email ?? email };
    setUser(auth);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  }, []);

  const handleOAuthCallback = useCallback((token, socio_id) => {
    setAuthError(null);
    const payload = decodeJwt(token);
    if (!payload) {
      setAuthError('Token inválido.');
      return;
    }
    const auth = {
      access_token: token,
      socio_id: socio_id ?? payload.sub,
      email: payload.email,
    };
    setUser(auth);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setAuthError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, authError,
      isAuthenticated: !!user,
      loginWithGoogle, loginWithCredentials, handleOAuthCallback, logout,
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
