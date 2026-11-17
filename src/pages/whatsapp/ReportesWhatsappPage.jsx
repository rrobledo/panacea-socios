import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Download, RotateCcw } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useToast } from '../../context/ToastContext';
import { getResumenWhatsapp, getNoContactables, cambiarEstadoWhatsappSocio } from '../../services/whatsappApi';
import { Field, InlineLoader, LugarFilter, Modal, Tabs } from '../../components/ui';
import { useSessionState } from '../../hooks/useSessionState';
import { MOTIVOS_EXCLUSION, errorMessage, exportarCsv, fmtFecha, fmtFechaHora, fmtMonto, fmtNum, fmtPct } from './comun';
import { Embudo, EstadoBadge, Indicador, Metricas } from './componentes';

// Paleta categórica validada (orden fijo) sobre fondo blanco; contraste < 3:1 en aqua/amarillo → hay vista de tabla
const SERIES = [
  { key: 'enviados', label: 'Enviados', color: '#2a78d6' },
  { key: 'entregados', label: 'Entregados', color: '#eb6834' },
  { key: 'leidos', label: 'Leídos', color: '#1baf7a' },
  { key: 'fallidos', label: 'Fallidos', color: '#eda100' },
];

const hoyMenos = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toLocaleDateString('en-CA');
};

