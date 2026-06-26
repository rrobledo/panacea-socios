import axios from 'axios';

const client = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_API_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use(config => {
  try {
    const stored = localStorage.getItem('panacea_auth');
    if (stored) {
      const { access_token } = JSON.parse(stored);
      if (access_token) config.headers.Authorization = `Bearer ${access_token}`;
    }
  } catch {}
  return config;
});

client.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('panacea_auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const buscarPorDni = (dni) =>
  client.get('/socios/', { params: { dni } });

export const buscarPorNombre = (nombre) =>
  client.get('/socios/', { params: { name: nombre.normalize('NFD').replace(/[̀-ͯ]/g, '') } });

export const registrarVenta = (data) =>
  client.post('/ventas/', data);
