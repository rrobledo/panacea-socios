// Componentes compartidos por las pantallas de WhatsApp
import { useEffect, useState } from 'react';
import { X, UserPlus } from 'lucide-react';
import { buscarPorDni, buscarPorNombre } from '../../services/sociosApi';
import { audienciaPrevia } from '../../services/whatsappApi';
import { Field, InlineLoader, LugarFilter } from '../../components/ui';
import { useDebounce } from '../../hooks';
import {
  ESTADOS, MOTIVOS_EXCLUSION, TIPOS_AUDIENCIA, audienciaCompleta, audienciaParaApi, errorMessage, fmtMonto, fmtNum,
  fmtPct, variablesFijas,
} from './comun';

export const EstadoBadge = ({ tipo, estado }) => {
  const [label, color] = ESTADOS[tipo]?.[estado] || [estado, 'gray'];
  return <span className={`badge badge-${color}`} style={{ whiteSpace: 'nowrap' }}>{label}</span>;
};

// ── Burbuja de WhatsApp (formato *negrita*, _cursiva_, ~tachado~) ──────────
const formatear = (linea, key) => {
  const partes = [];
  const re = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|\{\{\d+\}\})/g;
  let ultimo = 0;
  let m;
  while ((m = re.exec(linea))) {
    if (m.index > ultimo) partes.push(linea.slice(ultimo, m.index));
    const t = m[0];
    const k = `${key}-${m.index}`;
    if (t.startsWith('*')) partes.push(<strong key={k}>{t.slice(1, -1)}</strong>);
    else if (t.startsWith('_')) partes.push(<em key={k}>{t.slice(1, -1)}</em>);
    else if (t.startsWith('~')) partes.push(<s key={k}>{t.slice(1, -1)}</s>);
    else partes.push(<span key={k} style={{ background: '#fff3c4', borderRadius: 3, padding: '0 2px' }}>{t}</span>);
    ultimo = m.index + t.length;
  }
  if (ultimo < linea.length) partes.push(linea.slice(ultimo));
  return partes;
};

export const BurbujaWhatsapp = ({ encabezado, texto, pie, botones = [], ancho = 320 }) => (
  <div style={{ background: '#e5ddd5', borderRadius: 'var(--radius)', padding: 12, maxWidth: ancho + 24 }}>
    <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', fontSize: 14, lineHeight: 1.45,
      boxShadow: '0 1px 1px rgba(0,0,0,0.12)', maxWidth: ancho, color: '#111' }}>
      {encabezado && <div style={{ fontWeight: 700, marginBottom: 4 }}>{formatear(encabezado, 'h')}</div>}
      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {(texto || '').split('\n').map((l, i) => <div key={i}>{l ? formatear(l, i) : ' '}</div>)}
      </div>
      {pie && <div style={{ fontSize: 12, color: '#667781', marginTop: 4 }}>{pie}</div>}
    </div>
    {botones.map((b, i) => (
      <div key={i} style={{ background: '#fff', borderRadius: 8, marginTop: 4, padding: 8, textAlign: 'center',
        color: '#00a5f4', fontSize: 14, maxWidth: ancho, boxShadow: '0 1px 1px rgba(0,0,0,0.12)' }}>
        {b.texto || 'Botón'}
      </div>
    ))}
  </div>
);

// ── Indicadores ───────────────────────────────────────────────────────────
export const Indicador = ({ label, valor, detalle }) => (
  <div className="stat-card">
    <div style={{ minWidth: 0 }}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{valor}</div>
      {detalle && <div className="stat-change" style={{ color: 'var(--gray-500)' }}>{detalle}</div>}
    </div>
  </div>
);

export const Metricas = ({ m }) => (
  <div className="grid grid-4" style={{ marginBottom: 20 }}>
    <Indicador label="Enviados" valor={fmtNum(m.enviados)}
      detalle={m.pendientes ? `${fmtNum(m.pendientes)} pendientes` : `${fmtNum(m.destinatarios)} destinatarios`} />
    <Indicador label="Entregados" valor={fmtNum(m.entregados)} detalle={`Tasa de entrega ${fmtPct(m.tasa_entrega)}`} />
    <Indicador label="Leídos" valor={fmtNum(m.leidos)} detalle={`Tasa de lectura ${fmtPct(m.tasa_lectura)}`} />
    <Indicador label="Fallidos" valor={fmtNum(m.fallidos)} detalle={`Tasa de falla ${fmtPct(m.tasa_falla)}`} />
  </div>
);

