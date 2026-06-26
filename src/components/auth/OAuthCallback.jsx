import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './auth.css';

export const OAuthCallback = () => {
  const { handleOAuthCallback } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    const error = params.get('error');

    if (error) {
      navigate('/login?error=' + encodeURIComponent(error));
      return;
    }

    if (token) {
      const socio_id = params.get('socio_id');
      handleOAuthCallback(token, socio_id ? Number(socio_id) : null);
      navigate('/');
    } else {
      navigate('/login');
    }
  }, []);

  return (
    <div className="oauth-callback">
      <div className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
      <p>Completing sign in…</p>
    </div>
  );
};
