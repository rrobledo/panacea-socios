import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from '../context/ToastContext';
import { getRankingCompras, getCumpleanios } from '../services/sociosApi';
import { DataGrid } from '../components/grid/DataGrid';

const fmtImporte = (v) => {
  if (v == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v);
};

const fmtFecha = (v) => (v ? new Date(v).toLocaleDateString('es-AR') : '—');

const hoy = () => format(new Date(), 'yyyy-MM-dd');

// ── Socios por mayor compra ───────────────────────────────────────────────
export const RankingComprasPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [desde, setDesde]     = useState('');
  const [hasta, setHasta]     = useState('');
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = {};
    if (desde) params.desde = desde;
    if (hasta) params.hasta = hasta;
    getRankingCompras(params)
      .then(res => setRows(res.data.map((r, i) => ({ ...r, puesto: i + 1, total_compras: Number(r.total_compras) }))))
      .catch(() => toast.error('No se pudo cargar el reporte.'))
      .finally(() => setLoading(false));
  }, [desde, hasta]);

  const onFiltro = (setter) => (e) => { setLoading(true); setter(e.target.value); };

  const columns = useMemo(() => [
    { accessorKey: 'puesto', header: '#', size: 50 },
    { accessorKey: 'nombre_apellido', header: 'Nombre y Apellido' },
    { accessorKey: 'dni', header: 'DNI', size: 110 },
    { accessorKey: 'telefono', header: 'Teléfono', size: 140, cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'cantidad_compras', header: 'Compras', size: 90 },
    {
      accessorKey: 'total_compras', header: 'Total comprado', size: 150,
      cell: ({ getValue }) => <span style={{ fontWeight: 600 }}>{fmtImporte(getValue())}</span>,
    },
    { accessorKey: 'ultima_compra', header: 'Última compra', size: 120, cell: ({ getValue }) => fmtFecha(getValue()) },
    {
      id: 'accion', header: '', size: 90,
      cell: () => <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 500, whiteSpace: 'nowrap' }}>Ver socio →</span>,
    },
  ], []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Socios por mayor compra</div>
          <div className="page-subtitle">Total comprado por cada socio, de mayor a menor. Hacé clic en un socio para ver sus datos y compras.</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
            <div className="form-group">
              <label className="form-label">Desde</label>
              <input type="date" className="form-input" value={desde} max={hasta || undefined} onChange={onFiltro(setDesde)} />
            </div>
            <div className="form-group">
              <label className="form-label">Hasta</label>
              <input type="date" className="form-input" value={hasta} min={desde || undefined} onChange={onFiltro(setHasta)} />
            </div>
            {(desde || hasta) && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: 'flex-end' }}
                onClick={() => { setLoading(true); setDesde(''); setHasta(''); }}
              >
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      <DataGrid
        title="Socios por mayor compra"
        columns={columns}
        data={rows}
        loading={loading}
        rowKey="socio_id"
        emptyText="No hay compras registradas en el período."
        onRowClick={(row) => navigate(`/?dni=${encodeURIComponent(row.dni)}`)}
      />
    </div>
  );
};

// ── Cumpleaños del día ────────────────────────────────────────────────────
export const CumpleaniosPage = () => {
  const toast = useToast();
  const [fecha, setFecha]     = useState(hoy);
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCumpleanios(fecha)
      .then(res => setRows(res.data))
      .catch(() => toast.error('No se pudo cargar el reporte.'))
      .finally(() => setLoading(false));
  }, [fecha]);

  const onFecha = (e) => {
    if (!e.target.value) return;
    setLoading(true);
    setFecha(e.target.value);
  };

  const columns = useMemo(() => [
    { accessorKey: 'nombre_apellido', header: 'Nombre y Apellido' },
    { accessorKey: 'dni', header: 'DNI', size: 110 },
    { accessorKey: 'telefono', header: 'Teléfono', size: 140, cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'email', header: 'Email', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'fecha_nacimiento', header: 'Fecha Nac.', size: 120, cell: ({ getValue }) => format(parseISO(getValue()), 'dd/MM/yyyy') },
    { accessorKey: 'edad', header: 'Cumple', size: 90, cell: ({ getValue }) => `${getValue()} años` },
  ], []);

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Cumpleaños</div>
          <div className="page-subtitle">
            Socios que cumplen años el {format(parseISO(fecha), "d 'de' MMMM", { locale: es })}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
            <div className="form-group">
              <label className="form-label">Día</label>
              <input type="date" className="form-input" value={fecha} onChange={onFecha} />
            </div>
            {fecha !== hoy() && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: 'flex-end' }}
                onClick={() => { setLoading(true); setFecha(hoy()); }}
              >
                Hoy
              </button>
            )}
          </div>
        </div>
      </div>

      <DataGrid
        title={`Cumpleaños ${fecha}`}
        columns={columns}
        data={rows}
        loading={loading}
        rowKey="socio_id"
        emptyText="Ningún socio cumple años este día."
      />
    </div>
  );
};
