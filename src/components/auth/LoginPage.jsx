import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './auth.css';

export const LoginPage = () => {
  const { isAuthenticated, initGoogleSignIn, authError } = useAuth();
  const navigate = useNavigate();
  const btnRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated) navigate('/', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const tryRender = () => {
      if (window.google && btnRef.current) {
        clearInterval(intervalRef.current);
        initGoogleSignIn(btnRef.current);
      }
    };
    intervalRef.current = setInterval(tryRender, 100);
    tryRender();
    return () => clearInterval(intervalRef.current);
  }, [initGoogleSignIn]);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="logo-icon" style={{ width: 56, height: 56, fontSize: 26, borderRadius: 14 }}>P</div>
          <h1>Panacea Socios</h1>
        </div>

        <h2 className="auth-title">Iniciar sesión</h2>
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--gray-500)', marginBottom: 24 }}>
          Ingresá con tu cuenta de Google autorizada
        </p>

        {authError && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            {authError}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div ref={btnRef} />
        </div>
      </div>
    </div>
  );
};
