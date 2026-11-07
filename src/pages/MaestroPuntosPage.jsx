import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Plus, Pencil, Trash2, Save } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import {
  getConfiguracionPuntos, updateConfiguracionPuntos,
  getReglasPuntos, crearReglaPuntos, eliminarReglaPuntos,
  getBeneficios, crearBeneficio, actualizarBeneficio,
} from '../services/sociosApi';
import { DataGrid } from '../components/grid/DataGrid';
import { Modal, Field, Tabs, InlineLoader, ErrorState } from '../components/ui';

const hoy = () => format(new Date(), 'yyyy-MM-dd');

const fmtImporte = (v) =>
  v == null ? '—' : new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v);

// Fechas "yyyy-MM-dd" sin conversión de zona horaria
const fmtFecha = (v) => (v ? v.split('-').reverse().join('/') : '—');

// Errores del backend: { detail: { code, message } } · 422 de validación: { detail: [{ msg }] } · 403 admin
const errorMessage = (err, fallback) => {
  if (err?.response?.status === 403) return 'Necesitás permisos de administrador para esta pantalla.';
  const d = err?.response?.data?.detail;
  if (d?.message) return d.message;
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg.replace(/^Value error, /, '');
  if (typeof d === 'string') return d;
  return fallback;
};

const numOrNull = (v) => (v === '' || v == null ? null : Number(v));

// ── Configuración general ────────────────────────────────────────────────
const ConfiguracionTab = () => {
  const toast = useToast();
  const [form, setForm]       = useState(null);
  const [error, setError]     = useState(null);
  const [saving, setSaving]   = useState(false);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    getConfiguracionPuntos()
      .then(res => setForm(res.data))
      .catch(err => setError(errorMessage(err, 'No se pudo cargar la configuración.')));
  }, [version]);

  const cargar = () => { setError(null); setVersion(v => v + 1); };

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await updateConfiguracionPuntos({
        meses_expiracion_puntos: Number(form.meses_expiracion_puntos),
        costo_juego_maquina: Number(form.costo_juego_maquina),
        programa_activo: form.programa_activo,
      });
      setForm(res.data);
      toast.success('Configuración guardada.');
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo guardar la configuración.'));
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={cargar} />;
  if (!form) return <InlineLoader text="Cargando configuración…" />;

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <form className="card" onSubmit={guardar} style={{ maxWidth: 640 }}>
      <div className="card-body">
        <label className="flex items-center gap-2" style={{ marginBottom: 20, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.programa_activo} onChange={set('programa_activo')} />
          <span className="font-semibold">Programa de puntos activo</span>
        </label>
        {!form.programa_activo && (
          <div className="alert alert-warning" style={{ marginBottom: 20 }}>
            Con el programa desactivado las compras no generan puntos.
          </div>
        )}
        <div className="grid grid-2">
          <Field label="Vencimiento de puntos (meses)" required hint="0 = los puntos no vencen">
            <input type="number" className="form-input" min={0} max={120} required
              value={form.meses_expiracion_puntos} onChange={set('meses_expiracion_puntos')} />
          </Field>
          <Field label="Costo de jugar a la máquina (puntos)" required hint="0 = deshabilita la máquina">
            <input type="number" className="form-input" min={0} required
              value={form.costo_juego_maquina} onChange={set('costo_juego_maquina')} />
          </Field>
        </div>
      </div>
      <div className="card-footer flex justify-end">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          <Save size={15} /> {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </form>
  );
};

// ── Reglas de conversión ─────────────────────────────────────────────────
const REGLA_VACIA = { monto_por_punto: '', multiplicador: '1', tope_por_compra: '', vigente_desde: '', motivo: '' };

const estadoRegla = (r) => {
  const h = hoy();
  if (r.vigente_desde > h) return ['Programada', 'warning'];
  if (r.vigente_hasta && r.vigente_hasta <= h) return ['Finalizada', 'gray'];
  return ['Vigente', 'success'];
};

