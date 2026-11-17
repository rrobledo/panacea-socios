import { useState, useEffect, useCallback } from 'react';
import { Coins, ShoppingBag, ChevronRight, Sparkles, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getMensajesWhatsapp } from '../../services/whatsappApi';
import { useEsAdmin } from '../../hooks/useEsAdmin';
import { getSocio, getVentas, getVentaDetail, getPreferenciasSocio } from '../../services/sociosApi';
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

// ── Puntos: saldo actual del socio ────────────────────────────────────────
const fmtPuntos = (v) => new Intl.NumberFormat('es-AR').format(v);

const PuntosCard = ({ socioId }) => {
  const [saldo, setSaldo]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    getSocio(socioId)
      .then(res => setSaldo(res.data.saldo_puntos))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [socioId, version]);

  const retry = () => { setLoading(true); setError(false); setVersion(v => v + 1); };

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Coins size={18} /> Puntos
        </span>
      </div>
      <div className="card-body">
        {loading ? (
          <InlineLoader text="Cargando puntos..." />
        ) : error ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, color: 'var(--gray-500)' }}>No se pudieron cargar los puntos.</span>
            <button className="btn btn-secondary btn-sm" onClick={retry}>Reintentar</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 4 }}>Puntos disponibles</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--primary)', lineHeight: 1.1 }}>
              {saldo == null ? '—' : `${fmtPuntos(saldo)} pts`}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── Gustos y preferencias (perfil generado con IA a partir de las compras) ─
