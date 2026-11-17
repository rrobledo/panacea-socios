import { useEffect, useState } from 'react';
import { Save, Plug, Send, Copy } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  getConfigWhatsapp, guardarConfigWhatsapp, probarConexionWhatsapp, enviarMensajePrueba, getPlantillas,
} from '../../services/whatsappApi';
import { Field, InlineLoader, ErrorState } from '../../components/ui';
import { errorMessage, fmtFechaHora } from './comun';

const SECRETOS = ['access_token', 'app_secret', 'webhook_verify_token'];

const aFormulario = (c) => ({
  ...c,
  access_token: '', app_secret: '', webhook_verify_token: '',
  palabras_baja: (c.palabras_baja || []).join(', '),
  codigos_invalidan: (c.codigos_invalidan || []).join(', '),
  tarifa_marketing: c.tarifas?.marketing ?? '', tarifa_utility: c.tarifas?.utility ?? '',
  tarifa_service: c.tarifas?.service ?? '', moneda: c.tarifas?.moneda || 'USD',
});

const numOrNull = (v) => (v === '' || v == null ? null : Number(v));

const Seccion = ({ titulo, children, ayuda }) => (
  <div className="card" style={{ marginBottom: 20 }}>
    <div className="card-header"><span className="card-title">{titulo}</span></div>
    <div className="card-body">
      {ayuda && <p style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 16 }}>{ayuda}</p>}
      {children}
    </div>
  </div>
);