// Embudo enviado → entregado → leído: una sola serie (magnitud), un solo tono
export const Embudo = ({ m }) => {
  const pasos = [['Enviados', m.enviados], ['Entregados', m.entregados], ['Leídos', m.leidos]];
  const max = Math.max(m.enviados || 0, 1);
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {pasos.map(([label, v]) => (
        <div key={label} title={`${label}: ${fmtNum(v)}`} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 70px', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>{label}</span>
          <div style={{ background: 'var(--gray-100)', borderRadius: 4, height: 18 }}>
            <div style={{ width: `${(100 * (v || 0)) / max}%`, background: '#2a78d6', height: '100%', borderRadius: 4, minWidth: v ? 4 : 0 }} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 600, textAlign: 'right' }}>{fmtNum(v)}</span>
        </div>
      ))}
    </div>
  );
};

const BuscadorSocios = ({ onAgregar }) => {
  const [texto, setTexto] = useState('');
  const [respuesta, setRespuesta] = useState({ q: null, items: [] });
  const q = useDebounce(texto.trim(), 350);
  // Solo se muestran los resultados de la búsqueda actual
  const resultados = respuesta.q === q && texto.trim() ? respuesta.items : [];
  const setResultados = (items) => setRespuesta({ q, items });

  useEffect(() => {
    if (q.length < 3) return;
    const req = /^\d+$/.test(q) ? buscarPorDni(q) : buscarPorNombre(q);
    let vivo = true;
    req.then(res => vivo && setRespuesta({ q, items: res.data.slice(0, 8) }))
      .catch(() => vivo && setRespuesta({ q, items: [] }));
    return () => { vivo = false; };
  }, [q]);

  return (
    <div style={{ position: 'relative' }}>
      <input className="form-input" placeholder="Buscar socio por nombre o DNI" value={texto} onChange={e => setTexto(e.target.value)} />
      {resultados.length > 0 && (
        <div className="card" style={{ position: 'absolute', zIndex: 20, left: 0, right: 0, top: '100%', marginTop: 4, maxHeight: 260, overflowY: 'auto' }}>
          {resultados.map(s => (
            <button key={s.id} type="button" className="dropdown-item" style={{ display: 'flex', width: '100%', gap: 8, alignItems: 'center', padding: '8px 12px', border: 0, background: 'none', cursor: 'pointer', textAlign: 'left' }}
              onClick={() => { onAgregar(s); setTexto(''); setResultados([]); }}>
              <UserPlus size={14} /> <span>{s.nombre_apellido}</span>
              <span style={{ color: 'var(--gray-500)', fontSize: 12 }}>DNI {s.dni} · {s.telefono || 'sin teléfono'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const AudienciaEditor = ({ value: a, onChange, tipos = Object.keys(TIPOS_AUDIENCIA), nombres = {}, onNombres }) => {
  const set = (k, v) => onChange({ ...a, [k]: v });
  return (
    <div>
      <div className="flex gap-2" style={{ flexWrap: 'wrap', marginBottom: 16 }}>
        {tipos.map(t => (
          <button key={t} type="button" className={`btn btn-sm ${a.tipo === t ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => onChange({ ...a, tipo: t, excluidos: [] })}>
            {TIPOS_AUDIENCIA[t]}
          </button>
        ))}
      </div>
      {a.tipo === 'PREFERENCIA' && (
        <div className="grid grid-2">
          <Field label="Producto, categoría o preferencia" required hint="Igual que en el reporte “Por preferencia”">
            <input className="form-input" value={a.q} maxLength={100} placeholder="Ej.: chocolate amargo, sin tacc"
              onChange={e => set('q', e.target.value)} />
          </Field>
          <LugarFilter label="Sucursal donde más compra" value={a.lugar} onChange={v => set('lugar', v)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
            <input type="checkbox" checked={a.incluir_resumen} onChange={e => set('incluir_resumen', e.target.checked)} />
            Buscar también en el resumen
          </label>
        </div>
      )}
      {a.tipo === 'TODOS' && (
        <div className="grid grid-2"><LugarFilter label="Sucursal donde más compra" value={a.lugar} onChange={v => set('lugar', v)} /></div>
      )}
      {a.tipo === 'CUMPLEANIOS' && (
        <div className="grid grid-3">
          <Field label="Cumplen desde" required><input type="date" className="form-input" value={a.desde} onChange={e => set('desde', e.target.value)} /></Field>
          <Field label="Hasta" required><input type="date" className="form-input" value={a.hasta} onChange={e => set('hasta', e.target.value)} /></Field>
          <LugarFilter label="Sucursal donde más compra" value={a.lugar} onChange={v => set('lugar', v)} />
        </div>
      )}
      {a.tipo === 'MANUAL' && (
        <div>
          <BuscadorSocios onAgregar={s => {
            if (!a.socio_ids.includes(s.id)) set('socio_ids', [...a.socio_ids, s.id]);
            onNombres?.({ ...nombres, [s.id]: s.nombre_apellido });
          }} />
          {a.socio_ids.length > 0 && (
            <div className="flex gap-2" style={{ flexWrap: 'wrap', marginTop: 12 }}>
              {a.socio_ids.map(id => (
                <span key={id} className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  {nombres[id] || `Socio #${id}`}
                  <button type="button" className="btn btn-ghost btn-icon" style={{ padding: 0, height: 16, width: 16 }}
                    onClick={() => set('socio_ids', a.socio_ids.filter(x => x !== id))} aria-label="Quitar"><X size={12} /></button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Vista previa de audiencia: enviables, excluidos, muestras y costo ─────
export const PreviaAudiencia = ({ plantilla, audiencia, valoresFijos, onAudienciaChange, onResultado }) => {
  // Resultado de la última consulta, con la clave que la originó: si no coincide con la actual, está cargando
  const [resultado, setResultado] = useState({ clave: null, data: null, error: null });
  const [grupo, setGrupo] = useState('enviables');
  const completa = !!plantilla?.id && audienciaCompleta(audiencia);
  const clave = useDebounce(completa ? JSON.stringify({ p: plantilla.id, a: audienciaParaApi(audiencia), v: valoresFijos, grupo }) : '', 400);

  useEffect(() => {
    if (!clave) return;
    const { p, a, v, grupo: g } = JSON.parse(clave);
    let vivo = true;
    onResultado?.(null); // el padre no debe avanzar con un resultado viejo
    audienciaPrevia({ plantilla_id: p, audiencia: a, valores_fijos: v, grupo: g, limit: 500 })
      .then(res => { if (vivo) { setResultado({ clave, data: res.data, error: null }); onResultado?.(res.data); } })
      .catch(err => { if (vivo) setResultado({ clave, data: null, error: errorMessage(err, 'No se pudo calcular la audiencia.') }); });
    return () => { vivo = false; };
  }, [clave]); // eslint-disable-line react-hooks/exhaustive-deps

  const loading = resultado.clave !== clave;
  const { data, error } = resultado;
  if (!completa) return <div className="alert alert-info">Completá la audiencia para ver los destinatarios.</div>;
  if (error && !loading) return <div className="alert alert-danger">{error}</div>;
  if (!data) return <InlineLoader text="Calculando audiencia…" />;

  const quitar = (socioId) => {
    if (audiencia.tipo === 'MANUAL') onAudienciaChange({ ...audiencia, socio_ids: audiencia.socio_ids.filter(x => x !== socioId) });
    else onAudienciaChange({ ...audiencia, excluidos: [...audiencia.excluidos, socioId] });
  };
  const reincorporar = (socioId) => onAudienciaChange({ ...audiencia, excluidos: audiencia.excluidos.filter(x => x !== socioId) });

  return (
    <div style={{ opacity: loading ? 0.6 : 1 }}>
      <div className="grid grid-3" style={{ marginBottom: 16 }}>
        <Indicador label="Se les va a enviar" valor={fmtNum(data.enviables)} />
        <Indicador label="Excluidos" valor={fmtNum(data.excluidos)}
          detalle={Object.entries(data.excluidos_por_motivo).map(([k, v]) => `${MOTIVOS_EXCLUSION[k] || k}: ${v}`).join(' · ') || 'Ninguno'} />
        <Indicador label="Costo estimado" valor={data.costo_estimado ? fmtMonto(data.costo_estimado.monto, data.costo_estimado.moneda) : '—'}
          detalle={data.costo_estimado ? `${data.costo_estimado.tarifa} por mensaje` : 'Cargá las tarifas en Configuración'} />
      </div>

      {data.muestras.length > 0 && (
        <>
          <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 8 }}>Así lo van a recibir (muestras con sus datos)</div>
          <div className="flex gap-3" style={{ flexWrap: 'wrap', marginBottom: 16, alignItems: 'flex-start' }}>
            {data.muestras.map(m => (
              <div key={m.socio_id}>
                <div style={{ fontSize: 12, color: 'var(--gray-600)', marginBottom: 4 }}>{m.nombre_apellido}</div>
                <BurbujaWhatsapp texto={m.texto} botones={plantilla?.botones} ancho={240} />
              </div>
            ))}
          </div>
        </>
      )}

      <div className="tabs" style={{ marginBottom: 8 }}>
        <button type="button" className={`tab-btn ${grupo === 'enviables' ? 'active' : ''}`} onClick={() => setGrupo('enviables')}>
          Destinatarios <span className="badge badge-gray" style={{ marginLeft: 6 }}>{data.enviables}</span>
        </button>
        <button type="button" className={`tab-btn ${grupo === 'excluidos' ? 'active' : ''}`} onClick={() => setGrupo('excluidos')}>
          Excluidos <span className="badge badge-gray" style={{ marginLeft: 6 }}>{data.excluidos}</span>
        </button>
      </div>
      <div className="table-container" style={{ maxHeight: 320, overflowY: 'auto' }}>
        <table>
          <thead><tr><th>Socio</th><th>Teléfono</th><th>{grupo === 'excluidos' ? 'Motivo' : 'WhatsApp'}</th><th /></tr></thead>
          <tbody>
            {data.destinatarios.map(d => (
              <tr key={d.socio_id}>
                <td>{d.nombre_apellido}</td>
                <td>{d.telefono || '—'}</td>
                <td>{grupo === 'excluidos' ? MOTIVOS_EXCLUSION[d.motivo] || d.motivo : <EstadoBadge tipo="socio" estado={d.whatsapp_estado} />}</td>
                <td style={{ textAlign: 'right' }}>
                  {grupo === 'enviables' && <button type="button" className="btn btn-ghost btn-sm" onClick={() => quitar(d.socio_id)}>Quitar</button>}
                  {grupo === 'excluidos' && d.motivo === 'EXCLUIDO_MANUAL' && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => reincorporar(d.socio_id)}>Volver a incluir</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.total_grupo > data.destinatarios.length && (
        <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>Mostrando {data.destinatarios.length} de {fmtNum(data.total_grupo)}</div>
      )}
    </div>
  );
};

export const ValoresFijos = ({ plantilla, valores, onChange }) => {
  const vars = variablesFijas(plantilla);
  if (!vars.length) return null;
  return (
    <div className="grid grid-2">
      {vars.map(v => {
        const clave = `${v.en || 'cuerpo'}:${v.n}`;
        return (
          <Field key={clave} label={`Valor de {{${v.n}}}${v.en === 'encabezado' ? ' (encabezado)' : ''}`}
            hint={v.texto ? `Si lo dejás vacío: “${v.texto}”` : `Ejemplo: ${v.ejemplo}`}>
            <input className="form-input" value={valores[clave] || ''} maxLength={1000}
              onChange={e => onChange({ ...valores, [clave]: e.target.value })} />
          </Field>
        );
      })}
    </div>
  );
};

export const SelectorPlantilla = ({ plantillas, value, onChange }) => (
  plantillas.length === 0 ? (
    <div className="alert alert-warning">No hay plantillas aprobadas. Creá una en Plantillas y esperá la aprobación de Meta.</div>
  ) : (
    <div className="grid grid-3">
      {plantillas.map(p => (
        <button key={p.id} type="button" onClick={() => onChange(p)} className="card"
          style={{ textAlign: 'left', cursor: 'pointer', padding: 12, outline: value?.id === p.id ? '2px solid var(--primary)' : 'none' }}>
          <div className="font-semibold" style={{ marginBottom: 2 }}>{p.nombre}</div>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>{p.categoria === 'MARKETING' ? 'Marketing' : 'Utilidad'} · <code>{p.nombre_meta}</code></div>
          <BurbujaWhatsapp encabezado={p.encabezado} texto={p.cuerpo} pie={p.pie} botones={p.botones} ancho={240} />
        </button>
      ))}
    </div>
  )
);
