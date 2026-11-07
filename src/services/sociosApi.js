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

// Incluye `saldo_puntos` (saldo actual de puntos del socio)
export const getSocio = (id) =>
  client.get(`/socios/${id}`);

export const buscarPorDni = (dni) =>
  client.get('/socios/', { params: { dni } });

export const buscarPorNombre = (nombre) =>
  client.get('/socios/', { params: { name: nombre.normalize('NFD').replace(/[̀-ͯ]/g, '') } });

// data puede incluir `cupon_codigo` o `beneficio_id` (excluyentes: un solo beneficio por compra).
// En ambos casos `importe` es el monto antes del descuento y el backend registra el neto.
// Con `beneficio_id` el backend descuenta los puntos del beneficio en la misma operación.
// Respuesta: venta + { descuento, puntos_generados, puntos_canjeados, saldo_puntos }
// 409 { detail: { code, message } }: CUPON_INVALIDO, SALDO_INSUFICIENTE, LIMITE_ALCANZADO, SIN_STOCK, …
export const registrarVenta = (data) =>
  client.post('/ventas/', data);

// Beneficios que el socio puede usar en el mostrador.
// Respuesta: { socio_id, saldo_puntos, beneficios: [{ id, nombre, costo_puntos, porcentaje_descuento,
//   tope_descuento, usable, motivo, descuento_estimado }] }
export const getBeneficiosDisponibles = (socioId, importe) =>
  client.get('/ventas/beneficios-disponibles', {
    params: { socio_id: socioId, ...(importe > 0 ? { importe } : {}) },
  });

// Valida un cupón sin consumirlo. Respuesta: { valido, descuento, porcentaje_descuento, motivo }
export const validarCupon = (codigo, socioId, monto) =>
  client.get(`/canjes/${encodeURIComponent(codigo.trim())}`, { params: { socio_id: socioId, monto } });

export const getVentas = (socioId) =>
  client.get('/ventas/', { params: { socio_id: socioId } });

export const getVentaDetail = (ventaId) =>
  client.get(`/ventas/${ventaId}/detail`);

export const getRankingCompras = (params) =>
  client.get('/reportes/ranking_compras', { params });

// `lugar` opcional en los reportes: vacío = todas las sucursales.
export const getCumpleanios = (desde, hasta, lugar) =>
  client.get('/reportes/cumpleanios', { params: { desde, hasta, lugar: lugar || undefined } });

// ── Preferencias (perfil de gustos generado con IA, se actualiza a diario) ───
// 404 { detail: { code: 'PERFIL_NO_DISPONIBLE' } } si todavía no se generó.
export const getPreferenciasSocio = (socioId) =>
  client.get(`/socios/${socioId}/preferencias`);

// Respuesta: [{ socio_id, nombre_apellido, dni, telefono, email, relevancia,
//   coincidencias: [{ campo: 'etiqueta'|'producto'|'categoria'|'resumen', valor }], perfil_generado_en }]
export const buscarSociosPorPreferencia = ({ q, incluirResumen = false, lugar, skip = 0, limit = 100 }) =>
  client.get('/reportes/preferencias', { params: { q, incluir_resumen: incluirResumen, lugar: lugar || undefined, skip, limit } });

// Respuesta: [{ etiqueta, socios }] ordenado por cantidad de socios
export const getEtiquetasPreferencias = (lugar) =>
  client.get('/reportes/preferencias/etiquetas', { params: { lugar: lugar || undefined } });

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
