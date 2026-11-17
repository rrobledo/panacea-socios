import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { getMe } from '../services/sociosApi';

// Consulta /socios/me una vez por sesión (por token) para saber si el usuario es admin.
// Es solo para mostrar u ocultar opciones: el backend valida el rol en cada endpoint.
const cache = new Map();

export const useEsAdmin = () => {
  const { user } = useAuth();
  const token = user?.access_token;
  const [respuesta, setRespuesta] = useState({ token: null, esAdmin: null });

  useEffect(() => {
    if (!token || cache.has(token)) return;
    let vivo = true;
    getMe()
      .then(res => { cache.set(token, !!res.data.es_admin); if (vivo) setRespuesta({ token, esAdmin: !!res.data.es_admin }); })
      .catch(() => { if (vivo) setRespuesta({ token, esAdmin: false }); });
    return () => { vivo = false; };
  }, [token]);

  if (!token) return false;
  if (cache.has(token)) return cache.get(token);
  return respuesta.token === token ? respuesta.esAdmin : null; // null mientras carga
};