export const ConfiguracionWhatsappPage = () => {
  const toast = useToast();
  const [config, setConfig] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [prueba, setPrueba] = useState(null); // resultado de probar conexión
  const [probando, setProbando] = useState(false);
  const [plantillas, setPlantillas] = useState([]);
  const [envioPrueba, setEnvioPrueba] = useState({ telefono: '', plantilla_id: '' });
  const [enviando, setEnviando] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    getConfigWhatsapp()
      .then(res => { setConfig(res.data); setForm(aFormulario(res.data)); })
      .catch(err => setError(errorMessage(err, 'No se pudo cargar la configuración.')));
    getPlantillas({ estado: 'APROBADA' }).then(res => setPlantillas(res.data)).catch(() => {});
  }, [version]);

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); setVersion(v => v + 1); }} />;
  if (!form) return <InlineLoader text="Cargando configuración…" />;

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const datos = {
        graph_api_version: form.graph_api_version, phone_number_id: form.phone_number_id || null,
        waba_id: form.waba_id || null, app_id: form.app_id || null, idioma_defecto: form.idioma_defecto,
        prefijo_pais: form.prefijo_pais, numero_prueba: form.numero_prueba || null,
        tamanio_lote: Number(form.tamanio_lote), pausa_lotes_seg: Number(form.pausa_lotes_seg || 0),
        palabras_baja: form.palabras_baja.split(',').map(s => s.trim()).filter(Boolean),
        codigos_invalidan: form.codigos_invalidan.split(',').map(s => Number(s.trim())).filter(n => Number.isInteger(n) && n > 0),
        tarifas: { marketing: numOrNull(form.tarifa_marketing), utility: numOrNull(form.tarifa_utility),
          service: numOrNull(form.tarifa_service), moneda: form.moneda || 'USD' },
        activo: form.activo,
      };
      SECRETOS.forEach(s => { if (form[s].trim()) datos[s] = form[s].trim(); });
      const res = await guardarConfigWhatsapp(datos);
      setConfig(res.data);
      setForm(aFormulario(res.data));
      toast.success('Configuración guardada.');
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo guardar la configuración.'));
    } finally {
      setSaving(false);
    }
  };

  const probar = async () => {
    setProbando(true);
    setPrueba(null);
    try {
      setPrueba((await probarConexionWhatsapp()).data);
    } catch (err) {
      setPrueba({ ok: false, mensaje: errorMessage(err, 'No se pudo probar la conexión.') });
    } finally {
      setProbando(false);
    }
  };

  const enviarPrueba = async () => {
    setEnviando(true);
    try {
      const res = await enviarMensajePrueba({
        telefono: envioPrueba.telefono || null, plantilla_id: envioPrueba.plantilla_id ? Number(envioPrueba.plantilla_id) : null,
      });
      if (res.data.ok) toast.success(`Mensaje enviado a ${res.data.telefono}. Revisá el historial para ver si llegó.`);
      else toast.error(`Meta respondió ${res.data.codigo ?? ''}: ${res.data.mensaje}${res.data.detalle ? ` (${res.data.detalle})` : ''}`);
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo enviar el mensaje de prueba.'));
    } finally {
      setEnviando(false);
    }
  };

  const copiar = (texto) => navigator.clipboard?.writeText(texto).then(() => toast.success('Copiado.'));
  const secreto = (k, label, hint) => (
    <Field label={label} hint={config[`${k}_cargado`] ? `Guardado: ${config[`${k}_final`]} · dejalo vacío para mantenerlo` : hint}>
      <input type="password" className="form-input" autoComplete="new-password" value={form[k]} onChange={set(k)}
        placeholder={config[`${k}_cargado`] ? `••••${config[`${k}_final`]?.slice(1) || ''}` : ''} />
    </Field>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Configuración de WhatsApp</div>
          <div className="page-subtitle">
            Parámetros de la WhatsApp Cloud API de Meta (ver la guía “WhatsApp Cloud API” para obtenerlos)
            {config.actualizado_en && ` · Última modificación ${fmtFechaHora(config.actualizado_en)} por ${config.actualizado_por}`}
          </div>
        </div>
      </div>

      <form onSubmit={guardar} style={{ maxWidth: 860 }}>
        <Seccion titulo="Estado">
          <label className="flex items-center gap-2" style={{ cursor: 'pointer' }}>
            <input type="checkbox" checked={form.activo} onChange={set('activo')} />
            <span className="font-semibold">Envíos de WhatsApp activos</span>
          </label>
          {!form.activo && <div className="alert alert-warning" style={{ marginTop: 12 }}>Con la integración desactivada no se envía ningún mensaje (las campañas en curso quedan detenidas).</div>}
          {!config.configurado && <div className="alert alert-info" style={{ marginTop: 12 }}>Falta cargar el access token, el Phone number ID y el WABA ID.</div>}
        </Seccion>

        <Seccion titulo="Cuenta de Meta" ayuda="Se obtienen en Meta for Developers › tu app › WhatsApp › Configuración de la API. El token debe ser el permanente del usuario del sistema.">
          <div className="grid grid-2">
            {secreto('access_token', 'Access token permanente', 'Token del usuario del sistema (no vence)')}
            {secreto('app_secret', 'App secret', 'Configuración de la app › Básica · se usa para validar el webhook')}
            <Field label="Phone number ID" required><input className="form-input" value={form.phone_number_id || ''} onChange={set('phone_number_id')} /></Field>
            <Field label="WhatsApp Business Account ID (WABA)" required><input className="form-input" value={form.waba_id || ''} onChange={set('waba_id')} /></Field>
            <Field label="App ID"><input className="form-input" value={form.app_id || ''} onChange={set('app_id')} /></Field>
            <Field label="Versión de Graph API" hint="Ej.: v21.0"><input className="form-input" value={form.graph_api_version} onChange={set('graph_api_version')} /></Field>
          </div>
        </Seccion>

        <Seccion titulo="Webhook" ayuda="En Meta › WhatsApp › Configuración › Webhook: cargá esta URL y el token de verificación, y suscribite a “messages” y “message_template_status_update”.">
          <div className="grid grid-2">
            <Field label="URL de devolución de llamada">
              <div className="flex gap-2">
                <input className="form-input" readOnly value={config.webhook_url} />
                <button type="button" className="btn btn-secondary btn-icon" onClick={() => copiar(config.webhook_url)} title="Copiar"><Copy size={15} /></button>
              </div>
            </Field>
            {secreto('webhook_verify_token', 'Token de verificación', 'Una clave que inventás y cargás igual en Meta')}
          </div>
        </Seccion>

        <Seccion titulo="Envío">
          <div className="grid grid-3">
            <Field label="Mensajes por lote" hint="Máximo 500"><input type="number" min={1} max={500} className="form-input" value={form.tamanio_lote} onChange={set('tamanio_lote')} /></Field>
            <Field label="Pausa entre lotes (seg.)" hint="Solo para el envío automático"><input type="number" min={0} max={3600} className="form-input" value={form.pausa_lotes_seg} onChange={set('pausa_lotes_seg')} /></Field>
            <Field label="Idioma de las plantillas"><input className="form-input" value={form.idioma_defecto} onChange={set('idioma_defecto')} /></Field>
            <Field label="Prefijo de país" hint="549 = Argentina (celulares)"><input className="form-input" value={form.prefijo_pais} onChange={set('prefijo_pais')} /></Field>
            <Field label="Número de prueba"><input className="form-input" value={form.numero_prueba || ''} onChange={set('numero_prueba')} placeholder="351 555-1234" /></Field>
            <Field label="Palabras de baja" hint="Separadas por coma"><input className="form-input" value={form.palabras_baja} onChange={set('palabras_baja')} /></Field>
            <Field label="Errores que invalidan el número" hint="Códigos de Meta separados por coma (131026 = no tiene WhatsApp)">
              <input className="form-input" value={form.codigos_invalidan} onChange={set('codigos_invalidan')} />
            </Field>
          </div>
        </Seccion>

        <Seccion titulo="Tarifas (para estimar costos)" ayuda="Precio por mensaje según la categoría, de la tabla de precios de Meta para Argentina. Opcional.">
          <div className="grid grid-4">
            <Field label="Marketing"><input type="number" step="0.0001" min={0} className="form-input" value={form.tarifa_marketing} onChange={set('tarifa_marketing')} /></Field>
            <Field label="Utilidad"><input type="number" step="0.0001" min={0} className="form-input" value={form.tarifa_utility} onChange={set('tarifa_utility')} /></Field>
            <Field label="Servicio"><input type="number" step="0.0001" min={0} className="form-input" value={form.tarifa_service} onChange={set('tarifa_service')} /></Field>
            <Field label="Moneda"><input className="form-input" maxLength={5} value={form.moneda} onChange={set('moneda')} /></Field>
          </div>
        </Seccion>

        <div className="flex justify-end" style={{ marginBottom: 32 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}><Save size={15} /> {saving ? 'Guardando…' : 'Guardar configuración'}</button>
        </div>
      </form>

      <div className="grid grid-2" style={{ maxWidth: 860 }}>
        <Seccion titulo="Probar conexión" ayuda="Consulta los datos del número en Meta con la configuración guardada.">
          <button className="btn btn-secondary" onClick={probar} disabled={probando}><Plug size={15} /> {probando ? 'Probando…' : 'Probar conexión'}</button>
          {prueba && (prueba.ok ? (
            <div className="alert alert-success" style={{ marginTop: 12, display: 'block' }}>
              <div><b>{prueba.verified_name}</b> · {prueba.display_phone_number}</div>
              <div>Calidad: {prueba.quality_rating || '—'}{prueba.messaging_limit_tier ? ` · Límite: ${prueba.messaging_limit_tier}` : ''}</div>
            </div>
          ) : (
            <div className="alert alert-danger" style={{ marginTop: 12 }}>
              {prueba.codigo ? `Error ${prueba.codigo}: ` : ''}{prueba.mensaje}{prueba.detalle ? ` (${prueba.detalle})` : ''}
            </div>
          ))}
        </Seccion>
        <Seccion titulo="Mensaje de prueba" ayuda="Sin plantilla se envía hello_world (en inglés).">
          <Field label="Teléfono" hint="Vacío = número de prueba"><input className="form-input" value={envioPrueba.telefono} onChange={e => setEnvioPrueba(p => ({ ...p, telefono: e.target.value }))} /></Field>
          <Field label="Plantilla">
            <select className="form-select" value={envioPrueba.plantilla_id} onChange={e => setEnvioPrueba(p => ({ ...p, plantilla_id: e.target.value }))}>
              <option value="">hello_world</option>
              {plantillas.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Field>
          <button className="btn btn-secondary" onClick={enviarPrueba} disabled={enviando}><Send size={15} /> {enviando ? 'Enviando…' : 'Enviar prueba'}</button>
        </Seccion>
      </div>
    </div>
  );
};
