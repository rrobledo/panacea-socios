import { useState, useEffect, useCallback } from 'react';
import { Coins, ShoppingBag, ChevronRight } from 'lucide-react';
import { getCreditos, getVentas, getVentaDetail } from '../../services/sociosApi';
import { InlineLoader, Modal } from '../ui';

const fmtFecha = (v) => {
  if (!v) return '—';
  return new Date(v).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
};

const fmtImporte = (v) => {
  if (v == null) return '—';
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v);
};

// ── Créditos ──────────────────────────────────────────────────────────────
const CreditosCard = ({ socioId }) => {
  const [creditos, setCreditos] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);

  const fetchCreditos = useCallback(() => {
    getCreditos(socioId)
      .then(res => setCreditos(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [socioId]);

  const retryCreditos = () => { setLoading(true); setError(false); fetchCreditos(); };

  useEffect(() => { fetchCreditos(); }, [fetchCreditos]);

  const current    = creditos?.current ?? 0;
  const nextReward = creditos?.nextReward ?? 0;
  const pct = nextReward > 0 ? Math.min(100, Math.round((current / nextReward) * 100)) : 0;

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Coins size={18} /> Créditos
        </span>
      </div>
      <div className="card-body">
        {loading ? (
          <InlineLoader text="Cargando créditos..." />
        ) : error ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, color: 'var(--gray-500)' }}>No se pudieron cargar los créditos.</span>
            <button className="btn btn-secondary btn-sm" onClick={retryCreditos}>Reintentar</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 36, fontWeight: 700, color: 'var(--primary)', lineHeight: 1.1 }}>
              {current}
            </div>
            {nextReward > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--gray-500)', margin: '12px 0 6px' }}>
                  <span>Progreso hacia la próxima recompensa</span>
                  <span>{current} / {nextReward}</span>
                </div>
                <div style={{ height: 8, borderRadius: 4, background: 'var(--gray-100)', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', transition: 'width .4s' }} />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

// ── Detalle de una compra ─────────────────────────────────────────────────
const VentaDetalleModal = ({ venta, onClose }) => {
  const [detalle, setDetalle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    getVentaDetail(venta.id)
      .then(res => setDetalle(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [venta.id]);

  // El detalle viene de un cruce con documentos: si no matchea, vuelve una fila vacía
  const lineas = detalle.filter(d => d.producto || d.categoria);

  return (
    <Modal open onClose={onClose} title={`Compra #${venta.id}`} size="lg">
      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16, fontSize: 14 }}>
        <div><span style={{ color: 'var(--gray-500)' }}>Fecha:</span> <strong>{fmtFecha(venta.fecha)}</strong></div>
        <div><span style={{ color: 'var(--gray-500)' }}>Lugar:</span> <strong>{venta.lugar || '—'}</strong></div>
        <div><span style={{ color: 'var(--gray-500)' }}>Importe:</span> <strong>{fmtImporte(venta.importe)}</strong></div>
      </div>
      {loading ? (
        <InlineLoader text="Cargando detalle..." />
      ) : error ? (
        <div className="alert alert-danger">No se pudo cargar el detalle de la compra.</div>
      ) : lineas.length === 0 ? (
        <div style={{ color: 'var(--gray-500)', fontSize: 14 }}>Sin detalle de productos para esta compra.</div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Producto</th>
                <th>Cantidad</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((d, i) => (
                <tr key={i}>
                  <td>{d.categoria || '—'}</td>
                  <td>{d.producto || '—'}</td>
                  <td>{d.cantidad ?? '—'}</td>
                  <td style={{ fontWeight: 600 }}>{fmtImporte(d.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
};

// ── Historial de compras ──────────────────────────────────────────────────
const ComprasCard = ({ socioId }) => {
  const [ventas, setVentas]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [ventaSel, setVentaSel] = useState(null);

  const fetchVentas = useCallback(() => {
    getVentas(socioId)
      .then(res => setVentas([...res.data].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [socioId]);

  const retryVentas = () => { setLoading(true); setError(false); fetchVentas(); };

  useEffect(() => { fetchVentas(); }, [fetchVentas]);

  const total = ventas.reduce((acc, v) => acc + Number(v.importe || 0), 0);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShoppingBag size={18} /> Compras
        </span>
        {!loading && !error && ventas.length > 0 && (
          <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
            {ventas.length} {ventas.length === 1 ? 'compra' : 'compras'} — Total {fmtImporte(total)}
          </span>
        )}
      </div>
      {loading ? (
        <div className="card-body"><InlineLoader text="Cargando compras..." /></div>
      ) : error ? (
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: 'var(--gray-500)' }}>No se pudieron cargar las compras.</span>
          <button className="btn btn-secondary btn-sm" onClick={retryVentas}>Reintentar</button>
        </div>
      ) : ventas.length === 0 ? (
        <div className="card-body" style={{ fontSize: 14, color: 'var(--gray-500)' }}>
          El socio no tiene compras registradas.
        </div>
      ) : (
        <div className="table-container" style={{ maxHeight: 320, overflowY: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Lugar</th>
                <th>Importe</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ventas.map(v => (
                <tr key={v.id} onClick={() => setVentaSel(v)} style={{ cursor: 'pointer' }}>
                  <td>{fmtFecha(v.fecha)}</td>
                  <td>{v.lugar || '—'}</td>
                  <td style={{ fontWeight: 600 }}>{fmtImporte(v.importe)}</td>
                  <td style={{ textAlign: 'right', color: 'var(--primary)', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    Ver detalle <ChevronRight size={12} style={{ verticalAlign: 'middle' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {ventaSel && <VentaDetalleModal venta={ventaSel} onClose={() => setVentaSel(null)} />}
    </div>
  );
};

export const SocioResumen = ({ socioId }) => (
  <div className="socio-resumen">
    <CreditosCard key={`c-${socioId}`} socioId={socioId} />
    <ComprasCard key={`v-${socioId}`} socioId={socioId} />
  </div>
);
