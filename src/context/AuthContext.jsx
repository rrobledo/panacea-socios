import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const ALLOWED_EMAILS = [
  'raul.osvaldo.robledo@gmail.com',
  'panacea.bakeryglutenfree@gmail.com',
];

const STORAGE_KEY = 'panacea_user';

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

  const handleGoogleCredential = useCallback(({ credential }) => {
    setAuthError(null);
    const payload = decodeJwt(credential);
    if (!payload) {
      setAuthError('Token de Google inválido.');
      return;
    }
    const { email, name, picture } = payload;
    if (!ALLOWED_EMAILS.includes(email)) {
      setAuthError(`Acceso no autorizado para ${email}.`);
      if (window.google) window.google.accounts.id.revoke(email, () => {});
      return;
    }
    const u = { email, name, picture };
    setUser(u);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
  }, []);

  const initGoogleSignIn = useCallback((element) => {
    if (!window.google) return;
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: false,
    });
    window.google.accounts.id.renderButton(element, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'signin_with',
      locale: 'es',
      width: 320,
    });
  }, [handleGoogleCredential]);

  const logout = useCallback(() => {
    if (window.google && user?.email) {
      window.google.accounts.id.revoke(user.email, () => {});
    }
    setUser(null);
    setAuthError(null);
    localStorage.removeItem(STORAGE_KEY);
  }, [user]);

  return (
    <AuthContext.Provider value={{
      user, loading, authError,
      isAuthenticated: !!user,
      initGoogleSignIn, logout,
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