const Serie = ({ serie }) => {
  const [tabla, setTabla] = useState(false);
  const data = serie.map(d => ({ ...d, etiqueta: fmtFecha(d.dia).slice(0, 5) }));
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header">
        <span className="card-title">Mensajes por día</span>
        <button className="btn btn-ghost btn-sm" onClick={() => setTabla(t => !t)}>{tabla ? 'Ver gráfico' : 'Ver tabla'}</button>
      </div>
      <div className="card-body" style={{ paddingTop: 8 }}>
        {tabla ? (
          <div className="table-container" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table>
              <thead><tr><th>Día</th>{SERIES.map(s => <th key={s.key}>{s.label}</th>)}</tr></thead>
              <tbody>{serie.map(d => <tr key={d.dia}><td>{fmtFecha(d.dia)}</td>{SERIES.map(s => <td key={s.key}>{fmtNum(d[s.key])}</td>)}</tr>)}</tbody>
            </table>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--gray-100)" vertical={false} />
              <XAxis dataKey="etiqueta" tick={{ fontSize: 12, fill: 'var(--gray-500)' }} axisLine={false} tickLine={false} minTickGap={16} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--gray-500)' }} axisLine={false} tickLine={false} width={40} />
              <Tooltip formatter={(v, n) => [fmtNum(v), n]} labelFormatter={l => `Día ${l}`} />
              <Legend iconType="plainline" itemSorter={(item) => SERIES.findIndex(s => s.key === item.dataKey)} wrapperStyle={{ fontSize: 12, color: 'var(--gray-700)' }} />
              {SERIES.map(s => (
                <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={2}
                  dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

const Tablero = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [desde, setDesde] = useSessionState('wa-reportes:desde', hoyMenos(29));
  const [hasta, setHasta] = useSessionState('wa-reportes:hasta', hoyMenos(0));
  const [resultado, setResultado] = useState({ clave: null, r: null });
  const clave = `${desde}|${hasta}`;
  const r = resultado.clave === clave ? resultado.r : null;

  useEffect(() => {
    getResumenWhatsapp({ desde, hasta })
      .then(res => setResultado({ clave, r: res.data }))
      .catch(err => toast.error(errorMessage(err, 'No se pudo cargar el resumen.')));
  }, [clave]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body flex gap-3" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group"><label className="form-label">Desde</label><input type="date" className="form-input" value={desde} onChange={e => setDesde(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Hasta</label><input type="date" className="form-input" value={hasta} onChange={e => setHasta(e.target.value)} /></div>
          {[[7, '7 días'], [30, '30 días'], [90, '90 días']].map(([d, l]) => (
            <button key={d} className="btn btn-secondary btn-sm" style={{ marginBottom: 10 }} onClick={() => { setDesde(hoyMenos(d - 1)); setHasta(hoyMenos(0)); }}>{l}</button>
          ))}
        </div>
      </div>

      {!r ? <InlineLoader text="Calculando…" /> : (
        <>
          <Metricas m={r.metricas} />
          <div className="grid grid-3" style={{ marginBottom: 20 }}>
            <Indicador label="Campañas en el período" valor={fmtNum(Object.values(r.campanias_por_estado).reduce((a, b) => a + b, 0))}
              detalle={Object.entries(r.campanias_por_estado).map(([k, v]) => `${k.replace('_', ' ').toLowerCase()} ${v}`).join(' · ') || '—'} />
            <Indicador label="Costo estimado" valor={r.costos.total != null ? fmtMonto(r.costos.total, r.costos.moneda) : '—'}
              detalle={r.costos.items.map(c => `${c.categoria}: ${fmtNum(c.facturables)}`).join(' · ') || 'Sin mensajes facturables'} />
            <Indicador label="Pendientes de envío" valor={fmtNum(r.metricas.pendientes)} />
          </div>

          <Serie serie={r.serie} />

          <div className="grid grid-3">
            <div className="card">
              <div className="card-header"><span className="card-title">Embudo</span></div>
              <div className="card-body"><Embudo m={r.metricas} /></div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">Campañas más leídas</span></div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Campaña</th><th>Entregados</th><th>Lectura</th></tr></thead>
                  <tbody>
                    {r.top_campanias.length === 0 && <tr><td colSpan={3} style={{ color: 'var(--gray-500)' }}>Sin datos</td></tr>}
                    {r.top_campanias.map(c => (
                      <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/whatsapp/campanias/${c.id}`)}>
                        <td>{c.nombre}</td><td>{fmtNum(c.entregados)}</td><td>{fmtPct(c.tasa_lectura)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><span className="card-title">Errores más frecuentes</span></div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Código</th><th>Descripción</th><th>Cantidad</th></tr></thead>
                  <tbody>
                    {r.top_errores.length === 0 && <tr><td colSpan={3} style={{ color: 'var(--gray-500)' }}>Sin errores</td></tr>}
                    {r.top_errores.map(e => (
                      <tr key={e.codigo} style={{ cursor: 'pointer' }} onClick={() => {
                        try { sessionStorage.setItem('wa-mensajes:busqueda', JSON.stringify({ q: '', estado: 'FALLIDO', error_codigo: String(e.codigo), desde, hasta, skip: 0 })); } catch { /* sin storage */ }
                        navigate('/whatsapp/mensajes');
                      }}>
                        <td>{e.codigo}</td><td style={{ fontSize: 13 }}>{e.titulo}</td><td>{fmtNum(e.cantidad)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

const POR_PAGINA = 100;
const COLS_CSV = [
  ['nombre_apellido', 'Nombre y Apellido'], ['dni', 'DNI'], ['telefono', 'Teléfono'], ['email', 'Email'],
  ['motivo', 'Motivo', r => MOTIVOS_EXCLUSION[r.motivo] || r.motivo], ['whatsapp_estado_motivo', 'Detalle'],
  ['ultimo_error', 'Último error'], ['whatsapp_estado_actualizado_en', 'Fecha', r => fmtFechaHora(r.whatsapp_estado_actualizado_en)],
];

const NoContactables = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [motivo, setMotivo] = useSessionState('wa-nocontact:motivo', '');
  const [lugar, setLugar] = useSessionState('wa-nocontact:lugar', '');
  const [skip, setSkip] = useState(0);
  const [resultado, setResultado] = useState({ clave: null, data: null });
  const [restablecer, setRestablecer] = useState(null);
  const [motivoCambio, setMotivoCambio] = useState('');
  const [version, setVersion] = useState(0);

  const clave = JSON.stringify([motivo, lugar, skip, version]);
  const data = resultado.clave === clave ? resultado.data : null;

  useEffect(() => {
    getNoContactables({ motivo: motivo || undefined, lugar: lugar || undefined, skip, limit: POR_PAGINA })
      .then(res => setResultado({ clave, data: res.data }))
      .catch(err => toast.error(errorMessage(err, 'No se pudo cargar el reporte.')));
  }, [clave]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportar = async () => {
    try {
      const todos = [];
      for (let s = 0; ; s += 500) {
        const res = await getNoContactables({ motivo: motivo || undefined, lugar: lugar || undefined, skip: s, limit: 500 });
        todos.push(...res.data.items);
        if (res.data.items.length < 500) break;
      }
      exportarCsv(COLS_CSV, todos, `socios_no_contactables${motivo ? `_${motivo.toLowerCase()}` : ''}`);
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo exportar.'));
    }
  };

  const confirmarRestablecer = async () => {
    try {
      await cambiarEstadoWhatsappSocio(restablecer.socio_id, { estado: 'DESCONOCIDO', motivo: motivoCambio.trim() });
      toast.success('Estado restablecido: el socio vuelve a recibir campañas.');
      setRestablecer(null);
      setMotivoCambio('');
      setVersion(v => v + 1);
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo cambiar el estado.'));
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body flex gap-3" style={{ flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ minWidth: 240 }}>
            <label className="form-label">Motivo</label>
            <select className="form-select" value={motivo} onChange={e => { setMotivo(e.target.value); setSkip(0); }}>
              <option value="">Todos</option>
              {['INVALIDO', 'BAJA', 'SIN_TELEFONO', 'TELEFONO_INVALIDO'].map(m => (
                <option key={m} value={m}>{MOTIVOS_EXCLUSION[m]}{data?.por_motivo?.[m] != null && !motivo ? ` (${data.por_motivo[m]})` : ''}</option>
              ))}
            </select>
          </div>
          <LugarFilter label="Sucursal donde más compra" value={lugar} onChange={v => { setLugar(v); setSkip(0); }} />
          <button className="btn btn-secondary" style={{ marginBottom: 10 }} onClick={exportar} disabled={!data?.total}><Download size={15} /> Exportar CSV</button>
        </div>
      </div>

      {!data ? <InlineLoader text="Cargando…" /> : (
        <div className="card">
          <div className="card-header"><span className="card-title">{fmtNum(data.total)} socios a los que no se les puede enviar WhatsApp</span></div>
          <div className="table-container">
            <table>
              <thead><tr><th>Socio</th><th>Teléfono</th><th>Motivo</th><th>Detalle</th><th>Fecha</th><th /></tr></thead>
              <tbody>
                {data.items.length === 0 && <tr><td colSpan={6} style={{ color: 'var(--gray-500)' }}>No hay socios con ese motivo.</td></tr>}
                {data.items.map(s => (
                  <tr key={s.socio_id}>
                    <td>
                      <button className="btn btn-ghost btn-sm" style={{ padding: 0 }} onClick={() => navigate(`/?dni=${encodeURIComponent(s.dni)}`)}>{s.nombre_apellido}</button>
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>DNI {s.dni}</div>
                    </td>
                    <td>{s.telefono || '—'}</td>
                    <td>{['INVALIDO', 'BAJA'].includes(s.motivo) ? <EstadoBadge tipo="socio" estado={s.whatsapp_estado} /> : MOTIVOS_EXCLUSION[s.motivo]}</td>
                    <td style={{ fontSize: 13 }}>{s.whatsapp_estado_motivo || s.ultimo_error || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtFechaHora(s.whatsapp_estado_actualizado_en)}</td>
                    <td style={{ textAlign: 'right' }}>
                      {['INVALIDO', 'BAJA'].includes(s.motivo) && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setRestablecer(s)}><RotateCcw size={14} /> Restablecer</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.total > POR_PAGINA && (
            <div className="card-footer flex justify-end gap-2">
              <button className="btn btn-secondary btn-sm" disabled={skip === 0} onClick={() => setSkip(s => s - POR_PAGINA)}>Anterior</button>
              <button className="btn btn-secondary btn-sm" disabled={skip + POR_PAGINA >= data.total} onClick={() => setSkip(s => s + POR_PAGINA)}>Siguiente</button>
            </div>
          )}
        </div>
      )}

      <Modal open={!!restablecer} onClose={() => setRestablecer(null)} title="Restablecer estado de WhatsApp" size="sm"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setRestablecer(null)}>Cancelar</button>
          <button className="btn btn-primary" disabled={motivoCambio.trim().length < 3} onClick={confirmarRestablecer}>Restablecer</button>
        </>}>
        <p style={{ marginBottom: 12 }}>{restablecer?.nombre_apellido} vuelve a quedar “sin verificar” y se incluye en las próximas campañas.
          {restablecer?.motivo === 'BAJA' && <b> Pidió la baja: hacelo solo si el socio volvió a aceptar recibir promociones.</b>}</p>
        <Field label="Motivo" required><input className="form-input" value={motivoCambio} onChange={e => setMotivoCambio(e.target.value)} placeholder="Ej.: número verificado por teléfono" /></Field>
      </Modal>
    </div>
  );
};

export const ReportesWhatsappPage = () => {
  const [tab, setTab] = useSessionState('wa-reportes:tab', 'tablero');
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Reportes de WhatsApp</div>
          <div className="page-subtitle">Entrega y lectura de las campañas, y socios con número inválido o dados de baja</div>
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <Tabs tabs={[{ value: 'tablero', label: 'Tablero' }, { value: 'no-contactables', label: 'No contactables' }]} active={tab} onChange={setTab} />
      </div>
      {tab === 'tablero' ? <Tablero /> : <NoContactables />}
    </div>
  );
};
