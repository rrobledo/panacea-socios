import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { Cake, Download } from 'lucide-react';
import { es } from 'date-fns/locale';
import { useToast } from '../context/ToastContext';
import { getRankingCompras, getCumpleanios } from '../services/sociosApi';
import { DataGrid } from '../components/grid/DataGrid';
import { InlineLoader } from '../components/ui';

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

// ── Cumpleaños por rango de días ──────────────────────────────────────────
const rangoSemana = () => [
  format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
];
const rangoMes = () => [
  format(startOfMonth(new Date()), 'yyyy-MM-dd'),
  format(endOfMonth(new Date()), 'yyyy-MM-dd'),
];

const exportarCsv = (rows, nombre) => {
  const cols = [
    ['fecha_cumple', 'Fecha cumpleaños'], ['nombre_apellido', 'Nombre y Apellido'], ['dni', 'DNI'],
    ['telefono', 'Teléfono'], ['email', 'Email'], ['fecha_nacimiento', 'Fecha Nac.'], ['edad', 'Cumple (años)'],
  ];
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.map(c => esc(c[1])).join(','), ...rows.map(r => cols.map(c => esc(r[c[0]])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  a.download = `${nombre}.csv`;
  a.click();
};

export const CumpleaniosPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [desde, setDesde]     = useState(hoy);
  const [hasta, setHasta]     = useState(hoy);
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCumpleanios(desde, hasta)
      .then(res => setRows(res.data))
      .catch(() => toast.error('No se pudo cargar el reporte.'))
      .finally(() => setLoading(false));
  }, [desde, hasta]);

  const setRango = (d, h) => {
    if (d === desde && h === hasta) return;
    setLoading(true);
    setDesde(d);
    setHasta(h);
  };

  // Si "desde" queda después de "hasta" (o al revés), se arrastra el otro extremo
  const onDesde = (e) => { const v = e.target.value; if (v) setRango(v, v > hasta ? v : hasta); };
  const onHasta = (e) => { const v = e.target.value; if (v) setRango(v < desde ? v : desde, v); };

  const grupos = useMemo(() => {
    const map = new Map();
    rows.forEach(r => {
      if (!map.has(r.fecha_cumple)) map.set(r.fecha_cumple, []);
      map.get(r.fecha_cumple).push(r);
    });
    return [...map.entries()];
  }, [rows]);

  const fmtDia = (f) => format(parseISO(f), "EEEE d 'de' MMMM", { locale: es });
  const titulo = desde === hasta
    ? `Socios que cumplen años el ${format(parseISO(desde), "d 'de' MMMM", { locale: es })}`
    : `Socios que cumplen años del ${format(parseISO(desde), "d 'de' MMMM", { locale: es })} al ${format(parseISO(hasta), "d 'de' MMMM", { locale: es })}`;

  const [semDesde, semHasta] = rangoSemana();
  const [mesDesde, mesHasta] = rangoMes();
  const atajos = [
    { label: 'Hoy', d: hoy(), h: hoy() },
    { label: 'Esta semana', d: semDesde, h: semHasta },
    { label: 'Este mes', d: mesDesde, h: mesHasta },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Cumpleaños</div>
          <div className="page-subtitle">{titulo}</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
            <div className="form-group">
              <label className="form-label">Desde</label>
              <input type="date" className="form-input" value={desde} onChange={onDesde} />
            </div>
            <div className="form-group">
              <label className="form-label">Hasta</label>
              <input type="date" className="form-input" value={hasta} onChange={onHasta} />
            </div>
            <div className="flex gap-2" style={{ alignSelf: 'flex-end', flexWrap: 'wrap' }}>
              {atajos.map(a => (
                <button
                  key={a.label}
                  className={`btn btn-sm ${desde === a.d && hasta === a.h ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setRango(a.d, a.h)}
                >
                  {a.label}
                </button>
              ))}
            </div>
            {!loading && rows.length > 0 && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ alignSelf: 'flex-end', marginLeft: 'auto' }}
                onClick={() => exportarCsv(rows, `cumpleanios_${desde}_${hasta}`)}
              >
                <Download size={14} /> Exportar CSV
              </button>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <InlineLoader text="Buscando cumpleaños..." />
      ) : grupos.length === 0 ? (
        <div className="card">
          <div className="card-body" style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            Ningún socio cumple años en este período.
          </div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 12 }}>
            {rows.length} cumpleaños en {grupos.length} {grupos.length === 1 ? 'día' : 'días'}
          </div>
          {grupos.map(([dia, socios]) => (
            <div key={dia} className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8, textTransform: 'capitalize' }}>
                  <Cake size={18} /> {fmtDia(dia)}
                </span>
                <span className="badge badge-primary">{socios.length}</span>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre y Apellido</th>
                      <th>DNI</th>
                      <th>Teléfono</th>
                      <th>Email</th>
                      <th>Fecha Nac.</th>
                      <th>Cumpleaños</th>
                      <th>Cumple</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {socios.map(s => (
                      <tr
                        key={s.socio_id}
                        onClick={() => navigate(`/?dni=${encodeURIComponent(s.dni)}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ fontWeight: 500 }}>{s.nombre_apellido}</td>
                        <td>{s.dni}</td>
                        <td>{s.telefono || '—'}</td>
                        <td>{s.email || '—'}</td>
                        <td>{format(parseISO(s.fecha_nacimiento), 'dd/MM/yyyy')}</td>
                        <td>{format(parseISO(s.fecha_cumple), 'dd/MM/yyyy')}</td>
                        <td>{s.edad} años</td>
                        <td style={{ textAlign: 'right', color: 'var(--primary)', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                          Ver socio →
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
};
