import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Pause, Play, XCircle, Send, Download, RefreshCw } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  getCampania, getMensajesCampania, accionCampania, procesarCampania, enviarCampania,
} from '../../services/whatsappApi';
import { ConfirmDialog, ErrorState, InlineLoader, Select } from '../../components/ui';
import { MOTIVOS_EXCLUSION, describirAudiencia, errorMessage, exportarCsv, fmtFechaHora, fmtNum, opcionesEstado } from './comun';
import { BurbujaWhatsapp, Embudo, EstadoBadge, Metricas } from './componentes';

const POR_PAGINA = 100;
const REFRESCO_MS = 10000;

const COLS_CSV = [
  ['socio_nombre', 'Socio'], ['socio_dni', 'DNI'], ['telefono', 'Teléfono'], ['estado', 'Estado'],
  ['enviado_en', 'Enviado', r => fmtFechaHora(r.enviado_en)], ['entregado_en', 'Entregado', r => fmtFechaHora(r.entregado_en)],
  ['leido_en', 'Leído', r => fmtFechaHora(r.leido_en)], ['error_codigo', 'Código de error'], ['error_titulo', 'Error'],
  ['respuesta_texto', 'Respuesta'],
];

export const CampaniaDetallePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [c, setC] = useState(null);
  const [error, setError] = useState(null);
  const [estado, setEstado] = useState('');
  const [skip, setSkip] = useState(0);
  const [mensajes, setMensajes] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [confirmar, setConfirmar] = useState(null); // 'cancelar' | 'enviar'

  const cargar = useCallback(() => getCampania(id)
    .then(res => setC(res.data))
    .catch(err => setError(errorMessage(err, 'No se pudo cargar la campaña.'))), [id]);

  const cargarMensajes = useCallback(() => getMensajesCampania(id, { estado: estado || undefined, skip, limit: POR_PAGINA })
    .then(res => setMensajes(res.data))
    .catch(() => setMensajes(m => m || { total: 0, items: [] })), [id, estado, skip]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { cargarMensajes(); }, [cargarMensajes]);

  // Refresco automático mientras está en curso; además empuja el siguiente lote sin esperar la invocación remota
  const enCurso = c?.estado === 'EN_CURSO';
  useEffect(() => {
    if (!enCurso) return;
    const t = setInterval(() => {
      procesarCampania(id).then(res => setC(c0 => ({ ...c0, ...res.data, plantilla: c0.plantilla }))).catch(() => cargar());
      cargarMensajes();
    }, REFRESCO_MS);
    return () => clearInterval(t);
  }, [enCurso, id, cargar, cargarMensajes]);

  if (error) return <ErrorState message={error} onRetry={() => { setError(null); cargar(); }} />;
  if (!c) return <InlineLoader text="Cargando campaña…" />;

  const accion = async (nombre) => {
    setConfirmar(null);
    setOcupado(true);
    try {
      if (nombre === 'enviar') await enviarCampania(c.id);
      else if (nombre === 'procesar') await procesarCampania(c.id);
      else await accionCampania(c.id, nombre);
      await cargar();
      await cargarMensajes();
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo completar la acción.'));
    } finally {
      setOcupado(false);
    }
  };

  const exportar = async () => {
    try {
      const todos = [];
      for (let s = 0; ; s += 500) {
        const res = await getMensajesCampania(id, { estado: estado || undefined, skip: s, limit: 500 });
        todos.push(...res.data.items);
        if (res.data.items.length < 500) break;
      }
      exportarCsv(COLS_CSV, todos, `campania_${c.id}_${estado || 'todos'}`);
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo exportar.'));
    }
  };

  const m = c.metricas;
  const p = c.plantilla;
  const pagina = Math.floor(skip / POR_PAGINA) + 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/whatsapp/campanias')} style={{ marginBottom: 6 }}><ArrowLeft size={14} /> Campañas</button>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {c.nombre} <EstadoBadge tipo="campania" estado={c.estado} />
          </div>
          <div className="page-subtitle">
            {describirAudiencia(c.audiencia)} · Creada {fmtFechaHora(c.creado_en)}{c.creado_por ? ` por ${c.creado_por}` : ''}
            {c.iniciada_en && ` · Iniciada ${fmtFechaHora(c.iniciada_en)}`}
            {c.finalizada_en && ` · Terminó ${fmtFechaHora(c.finalizada_en)}`}
            {c.estado === 'PROGRAMADA' && ` · Programada para ${fmtFechaHora(c.programada_para)}`}
          </div>
        </div>
        <div className="flex gap-2">
          {c.estado === 'BORRADOR' && <button className="btn btn-primary" disabled={ocupado} onClick={() => setConfirmar('enviar')}><Send size={15} /> Enviar ahora</button>}
          {c.estado === 'EN_CURSO' && <>
            <button className="btn btn-secondary" disabled={ocupado} onClick={() => accion('procesar')}><RefreshCw size={15} /> Procesar lote</button>
            <button className="btn btn-secondary" disabled={ocupado} onClick={() => accion('pausar')}><Pause size={15} /> Pausar</button>
          </>}
          {c.estado === 'PROGRAMADA' && <button className="btn btn-secondary" disabled={ocupado} onClick={() => accion('pausar')}><Pause size={15} /> Pausar</button>}
          {c.estado === 'PAUSADA' && <button className="btn btn-primary" disabled={ocupado} onClick={() => accion('reanudar')}><Play size={15} /> Reanudar</button>}
          {['BORRADOR', 'PROGRAMADA', 'EN_CURSO', 'PAUSADA'].includes(c.estado) && (
            <button className="btn btn-danger" disabled={ocupado} onClick={() => setConfirmar('cancelar')}><XCircle size={15} /> Cancelar</button>
          )}
        </div>
      </div>

      {c.motivo_estado && <div className="alert alert-warning" style={{ marginBottom: 16 }}>{c.motivo_estado}</div>}
      {enCurso && <div className="alert alert-info" style={{ marginBottom: 16 }}>Enviando… esta pantalla se actualiza sola cada 10 segundos.</div>}

      <Metricas m={m} />

      <div className="grid grid-2" style={{ marginBottom: 20 }}>
        <div className="card">
          <div className="card-header"><span className="card-title">Embudo</span></div>
          <div className="card-body">
            <Embudo m={m} />
            {Object.keys(c.excluidos || {}).length > 0 && (
              <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 16 }}>
                <b>Excluidos al enviar:</b> {Object.entries(c.excluidos).map(([k, v]) => `${MOTIVOS_EXCLUSION[k] || k} ${v}`).join(' · ')}
              </div>
            )}
          </div>
        </div>
        <div className="card">
          <div className="card-header"><span className="card-title">Plantilla: {p.nombre}</span></div>
          <div className="card-body"><BurbujaWhatsapp encabezado={p.encabezado} texto={p.cuerpo} pie={p.pie} /></div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Destinatarios</span>
          <div className="flex gap-2 items-center">
            <div style={{ minWidth: 170 }}>
              <Select options={opcionesEstado('mensaje')} value={estado} onChange={v => { setEstado(v); setSkip(0); }} placeholder="Todos los estados" />
            </div>
            <button className="btn btn-ghost btn-sm" onClick={exportar} disabled={!mensajes?.total}><Download size={14} /> Exportar CSV</button>
          </div>
        </div>
        {!mensajes ? <div className="card-body"><InlineLoader text="Cargando…" /></div> : (
          <div className="table-container">
            <table>
              <thead><tr><th>Socio</th><th>Teléfono</th><th>Estado</th><th>Enviado</th><th>Entregado</th><th>Leído</th><th>Error / respuesta</th></tr></thead>
              <tbody>
                {mensajes.items.length === 0 && <tr><td colSpan={7} style={{ color: 'var(--gray-500)' }}>{c.estado === 'BORRADOR' ? 'Los destinatarios se fijan al enviar la campaña.' : 'Sin mensajes.'}</td></tr>}
                {mensajes.items.map(r => (
                  <tr key={r.id} style={{ cursor: r.socio_dni ? 'pointer' : 'default' }} onClick={() => r.socio_dni && navigate(`/?dni=${encodeURIComponent(r.socio_dni)}`)}>
                    <td>{r.socio_nombre || '—'}</td>
                    <td>{r.telefono}</td>
                    <td><EstadoBadge tipo="mensaje" estado={r.estado} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtFechaHora(r.enviado_en)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtFechaHora(r.entregado_en)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtFechaHora(r.leido_en)}</td>
                    <td style={{ fontSize: 13 }}>
                      {r.error_codigo && <div style={{ color: 'var(--danger)' }}>{r.error_codigo} {r.error_titulo}</div>}
                      {r.respuesta_texto && <div>💬 {r.respuesta_texto}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {mensajes?.total > POR_PAGINA && (
          <div className="card-footer flex justify-end gap-2 items-center">
            <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>Página {pagina} de {Math.ceil(mensajes.total / POR_PAGINA)} · {fmtNum(mensajes.total)} mensajes</span>
            <button className="btn btn-secondary btn-sm" disabled={skip === 0} onClick={() => setSkip(s => s - POR_PAGINA)}>Anterior</button>
            <button className="btn btn-secondary btn-sm" disabled={skip + POR_PAGINA >= mensajes.total} onClick={() => setSkip(s => s + POR_PAGINA)}>Siguiente</button>
          </div>
        )}
      </div>

      <ConfirmDialog open={confirmar === 'cancelar'} onCancel={() => setConfirmar(null)} onConfirm={() => accion('cancelar')}
        title="Cancelar campaña" message="Los mensajes que todavía no se enviaron no se van a enviar. Los ya enviados siguen registrando su estado." />
      <ConfirmDialog open={confirmar === 'enviar'} onCancel={() => setConfirmar(null)} onConfirm={() => accion('enviar')} variant="primary"
        title="Enviar campaña" message={`Se va a enviar “${p.nombre}” a la audiencia: ${describirAudiencia(c.audiencia)}.`} />
    </div>
  );
};