const ReglasTab = () => {
  const toast = useToast();
  const [rows, setRows]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState(null);
  const [saving, setSaving]     = useState(false);
  const [aEliminar, setAEliminar] = useState(null);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    getReglasPuntos()
      .then(res => setRows(res.data))
      .catch(err => toast.error(errorMessage(err, 'No se pudieron cargar las reglas.')))
      .finally(() => setLoading(false));
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps -- toast no es estable

  const cargar = () => { setLoading(true); setVersion(v => v + 1); };

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await crearReglaPuntos({
        monto_por_punto: Number(form.monto_por_punto),
        multiplicador: Number(form.multiplicador || 1),
        tope_por_compra: numOrNull(form.tope_por_compra),
        vigente_desde: form.vigente_desde,
        motivo: form.motivo.trim(),
      });
      toast.success('Regla creada.');
      setForm(null);
      cargar();
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo crear la regla.'));
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async () => {
    try {
      await eliminarReglaPuntos(aEliminar.id);
      toast.success('Regla eliminada.');
      cargar();
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo eliminar la regla.'));
    } finally {
      setAEliminar(null);
    }
  };

  const columns = useMemo(() => [
    {
      id: 'estado', header: 'Estado', size: 110,
      cell: ({ row }) => { const [t, v] = estadoRegla(row.original); return <span className={`badge badge-${v}`}>{t}</span>; },
    },
    { accessorKey: 'monto_por_punto', header: '$ por punto', size: 120, cell: ({ getValue }) => fmtImporte(getValue()) },
    { accessorKey: 'multiplicador', header: 'Multiplicador', size: 110, cell: ({ getValue }) => `x${getValue()}` },
    { accessorKey: 'tope_por_compra', header: 'Tope por compra', size: 130, cell: ({ getValue }) => getValue() ?? 'Sin tope' },
    { accessorKey: 'vigente_desde', header: 'Desde', size: 110, cell: ({ getValue }) => fmtFecha(getValue()) },
    { accessorKey: 'vigente_hasta', header: 'Hasta', size: 110, cell: ({ getValue }) => getValue() ? fmtFecha(getValue()) : 'Abierta' },
    { accessorKey: 'motivo', header: 'Motivo' },
    { accessorKey: 'creado_por', header: 'Creada por', cell: ({ getValue }) => getValue() || '—' },
    {
      id: 'acciones', header: '', size: 60,
      cell: ({ row }) => row.original.vigente_desde > hoy() && (
        <button className="btn btn-ghost btn-icon" title="Eliminar regla programada"
          onClick={(e) => { e.stopPropagation(); setAEliminar(row.original); }}>
          <Trash2 size={15} color="var(--danger)" />
        </button>
      ),
    },
  ], []);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <>
      <div className="alert alert-info" style={{ marginBottom: 16 }}>
        Las reglas no se editan: al crear una nueva, la anterior se cierra en la fecha de inicio de la nueva.
        Los puntos ya acumulados no cambian. Solo se pueden eliminar reglas programadas a futuro.
      </div>
      <DataGrid
        title="Reglas de conversión"
        columns={columns}
        data={rows}
        loading={loading}
        showExport={false}
        emptyText="No hay reglas cargadas: las compras no generan puntos."
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setForm({ ...REGLA_VACIA, vigente_desde: hoy() })}>
            <Plus size={15} /> Nueva regla
          </button>
        }
      />

      <Modal open={!!form} onClose={() => setForm(null)} title="Nueva regla de conversión"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancelar</button>
          <button className="btn btn-primary" type="submit" form="form-regla" disabled={saving}>
            {saving ? 'Guardando…' : 'Crear regla'}
          </button>
        </>}
      >
        {form && (
          <form id="form-regla" onSubmit={guardar} className="grid grid-2">
            <Field label="Monto por punto ($)" required hint="Cada cuántos pesos se suma 1 punto">
              <input type="number" className="form-input" min={0.01} step="0.01" required autoFocus
                value={form.monto_por_punto} onChange={set('monto_por_punto')} />
            </Field>
            <Field label="Multiplicador" hint="Entre 0.01 y 10 (ej. x2 en promociones)">
              <input type="number" className="form-input" min={0.01} max={10} step="0.01"
                value={form.multiplicador} onChange={set('multiplicador')} />
            </Field>
            <Field label="Tope de puntos por compra" hint="Vacío = sin tope">
              <input type="number" className="form-input" min={1} step="1"
                value={form.tope_por_compra} onChange={set('tope_por_compra')} />
            </Field>
            <Field label="Vigente desde" required hint="No puede ser anterior a hoy">
              <input type="date" className="form-input" min={hoy()} required
                value={form.vigente_desde} onChange={set('vigente_desde')} />
            </Field>
            <Field label="Motivo" required span={2}>
              <input type="text" className="form-input" minLength={3} maxLength={200} required
                value={form.motivo} onChange={set('motivo')} placeholder="Ej. Actualización por inflación" />
            </Field>
          </form>
        )}
      </Modal>

      <Modal open={!!aEliminar} onClose={() => setAEliminar(null)} title="Eliminar regla" size="sm"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setAEliminar(null)}>Cancelar</button>
          <button className="btn btn-danger" onClick={eliminar}>Eliminar</button>
        </>}
      >
        <p>¿Eliminar la regla programada desde el {fmtFecha(aEliminar?.vigente_desde)}? La regla anterior vuelve a quedar vigente.</p>
      </Modal>
    </>
  );
};

