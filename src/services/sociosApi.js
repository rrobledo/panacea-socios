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

// data puede incluir `cupon_codigo` (un solo cupón por compra). En ese caso `importe` es el
// monto antes del descuento y el backend registra el neto.
// Respuesta: venta + { descuento, puntos_generados } · 409 { detail: { code: 'CUPON_INVALIDO', message } }
export const registrarVenta = (data) =>
  client.post('/ventas/', data);

// Valida un cupón sin consumirlo. Respuesta: { valido, descuento, porcentaje_descuento, motivo }
export const validarCupon = (codigo, socioId, monto) =>
  client.get(`/canjes/${encodeURIComponent(codigo.trim())}`, { params: { socio_id: socioId, monto } });

export const getVentas = (socioId) =>
  client.get('/ventas/', { params: { socio_id: socioId } });

export const getVentaDetail = (ventaId) =>
  client.get(`/ventas/${ventaId}/detail`);

export const getRankingCompras = (params) =>
  client.get('/reportes/ranking_compras', { params });

export const getCumpleanios = (desde, hasta) =>
  client.get('/reportes/cumpleanios', { params: { desde, hasta } });

// ── Maestro: sistema de puntos (requiere admin) ───────────────────────────
// Configuración: { meses_expiracion_puntos, costo_juego_maquina, programa_activo }
export const getConfiguracionPuntos = () => client.get('/admin/configuracion');
export const updateConfiguracionPuntos = (data) => client.put('/admin/configuracion', data);

// Reglas de conversión: versionadas por vigencia, no se editan; solo se borran las programadas a futuro.
export const getReglasPuntos = () => client.get('/admin/reglas-puntos');
export const crearReglaPuntos = (data) => client.post('/admin/reglas-puntos', data);
export const eliminarReglaPuntos = (id) => client.delete(`/admin/reglas-puntos/${id}`);

export const getBeneficios = () => client.get('/admin/beneficios');
export const crearBeneficio = (data) => client.post('/admin/beneficios', data);
export const actualizarBeneficio = (id, data) => client.put(`/admin/beneficios/${id}`, data);
