import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Send, Plus, Trash2, ArrowLeft, Braces } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import {
  getPlantilla, crearPlantilla, actualizarPlantilla, getCamposPlantilla, enviarAprobacionPlantilla, vistaPreviaPlantilla,
} from '../../services/whatsappApi';
import { buscarPorDni, buscarPorNombre } from '../../services/sociosApi';
import { Field, InlineLoader, ErrorState } from '../../components/ui';
import { errorMessage } from './comun';
import { BurbujaWhatsapp, EstadoBadge } from './componentes';

const VAR_RE = /\{\{(\d+)\}\}/g;
const PIE_BAJA = 'Respondé BAJA para no recibir más';
const VACIA = {
  nombre: '', nombre_meta: '', categoria: 'MARKETING', idioma: 'es_AR', encabezado: '', cuerpo: '', pie: '',
  botones: [], variables: [],
};

const slug = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60);

const numeros = (t) => [...(t || '').matchAll(VAR_RE)].map(m => Number(m[1]));

// Mantiene una definición por cada {{n}} usado en el cuerpo y el encabezado
const sincronizarVariables = (form) => {
  const previas = Object.fromEntries(form.variables.map(v => [`${v.en || 'cuerpo'}:${v.n}`, v]));
  const salida = [];
  for (const [en, texto] of [['cuerpo', form.cuerpo], ['encabezado', form.encabezado]]) {
    for (const n of [...new Set(numeros(texto))].sort((a, b) => a - b)) {
      salida.push(previas[`${en}:${n}`] || { n, en, origen: 'campo', campo: 'primer_nombre', texto: '', ejemplo: '', defecto: '' });
    }
  }
  return salida;
};

