// API de campañas de WhatsApp (todo requiere un usuario admin)
import { client } from './sociosApi';

// ── Configuración ─────────────────────────────────────────────────────────
export const getConfigWhatsapp = () => client.get('/whatsapp/configuracion');
export const guardarConfigWhatsapp = (data) => client.put('/whatsapp/configuracion', data);
export const probarConexionWhatsapp = () => client.post('/whatsapp/configuracion/probar');
export const enviarMensajePrueba = (data) => client.post('/whatsapp/configuracion/mensaje-prueba', data, { timeout: 30000 });

// ── Plantillas ────────────────────────────────────────────────────────────
export const getCamposPlantilla = () => client.get('/whatsapp/plantillas/campos');
export const getPlantillas = (params) => client.get('/whatsapp/plantillas', { params });
export const getPlantilla = (id) => client.get(`/whatsapp/plantillas/${id}`);
export const crearPlantilla = (data) => client.post('/whatsapp/plantillas', data);
export const actualizarPlantilla = (id, data) => client.put(`/whatsapp/plantillas/${id}`, data);
export const copiarPlantilla = (id) => client.post(`/whatsapp/plantillas/${id}/copiar`);
export const eliminarPlantilla = (id) => client.delete(`/whatsapp/plantillas/${id}`);
export const vistaPreviaPlantilla = (id, data) => client.post(`/whatsapp/plantillas/${id}/vista-previa`, data);
export const enviarAprobacionPlantilla = (id) => client.post(`/whatsapp/plantillas/${id}/enviar-aprobacion`, null, { timeout: 30000 });
export const sincronizarPlantillas = () => client.post('/whatsapp/plantillas/sincronizar', null, { timeout: 60000 });

// ── Campañas ──────────────────────────────────────────────────────────────
export const getCampanias = (params) => client.get('/whatsapp/campanias', { params });
export const getCampania = (id) => client.get(`/whatsapp/campanias/${id}`);
export const crearCampania = (data) => client.post('/whatsapp/campanias', data);
export const actualizarCampania = (id, data) => client.put(`/whatsapp/campanias/${id}`, data);
export const audienciaPrevia = (data) => client.post('/whatsapp/campanias/audiencia-previa', data, { timeout: 60000 });
export const enviarCampania = (id, data = {}) => client.post(`/whatsapp/campanias/${id}/enviar`, data, { timeout: 60000 });
export const procesarCampania = (id) => client.post(`/whatsapp/campanias/${id}/procesar`, null, { timeout: 60000 });
export const accionCampania = (id, accion) => client.post(`/whatsapp/campanias/${id}/${accion}`);
export const getMensajesCampania = (id, params) => client.get(`/whatsapp/campanias/${id}/mensajes`, { params });
export const envioMasivo = (data) => client.post('/whatsapp/envios-masivos', data, { timeout: 60000 });

// ── Mensajes y reportes ───────────────────────────────────────────────────
export const getMensajesWhatsapp = (params) => client.get('/whatsapp/mensajes', { params });
export const getResumenWhatsapp = (params) => client.get('/whatsapp/reportes/resumen', { params });
export const getNoContactables = (params) => client.get('/whatsapp/reportes/socios-no-contactables', { params });
export const cambiarEstadoWhatsappSocio = (socioId, data) => client.put(`/whatsapp/socios/${socioId}/estado`, data);