// ── Beneficios ───────────────────────────────────────────────────────────
const BENEFICIO_VACIO = {
  nombre: '', descripcion: '', imagen_url: '', costo_puntos: '', porcentaje_descuento: '',
  tope_descuento: '', dias_validez_cupon: '30', limite_por_socio: '', stock: '',
  vigente_desde: '', vigente_hasta: '', activo: true,
};

const aFormulario = (b) => Object.fromEntries(
  Object.keys(BENEFICIO_VACIO).map(k => [k, b[k] == null ? '' : (typeof b[k] === 'boolean' ? b[k] : String(b[k]))])
);

const BeneficiosTab = () => {
  const toast = useToast();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm]       = useState(null); // { id?, ...campos }
  const [saving, setSaving]   = useState(false);

  const [version, setVersion] = useState(0);

  useEffect(() => {
    getBeneficios()
      .then(res => setRows(res.data))
      .catch(err => toast.error(errorMessage(err, 'No se pudieron cargar los beneficios.')))
      .finally(() => setLoading(false));
  }, [version]); // eslint-disable-line react-hooks/exhaustive-deps -- toast no es estable

  const cargar = () => { setLoading(true); setVersion(v => v + 1); };

  const guardar = async (e) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      imagen_url: form.imagen_url.trim() || null,
      costo_puntos: Number(form.costo_puntos),
      porcentaje_descuento: Number(form.porcentaje_descuento),
      tope_descuento: numOrNull(form.tope_descuento),
      dias_validez_cupon: Number(form.dias_validez_cupon),
      limite_por_socio: numOrNull(form.limite_por_socio),
      stock: numOrNull(form.stock),
      vigente_desde: form.vigente_desde,
      vigente_hasta: form.vigente_hasta || null,
      activo: form.activo,
    };
    try {
      if (form.id) await actualizarBeneficio(form.id, body);
      else await crearBeneficio(body);
      toast.success(form.id ? 'Beneficio actualizado.' : 'Beneficio creado.');
      setForm(null);
      cargar();
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo guardar el beneficio.'));
    } finally {
      setSaving(false);
    }
  };

  const toggleActivo = async (b) => {
    try {
      await actualizarBeneficio(b.id, { activo: !b.activo });
      toast.success(b.activo ? 'Beneficio desactivado.' : 'Beneficio activado.');
      cargar();
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo actualizar el beneficio.'));
    }
  };

  const columns = [
    {
      accessorKey: 'activo', header: 'Estado', size: 100,
      cell: ({ getValue }) => <span className={`badge badge-${getValue() ? 'success' : 'gray'}`}>{getValue() ? 'Activo' : 'Inactivo'}</span>,
    },
    { accessorKey: 'nombre', header: 'Nombre' },
    { accessorKey: 'costo_puntos', header: 'Costo (pts)', size: 100 },
    { accessorKey: 'porcentaje_descuento', header: '% desc.', size: 80, cell: ({ getValue }) => `${getValue()}%` },
    { accessorKey: 'tope_descuento', header: 'Tope desc.', size: 110, cell: ({ getValue }) => getValue() == null ? 'Sin tope' : fmtImporte(getValue()) },
    { accessorKey: 'dias_validez_cupon', header: 'Validez cupón', size: 110, cell: ({ getValue }) => `${getValue()} días` },
    { accessorKey: 'stock', header: 'Stock', size: 80, cell: ({ getValue }) => getValue() ?? '∞' },
    {
      id: 'vigencia', header: 'Vigencia', size: 180,
      cell: ({ row }) => `${fmtFecha(row.original.vigente_desde)} → ${row.original.vigente_hasta ? fmtFecha(row.original.vigente_hasta) : 'sin fin'}`,
    },
    { accessorKey: 'canjes_realizados', header: 'Canjes', size: 80 },
    {
      id: 'acciones', header: '', size: 150,
      cell: ({ row }) => (
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <button className="btn btn-ghost btn-icon" title="Editar" onClick={() => setForm({ id: row.original.id, ...aFormulario(row.original) })}>
            <Pencil size={15} />
          </button>
          <button className="btn btn-secondary btn-sm" onClick={() => toggleActivo(row.original)}>
            {row.original.activo ? 'Desactivar' : 'Activar'}
          </button>
        </div>
      ),
    },
  ];

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <>
      <DataGrid
        title="Beneficios canjeables"
        columns={columns}
        data={rows}
        loading={loading}
        showExport={false}
        emptyText="Todavía no hay beneficios cargados."
        actions={
          <button className="btn btn-primary btn-sm" onClick={() => setForm({ ...BENEFICIO_VACIO, vigente_desde: hoy() })}>
            <Plus size={15} /> Nuevo beneficio
          </button>
        }
      />

      <Modal open={!!form} onClose={() => setForm(null)} size="lg"
        title={form?.id ? 'Editar beneficio' : 'Nuevo beneficio'}
        footer={<>
          <button className="btn btn-secondary" onClick={() => setForm(null)}>Cancelar</button>
          <button className="btn btn-primary" type="submit" form="form-beneficio" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </>}
      >
        {form && (
          <form id="form-beneficio" onSubmit={guardar} className="grid grid-2">
            <Field label="Nombre" required span={2}>
              <input className="form-input" maxLength={120} required autoFocus value={form.nombre} onChange={set('nombre')} />
            </Field>
            <Field label="Descripción" span={2}>
              <textarea className="form-textarea" rows={2} maxLength={500} value={form.descripcion} onChange={set('descripcion')} />
            </Field>
            <Field label="URL de imagen" span={2}>
              <input type="url" className="form-input" maxLength={500} value={form.imagen_url} onChange={set('imagen_url')} />
            </Field>
            <Field label="Costo en puntos" required>
              <input type="number" className="form-input" min={1} step="1" required value={form.costo_puntos} onChange={set('costo_puntos')} />
            </Field>
            <Field label="% de descuento" required>
              <input type="number" className="form-input" min={0.01} max={100} step="0.01" required value={form.porcentaje_descuento} onChange={set('porcentaje_descuento')} />
            </Field>
            <Field label="Tope de descuento ($)" hint="Vacío = sin tope">
              <input type="number" className="form-input" min={0.01} step="0.01" value={form.tope_descuento} onChange={set('tope_descuento')} />
            </Field>
            <Field label="Validez del cupón (días)" required>
              <input type="number" className="form-input" min={1} step="1" required value={form.dias_validez_cupon} onChange={set('dias_validez_cupon')} />
            </Field>
            <Field label="Límite de canjes por socio" hint="Vacío = sin límite">
              <input type="number" className="form-input" min={1} step="1" value={form.limite_por_socio} onChange={set('limite_por_socio')} />
            </Field>
            <Field label="Stock" hint="Vacío = ilimitado">
              <input type="number" className="form-input" min={0} step="1" value={form.stock} onChange={set('stock')} />
            </Field>
            <Field label="Vigente desde" required>
              <input type="date" className="form-input" required value={form.vigente_desde} onChange={set('vigente_desde')} />
            </Field>
            <Field label="Vigente hasta" hint="Inclusive · vacío = sin fin">
              <input type="date" className="form-input" min={form.vigente_desde || undefined} value={form.vigente_hasta} onChange={set('vigente_hasta')} />
            </Field>
            <label className="flex items-center gap-2" style={{ gridColumn: 'span 2', cursor: 'pointer' }}>
              <input type="checkbox" checked={form.activo} onChange={set('activo')} />
              <span>Activo</span>
            </label>
            {form.id && (
              <div className="form-hint" style={{ gridColumn: 'span 2' }}>
                Los cupones ya emitidos conservan las condiciones con las que se canjearon.
              </div>
            )}
          </form>
        )}
      </Modal>
    </>
  );
};

// ── Página ───────────────────────────────────────────────────────────────
const TABS = [
  { value: 'config', label: 'Configuración general' },
  { value: 'reglas', label: 'Reglas de conversión' },
  { value: 'beneficios', label: 'Beneficios' },
];

export const MaestroPuntosPage = () => {
  const [tab, setTab] = useState('config');
  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Sistema de puntos</div>
          <div className="page-subtitle">Configuración del programa, reglas de conversión de compras a puntos y beneficios canjeables.</div>
        </div>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab} />
      <div style={{ marginTop: 20 }}>
        {tab === 'config' && <ConfiguracionTab />}
        {tab === 'reglas' && <ReglasTab />}
        {tab === 'beneficios' && <BeneficiosTab />}
      </div>
    </div>
  );
};