const PreferenciasCard = ({ socioId }) => {
  const [perfil, setPerfil]   = useState(null);
  const [estado, setEstado]   = useState('cargando'); // cargando | ok | sin_perfil | error
  const [version, setVersion] = useState(0);

  useEffect(() => {
    getPreferenciasSocio(socioId)
      .then(res => { setPerfil(res.data); setEstado('ok'); })
      .catch(err => setEstado(err?.response?.data?.detail?.code === 'PERFIL_NO_DISPONIBLE' ? 'sin_perfil' : 'error'));
  }, [socioId, version]);

  const retry = () => { setEstado('cargando'); setVersion(v => v + 1); };
  const lista = (titulo, items) => items?.length > 0 && (
    <div style={{ fontSize: 13, marginTop: 10 }}>
      <span style={{ color: 'var(--gray-500)' }}>{titulo}: </span>{items.join(' · ')}
    </div>
  );

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={18} /> Gustos y preferencias
        </span>
      </div>
      <div className="card-body">
        {estado === 'cargando' ? (
          <InlineLoader text="Cargando preferencias..." />
        ) : estado === 'sin_perfil' ? (
          <span style={{ fontSize: 14, color: 'var(--gray-500)' }}>
            Todavía no hay perfil para este socio. Se genera automáticamente a partir de sus compras.
          </span>
        ) : estado === 'error' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 14, color: 'var(--gray-500)' }}>No se pudieron cargar las preferencias.</span>
            <button className="btn btn-secondary btn-sm" onClick={retry}>Reintentar</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: 14, margin: 0, lineHeight: 1.5 }}>{perfil.resumen}</p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
              {perfil.etiquetas.map(e => <span key={e} className="badge badge-primary">{e}</span>)}
            </div>
            {lista('Categorías favoritas', perfil.categorias_favoritas)}
            {lista('Productos favoritos', perfil.productos_favoritos)}
            <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 12 }}>
              Actualizado el {new Date(perfil.generado_en).toLocaleDateString('es-AR')} · basado en {perfil.ventas_analizadas}{' '}
              {perfil.ventas_analizadas === 1 ? 'compra' : 'compras'} · generado con IA, puede contener imprecisiones
            </div>
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
const ComprasCard = ({ ventas, loading, error, onRetry }) => {
  const [ventaSel, setVentaSel] = useState(null);

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ShoppingBag size={18} /> Compras
          {!loading && !error && ventas.length > 0 && (
            <span className="badge badge-gray">{ventas.length}</span>
          )}
        </span>
      </div>
      {loading ? (
        <div className="card-body"><InlineLoader text="Cargando compras..." /></div>
      ) : error ? (
        <div className="card-body" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: 'var(--gray-500)' }}>No se pudieron cargar las compras.</span>
          <button className="btn btn-secondary btn-sm" onClick={onRetry}>Reintentar</button>
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

// ── WhatsApp: estado del número y últimos mensajes ───────────────────────
const ESTADO_WA = {
  DESCONOCIDO: ['Sin verificar', 'gray'], VALIDO: ['WhatsApp válido', 'success'],
  INVALIDO: ['Número inválido', 'danger'], BAJA: ['Dado de baja de promociones', 'warning'],
};
const ESTADO_MSJ = {
  PENDIENTE: 'Pendiente', ENVIADO: 'Enviado', ENTREGADO: 'Entregado', LEIDO: 'Leído', FALLIDO: 'Fallido', CANCELADO: 'Cancelado',
};

const WhatsappCard = ({ socioId }) => {
  const esAdmin = useEsAdmin();
  const [socio, setSocio]       = useState(null);
  const [mensajes, setMensajes] = useState(null);

  useEffect(() => {
    getSocio(socioId).then(res => setSocio(res.data)).catch(() => {});
  }, [socioId]);
  useEffect(() => {
    if (!esAdmin) return;
    getMensajesWhatsapp({ socio_id: socioId, limit: 5 }).then(res => setMensajes(res.data)).catch(() => {});
  }, [socioId, esAdmin]);

  if (!socio) return null;
  const [label, color] = ESTADO_WA[socio.whatsapp_estado] || ESTADO_WA.DESCONOCIDO;
  // Para quien no es admin, solo se avisa si el número tiene un problema (para corregirlo en el mostrador)
  if (!esAdmin) {
    if (!['INVALIDO', 'BAJA'].includes(socio.whatsapp_estado)) return null;
    return (
      <div className={`alert alert-${color === 'danger' ? 'danger' : 'warning'}`} style={{ gridColumn: '1 / -1' }}>
        WhatsApp: {label}{socio.whatsapp_estado === 'INVALIDO' ? ' — pedile al socio que confirme su celular.' : '.'}
      </div>
    );
  }
  return (
    <div className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-header">
        <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <MessageCircle size={18} /> WhatsApp <span className={`badge badge-${color}`}>{label}</span>
        </span>
        {mensajes?.total > 0 && <Link to="/whatsapp/mensajes" className="btn btn-ghost btn-sm"
          onClick={() => { try { sessionStorage.setItem('wa-mensajes:busqueda', JSON.stringify({ q: socio.dni, estado: '', error_codigo: '', desde: '', hasta: '', skip: 0 })); } catch { /* sin storage */ } }}>
          Ver todos ({mensajes.total})</Link>}
      </div>
      <div className="card-body" style={{ fontSize: 13 }}>
        {socio.whatsapp_estado_motivo && <div style={{ color: 'var(--gray-500)', marginBottom: 8 }}>{socio.whatsapp_estado_motivo}</div>}
        {!mensajes ? null : mensajes.items.length === 0 ? (
          <span style={{ color: 'var(--gray-500)' }}>Todavía no recibió mensajes.</span>
        ) : mensajes.items.map(m => (
          <div key={m.id} style={{ display: 'flex', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--gray-100)' }}>
            <span style={{ color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>{fmtFecha(m.enviado_en || m.creado_en)}</span>
            <span style={{ flex: 1 }}>{m.campania_nombre || 'Prueba'}</span>
            <span style={{ fontWeight: 500 }}>{ESTADO_MSJ[m.estado] || m.estado}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Perfil destacado (arriba del formulario de venta): puntos, gustos y preferencias, y WhatsApp.
const Perfil = ({ socioId }) => (
  <div className="socio-resumen" style={{ marginTop: 0, marginBottom: 20 }}>
    <PuntosCard socioId={socioId} />
    <PreferenciasCard socioId={socioId} />
    <WhatsappCard socioId={socioId} />
  </div>
);

// Historial de compras (al final de la pantalla).
const Compras = ({ socioId }) => {
  const [ventas, setVentas]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  const fetchVentas = useCallback(() => {
    getVentas(socioId)
      .then(res => setVentas([...res.data].sort((a, b) => new Date(b.fecha) - new Date(a.fecha))))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [socioId]);

  const retryVentas = () => { setLoading(true); setError(false); fetchVentas(); };

  useEffect(() => { fetchVentas(); }, [fetchVentas]);

  return (
    <div style={{ marginTop: 20 }}>
      <ComprasCard ventas={ventas} loading={loading} error={error} onRetry={retryVentas} />
    </div>
  );
};

// `key` reinicia el estado al cambiar de socio.
export const SocioPerfil  = ({ socioId }) => <Perfil key={socioId} socioId={socioId} />;
export const SocioCompras = ({ socioId }) => <Compras key={socioId} socioId={socioId} />;
