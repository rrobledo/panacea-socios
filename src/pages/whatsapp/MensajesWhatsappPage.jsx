import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getMensajesWhatsapp } from '../../services/whatsappApi';
import { InlineLoader, Select } from '../../components/ui';
import { useSessionState } from '../../hooks/useSessionState';
import { useScrollRestore } from '../../hooks/useScrollRestore';
import { errorMessage, fmtFechaHora, fmtNum, opcionesEstado } from './comun';
import { EstadoBadge } from './componentes';

const POR_PAGINA = 100;
const FILTROS = { q: '', estado: '', error_codigo: '', desde: '', hasta: '' };

export const MensajesWhatsappPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useSessionState('wa-mensajes:form', FILTROS);
  const [busqueda, setBusqueda] = useSessionState('wa-mensajes:busqueda', { ...FILTROS, skip: 0 });
  const [resultado, setResultado] = useState({ clave: null, data: { total: 0, items: [] } });
  const clave = JSON.stringify(busqueda);
  const loading = resultado.clave !== clave;
  const data = resultado.data;
  useScrollRestore('wa-mensajes:scroll', !loading);

  useEffect(() => {
    const p = Object.fromEntries(Object.entries(busqueda).filter(([, v]) => v !== '' && v != null));
    getMensajesWhatsapp({ ...p, limit: POR_PAGINA })
      .then(res => setResultado({ clave, data: res.data }))
      .catch(err => { toast.error(errorMessage(err, 'No se pudieron cargar los mensajes.')); setResultado({ clave, data: { total: 0, items: [] } }); });
  }, [clave]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e?.target ? e.target.value : e }));
  const buscar = () => setBusqueda({ ...form, skip: 0 });
  const pagina = Math.floor(busqueda.skip / POR_PAGINA) + 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Mensajes de WhatsApp</div>
          <div className="page-subtitle">Historial de todos los mensajes enviados, con su estado de entrega y lectura</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
            <label className="form-label">Socio o teléfono</label>
            <input className="form-input" value={form.q} onChange={set('q')} onKeyDown={e => e.key === 'Enter' && buscar()} placeholder="Nombre, DNI o teléfono" />
          </div>
          <div className="form-group" style={{ minWidth: 160 }}>
            <label className="form-label">Estado</label>
            <Select options={opcionesEstado('mensaje')} value={form.estado} onChange={set('estado')} placeholder="Todos" />
          </div>
          <div className="form-group" style={{ width: 130 }}>
            <label className="form-label">Código de error</label>
            <input className="form-input" inputMode="numeric" value={form.error_codigo} onChange={set('error_codigo')} />
          </div>
          <div className="form-group"><label className="form-label">Desde</label><input type="date" className="form-input" value={form.desde} onChange={set('desde')} /></div>
          <div className="form-group"><label className="form-label">Hasta</label><input type="date" className="form-input" value={form.hasta} onChange={set('hasta')} /></div>
          <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={buscar}><Search size={15} /> Buscar</button>
        </div>
      </div>

      {loading ? <InlineLoader text="Cargando mensajes…" /> : (
        <div className="card">
          <div className="card-header"><span className="card-title">{fmtNum(data.total)} mensajes</span></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Fecha</th><th>Socio</th><th>Teléfono</th><th>Campaña</th><th>Estado</th><th>Leído</th><th>Error / respuesta</th></tr></thead>
              <tbody>
                {data.items.length === 0 && <tr><td colSpan={7} style={{ color: 'var(--gray-500)' }}>No hay mensajes con esos filtros.</td></tr>}
                {data.items.map(r => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtFechaHora(r.enviado_en || r.creado_en)}</td>
                    <td>{r.socio_dni
                      ? <button className="btn btn-ghost btn-sm" style={{ padding: 0 }} onClick={() => navigate(`/?dni=${encodeURIComponent(r.socio_dni)}`)}>{r.socio_nombre}</button>
                      : <span style={{ color: 'var(--gray-500)' }}>{r.campania_id ? '—' : 'Prueba'}</span>}</td>
                    <td>{r.telefono}</td>
                    <td>{r.campania_id
                      ? <button className="btn btn-ghost btn-sm" style={{ padding: 0 }} onClick={() => navigate(`/whatsapp/campanias/${r.campania_id}`)}>{r.campania_nombre}</button>
                      : '—'}</td>
                    <td><EstadoBadge tipo="mensaje" estado={r.estado} /></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtFechaHora(r.leido_en)}</td>
                    <td style={{ fontSize: 13, maxWidth: 320 }}>
                      {r.error_codigo && <div style={{ color: 'var(--danger)' }}>{r.error_codigo} {r.error_titulo}{r.error_detalle ? ` · ${r.error_detalle}` : ''}</div>}
                      {r.respuesta_texto && <div>💬 {r.respuesta_texto}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.total > POR_PAGINA && (
            <div className="card-footer flex justify-end gap-2 items-center">
              <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>Página {pagina} de {Math.ceil(data.total / POR_PAGINA)}</span>
              <button className="btn btn-secondary btn-sm" disabled={pagina === 1} onClick={() => setBusqueda(b => ({ ...b, skip: b.skip - POR_PAGINA }))}>Anterior</button>
              <button className="btn btn-secondary btn-sm" disabled={busqueda.skip + POR_PAGINA >= data.total} onClick={() => setBusqueda(b => ({ ...b, skip: b.skip + POR_PAGINA }))}>Siguiente</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