// Las mismas reglas que valida el backend (reglas de Meta)
const validar = (f) => {
  const e = [];
  if (!f.nombre.trim()) e.push('Poné un nombre para identificarla.');
  if (!/^[a-z0-9_]{1,512}$/.test(f.nombre_meta)) e.push('El nombre en Meta solo admite minúsculas, números y guion bajo.');
  if (!f.cuerpo.trim()) e.push('El cuerpo es obligatorio.');
  if (f.cuerpo.length > 1024) e.push('El cuerpo no puede superar 1024 caracteres.');
  if (f.encabezado.length > 60) e.push('El encabezado no puede superar 60 caracteres.');
  if (numeros(f.encabezado).length > 1) e.push('El encabezado admite una sola variable.');
  if (f.pie.length > 60) e.push('El pie no puede superar 60 caracteres.');
  if (numeros(f.pie).length) e.push('El pie no puede tener variables.');
  for (const [en, t] of [['cuerpo', f.cuerpo], ['encabezado', f.encabezado]]) {
    const u = [...new Set(numeros(t))].sort((a, b) => a - b);
    if (u.some((n, i) => n !== i + 1)) e.push(`Las variables del ${en} deben ser consecutivas desde {{1}}.`);
  }
  const c = f.cuerpo.trim();
  if (/^\{\{\d+\}\}/.test(c)) e.push('El cuerpo no puede empezar con una variable.');
  if (/\{\{\d+\}\}$/.test(c)) e.push('El cuerpo no puede terminar con una variable.');
  if (/\}\}\s*\{\{/.test(f.cuerpo)) e.push('Las variables no pueden estar pegadas entre sí.');
  f.variables.forEach(v => {
    if (!v.ejemplo?.trim()) e.push(`La variable {{${v.n}}} necesita un ejemplo (Meta lo pide para aprobarla).`);
    if (v.origen === 'campo' && !v.defecto?.trim()) e.push(`La variable {{${v.n}}} necesita un valor por defecto.`);
  });
  if (f.botones.length > 3) e.push('Se admiten hasta 3 botones.');
  f.botones.forEach(b => {
    if (!b.texto.trim() || b.texto.length > 25) e.push('Cada botón necesita un texto de hasta 25 caracteres.');
    if (b.tipo === 'URL' && !/^https?:\/\//.test(b.url || '')) e.push('Los botones de enlace necesitan una URL completa (https://…).');
  });
  return e;
};

const reemplazar = (t, vars, en) => (t || '').replace(VAR_RE, (m, n) => {
  const v = vars.find(x => (x.en || 'cuerpo') === en && x.n === Number(n));
  return v?.ejemplo?.trim() || m;
});

export const PlantillaEditorPage = () => {
  const { id } = useParams();
  const nueva = id === 'nueva';
  const navigate = useNavigate();
  const toast = useToast();
  const cuerpoRef = useRef(null);
  const [form, setForm] = useState(nueva ? VACIA : null);
  const [plantilla, setPlantilla] = useState(null);
  const [campos, setCampos] = useState([]);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [nombreMetaTocado, setNombreMetaTocado] = useState(!nueva);
  const [previaSocio, setPreviaSocio] = useState({ q: '', texto: null, nombre: null });

  useEffect(() => {
    getCamposPlantilla().then(res => setCampos(res.data)).catch(() => {});
    if (nueva) return;
    getPlantilla(id)
      .then(res => {
        const p = res.data;
        setPlantilla(p);
        setForm({ ...VACIA, ...p, encabezado: p.encabezado || '', pie: p.pie || '',
          variables: p.variables.map(v => ({ texto: '', defecto: '', ...v })) });
      })
      .catch(err => setError(errorMessage(err, 'No se pudo cargar la plantilla.')));
  }, [id, nueva]);

  const editable = nueva || ['BORRADOR', 'RECHAZADA'].includes(plantilla?.estado);
  const errores = useMemo(() => (form ? validar(form) : []), [form]);

  if (error) return <ErrorState message={error} onRetry={() => navigate(0)} />;
  if (!form) return <InlineLoader text="Cargando plantilla…" />;

  const actualizar = (cambios) => setForm(f => {
    const nuevo = { ...f, ...cambios };
    if ('nombre' in cambios && !nombreMetaTocado) nuevo.nombre_meta = slug(cambios.nombre);
    if ('cuerpo' in cambios || 'encabezado' in cambios) nuevo.variables = sincronizarVariables(nuevo);
    return nuevo;
  });
  const setVar = (i, cambios) => setForm(f => ({ ...f, variables: f.variables.map((v, j) => (j === i ? { ...v, ...cambios } : v)) }));
  const setBoton = (i, cambios) => setForm(f => ({ ...f, botones: f.botones.map((b, j) => (j === i ? { ...b, ...cambios } : b)) }));

  const insertarVariable = () => {
    const n = Math.max(0, ...numeros(form.cuerpo)) + 1;
    const el = cuerpoRef.current;
    const pos = el ? el.selectionStart : form.cuerpo.length;
    actualizar({ cuerpo: `${form.cuerpo.slice(0, pos)}{{${n}}}${form.cuerpo.slice(pos)}` });
    setTimeout(() => el?.focus(), 0);
  };

  const datos = () => ({
    nombre: form.nombre.trim(), nombre_meta: form.nombre_meta, categoria: form.categoria, idioma: form.idioma,
    encabezado: form.encabezado.trim() || null, cuerpo: form.cuerpo, pie: form.pie.trim() || null,
    botones: form.botones.map(b => ({ tipo: b.tipo, texto: b.texto.trim(), url: b.tipo === 'URL' ? b.url : null })),
    variables: form.variables.map(v => ({
      n: v.n, en: v.en || 'cuerpo', origen: v.origen, campo: v.origen === 'campo' ? v.campo : null,
      texto: v.origen === 'texto_fijo' ? v.texto || '' : null, ejemplo: v.ejemplo || '', defecto: v.defecto || null,
    })),
  });

  const guardar = async () => {
    if (errores.length) { toast.error(errores[0]); return null; }
    setSaving(true);
    try {
      const res = nueva ? await crearPlantilla(datos()) : await actualizarPlantilla(id, datos());
      toast.success('Plantilla guardada.');
      setPlantilla(res.data);
      if (nueva) navigate(`/whatsapp/plantillas/${res.data.id}`, { replace: true });
      return res.data;
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo guardar la plantilla.'));
      return null;
    } finally {
      setSaving(false);
    }
  };

  const enviarAprobacion = async () => {
    const p = await guardar();
    if (!p) return;
    setSaving(true);
    try {
      const res = await enviarAprobacionPlantilla(p.id);
      setPlantilla(res.data);
      setForm(f => ({ ...f, ...res.data, encabezado: res.data.encabezado || '', pie: res.data.pie || '' }));
      if (res.data.estado === 'RECHAZADA') toast.error(`Meta la rechazó: ${res.data.motivo_rechazo}`);
      else toast.success('Enviada a Meta. La revisión puede tardar hasta 24 h; usá “Sincronizar con Meta” para ver el estado.');
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo enviar a aprobación.'));
    } finally {
      setSaving(false);
    }
  };

  const previaConSocio = async () => {
    const q = previaSocio.q.trim();
    if (!plantilla || q.length < 3) return;
    try {
      const res = await (/^\d+$/.test(q) ? buscarPorDni(q) : buscarPorNombre(q));
      const s = res.data[0];
      if (!s) { toast.error('No se encontró el socio.'); return; }
      const prev = await vistaPreviaPlantilla(plantilla.id, { socio_id: s.id });
      setPreviaSocio(p => ({ ...p, texto: prev.data.texto, nombre: s.nombre_apellido }));
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo generar la vista previa.'));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/whatsapp/plantillas')} style={{ marginBottom: 6 }}><ArrowLeft size={14} /> Plantillas</button>
          <div className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {nueva ? 'Nueva plantilla' : form.nombre}
            {plantilla && <EstadoBadge tipo="plantilla" estado={plantilla.estado} />}
          </div>
          {plantilla?.motivo_rechazo && <div className="page-subtitle" style={{ color: 'var(--danger)' }}>Motivo del rechazo: {plantilla.motivo_rechazo}</div>}
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={guardar} disabled={saving}><Save size={15} /> Guardar</button>
          {editable && <button className="btn btn-primary" onClick={enviarAprobacion} disabled={saving || errores.length > 0}><Send size={15} /> Guardar y enviar a aprobación</button>}
        </div>
      </div>

      {!editable && (
        <div className="alert alert-info" style={{ marginBottom: 16 }}>
          Esta plantilla ya está en Meta: solo podés cambiar el nombre visible y de dónde sale cada variable. Para cambiar el texto, copiala.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 20, alignItems: 'start' }}>
        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-body">
              <div className="grid grid-2">
                <Field label="Nombre" required><input className="form-input" value={form.nombre} maxLength={200} onChange={e => actualizar({ nombre: e.target.value })} /></Field>
                <Field label="Nombre en Meta" required hint="Minúsculas, números y _ (no se puede cambiar después)">
                  <input className="form-input" value={form.nombre_meta} disabled={!editable} maxLength={512}
                    onChange={e => { setNombreMetaTocado(true); actualizar({ nombre_meta: e.target.value }); }} />
                </Field>
                <Field label="Categoría" hint="Marketing: promociones · Utilidad: avisos sobre algo que el socio ya hizo">
                  <select className="form-select" value={form.categoria} disabled={!editable} onChange={e => actualizar({ categoria: e.target.value })}>
                    <option value="MARKETING">Marketing</option><option value="UTILITY">Utilidad</option>
                  </select>
                </Field>
                <Field label="Idioma"><input className="form-input" value={form.idioma} disabled={!editable} onChange={e => actualizar({ idioma: e.target.value })} /></Field>
              </div>
              <Field label="Encabezado (opcional)" hint={`${form.encabezado.length}/60`}>
                <input className="form-input" value={form.encabezado} disabled={!editable} maxLength={60} onChange={e => actualizar({ encabezado: e.target.value })} />
              </Field>
              <Field label="Cuerpo" required hint={`${form.cuerpo.length}/1024 · *negrita*, _cursiva_ · las variables no pueden ir al principio, al final ni pegadas`}>
                <textarea ref={cuerpoRef} className="form-textarea" rows={6} value={form.cuerpo} disabled={!editable} maxLength={1024}
                  onChange={e => actualizar({ cuerpo: e.target.value })} placeholder="Hola {{1}}, tenés {{2}} puntos para canjear en Panacea." />
              </Field>
              {editable && <button type="button" className="btn btn-secondary btn-sm" onClick={insertarVariable} style={{ marginBottom: 16 }}><Braces size={14} /> Insertar variable</button>}
              <Field label="Pie (opcional)" hint={`${form.pie.length}/60`}>
                <input className="form-input" value={form.pie} disabled={!editable} maxLength={60} onChange={e => actualizar({ pie: e.target.value })} />
              </Field>
              {editable && form.categoria === 'MARKETING' && !form.pie && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => actualizar({ pie: PIE_BAJA })}>Agregar “{PIE_BAJA}”</button>
              )}
            </div>
          </div>

          {form.variables.length > 0 && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header"><span className="card-title">Variables</span></div>
              <div className="table-container">
                <table>
                  <thead><tr><th>Variable</th><th>Se completa con</th><th>Ejemplo (para Meta)</th><th>Si el dato está vacío</th></tr></thead>
                  <tbody>
                    {form.variables.map((v, i) => (
                      <tr key={`${v.en}:${v.n}`}>
                        <td style={{ whiteSpace: 'nowrap' }}><code>{`{{${v.n}}}`}</code>{v.en === 'encabezado' && <span style={{ fontSize: 12, color: 'var(--gray-500)' }}> encabezado</span>}</td>
                        <td>
                          <select className="form-select" value={v.origen === 'campo' ? v.campo : '__fijo'}
                            onChange={e => setVar(i, e.target.value === '__fijo' ? { origen: 'texto_fijo' } : { origen: 'campo', campo: e.target.value })}>
                            {campos.map(c => <option key={c.campo} value={c.campo} title={c.descripcion}>{c.etiqueta}</option>)}
                            <option value="__fijo">Texto fijo (se completa al enviar)</option>
                          </select>
                          {v.origen === 'texto_fijo' && (
                            <input className="form-input" style={{ marginTop: 6 }} placeholder="Texto por defecto (opcional)" value={v.texto || ''} onChange={e => setVar(i, { texto: e.target.value })} />
                          )}
                        </td>
                        <td><input className="form-input" value={v.ejemplo || ''} disabled={!editable} onChange={e => setVar(i, { ejemplo: e.target.value })} /></td>
                        <td>{v.origen === 'campo'
                          ? <input className="form-input" value={v.defecto || ''} placeholder="Ej.: socio" onChange={e => setVar(i, { defecto: e.target.value })} />
                          : <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <span className="card-title">Botones (opcional)</span>
              {editable && form.botones.length < 3 && (
                <button className="btn btn-ghost btn-sm" onClick={() => setForm(f => ({ ...f, botones: [...f.botones, { tipo: 'QUICK_REPLY', texto: '', url: '' }] }))}><Plus size={14} /> Agregar</button>
              )}
            </div>
            <div className="card-body">
              {form.botones.length === 0 && <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>Sin botones. Un botón de respuesta rápida “BAJA” permite darse de baja con un toque.</span>}
              {form.botones.map((b, i) => (
                <div key={i} className="flex gap-2 items-center" style={{ marginBottom: 8 }}>
                  <select className="form-select" style={{ width: 170 }} value={b.tipo} disabled={!editable} onChange={e => setBoton(i, { tipo: e.target.value })}>
                    <option value="QUICK_REPLY">Respuesta rápida</option><option value="URL">Enlace</option>
                  </select>
                  <input className="form-input" placeholder="Texto" maxLength={25} value={b.texto} disabled={!editable} onChange={e => setBoton(i, { texto: e.target.value })} />
                  {b.tipo === 'URL' && <input className="form-input" placeholder="https://…" value={b.url || ''} disabled={!editable} onChange={e => setBoton(i, { url: e.target.value })} />}
                  {editable && <button className="btn btn-ghost btn-icon" onClick={() => setForm(f => ({ ...f, botones: f.botones.filter((_, j) => j !== i) }))}><Trash2 size={15} /></button>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ position: 'sticky', top: 80 }}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-header"><span className="card-title">Vista previa</span></div>
            <div className="card-body">
              <BurbujaWhatsapp
                encabezado={reemplazar(form.encabezado, form.variables, 'encabezado')}
                texto={previaSocio.texto && !previaSocio.dirty ? previaSocio.texto : reemplazar(form.cuerpo, form.variables, 'cuerpo') || 'Escribí el cuerpo del mensaje…'}
                pie={previaSocio.texto ? null : form.pie} botones={form.botones} />
              {previaSocio.nombre && <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 6 }}>Con los datos de {previaSocio.nombre} · <button className="btn btn-ghost btn-sm" onClick={() => setPreviaSocio({ q: '', texto: null, nombre: null })}>ver ejemplo</button></div>}
              {plantilla && (
                <div className="flex gap-2" style={{ marginTop: 12 }}>
                  <input className="form-input" placeholder="Probar con un socio (DNI o nombre)" value={previaSocio.q}
                    onChange={e => setPreviaSocio(p => ({ ...p, q: e.target.value }))} onKeyDown={e => e.key === 'Enter' && previaConSocio()} />
                  <button className="btn btn-secondary btn-sm" onClick={previaConSocio}>Ver</button>
                </div>
              )}
            </div>
          </div>
          {errores.length > 0 && (
            <div className="alert alert-warning" style={{ display: 'block', fontSize: 13 }}>
              <b>Para que Meta la acepte:</b>
              <ul style={{ margin: '6px 0 0 16px' }}>{errores.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
