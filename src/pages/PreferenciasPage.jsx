import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, Download } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { buscarSociosPorPreferencia, getEtiquetasPreferencias } from '../services/sociosApi';
import { InlineLoader, LugarFilter } from '../components/ui';
import { useSessionState } from '../hooks/useSessionState';
import { useScrollRestore } from '../hooks/useScrollRestore';

const POR_PAGINA = 100;
const ETIQUETAS_VISIBLES = 30;
const CAMPOS = { etiqueta: 'Preferencia', producto: 'Producto', categoria: 'Categoría', resumen: 'Resumen' };

const fmtFecha = (v) => (v ? new Date(v).toLocaleDateString('es-AR') : '—');
const textoCoincidencias = (cs) => cs.map(c => `${CAMPOS[c.campo] || c.campo}: ${c.valor}`).join(' · ');

const exportarCsv = (rows, nombre) => {
  const cols = [
    ['nombre_apellido', 'Nombre y Apellido'], ['dni', 'DNI'], ['telefono', 'Teléfono'], ['email', 'Email'],
    ['coincidencias', 'Coincidencias'], ['lugar_principal', 'Sucursal'], ['perfil_generado_en', 'Perfil actualizado'],
  ];
  const valor = (r, k) => (k === 'coincidencias' ? textoCoincidencias(r.coincidencias)
    : k === 'perfil_generado_en' ? fmtFecha(r[k]) : r[k]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.map(c => esc(c[1])).join(','), ...rows.map(r => cols.map(c => esc(valor(r, c[0]))).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  a.download = `${nombre}.csv`;
  a.click();
};

export const SociosPorPreferenciaPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  // Filtros y última búsqueda se recuerdan al ir a ver un socio y volver
  const [texto, setTexto]               = useSessionState('reporte-preferencias:texto', '');
  const [incluirResumen, setIncluirResumen] = useSessionState('reporte-preferencias:resumen', false);
  const [lugar, setLugar]               = useSessionState('reporte-preferencias:lugar', ''); // sucursal donde más compra ('' = todas)
  const [busqueda, setBusqueda]         = useSessionState('reporte-preferencias:busqueda', null); // { q, incluirResumen, lugar, skip }
  const [rows, setRows]                 = useState([]);
  const [loading, setLoading]           = useState(() => busqueda != null);
  useScrollRestore('reporte-preferencias:scroll', !loading);
  const [etiquetas, setEtiquetas]       = useState([]);
  const [verTodas, setVerTodas]         = useState(false);

  useEffect(() => {
    getEtiquetasPreferencias(lugar)
      .then(res => setEtiquetas(res.data))
      .catch(() => toast.error('No se pudieron cargar las preferencias disponibles.'));
  }, [lugar]);

  // Al volver a la pantalla, repetir la última búsqueda para mostrar los mismos resultados
  useEffect(() => {
    if (!busqueda) return;
    buscarSociosPorPreferencia({ ...busqueda, limit: POR_PAGINA })
      .then(res => setRows(res.data))
      .catch(() => toast.error('No se pudo realizar la búsqueda. Intentá de nuevo.'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- solo al montar

  const buscar = async (params) => {
    setBusqueda(params);
    setLoading(true);
    try {
      const res = await buscarSociosPorPreferencia({ ...params, limit: POR_PAGINA });
      setRows(res.data);
    } catch {
      toast.error('No se pudo realizar la búsqueda. Intentá de nuevo.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const q = texto.trim();
  const puedeBuscar = q.length >= 2 && !loading;
  const onBuscar = () => puedeBuscar && buscar({ q, incluirResumen, lugar, skip: 0 });
  const onEtiqueta = (etiqueta) => { setTexto(etiqueta); buscar({ q: etiqueta, incluirResumen, lugar, skip: 0 }); };
  // Cambiar la sucursal repite la última búsqueda desde la primera página
  const onLugar = (v) => { setLugar(v); if (busqueda) buscar({ ...busqueda, lugar: v, skip: 0 }); };
  const irAPagina = (skip) => buscar({ ...busqueda, skip });

  const visibles = verTodas ? etiquetas : etiquetas.slice(0, ETIQUETAS_VISIBLES);
  const pagina = busqueda ? Math.floor(busqueda.skip / POR_PAGINA) + 1 : 1;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Socios por preferencia</div>
          <div className="page-subtitle">Buscá socios según los productos y gustos de su perfil (generado con IA a partir de sus compras)</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body">
          <div className="flex gap-3 items-center" style={{ flexWrap: 'wrap' }}>
            <div className="form-group" style={{ flex: 1, minWidth: 240 }}>
              <label className="form-label">Producto, categoría o preferencia</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej.: chocolate amargo, sin tacc, frutos secos"
                value={texto}
                maxLength={100}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onBuscar()}
                autoFocus
              />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, alignSelf: 'flex-end', marginBottom: 10 }}>
              <input type="checkbox" checked={incluirResumen} onChange={e => setIncluirResumen(e.target.checked)} />
              Buscar también en el resumen
            </label>
            <LugarFilter label="Sucursal donde más compra" value={lugar} onChange={onLugar} disabled={loading} />
            <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={onBuscar} disabled={!puedeBuscar}>
              <Search size={16} /> Buscar
            </button>
          </div>

          {etiquetas.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginBottom: 8 }}>Preferencias más comunes</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {visibles.map(e => (
                  <button
                    key={e.etiqueta}
                    className={`btn btn-sm ${busqueda?.q === e.etiqueta ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => onEtiqueta(e.etiqueta)}
                    disabled={loading}
                  >
                    {e.etiqueta} <span style={{ opacity: 0.7 }}>({e.socios})</span>
                  </button>
                ))}
                {etiquetas.length > ETIQUETAS_VISIBLES && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setVerTodas(v => !v)}>
                    {verTodas ? 'Ver menos' : `Ver todas (${etiquetas.length})`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <InlineLoader text="Buscando socios..." />
      ) : !busqueda ? (
        <div className="card">
          <div className="card-body" style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            {etiquetas.length === 0
              ? 'Todavía no hay perfiles de preferencias generados.'
              : 'Escribí un producto o preferencia, o elegí una de la lista.'}
          </div>
        </div>
      ) : rows.length === 0 && busqueda.skip === 0 ? (
        <div className="card">
          <div className="card-body" style={{ color: 'var(--gray-500)', fontSize: 14 }}>
            Ningún socio coincide con “{busqueda.q}”{busqueda.lugar ? ` en ${busqueda.lugar}` : ''}.
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <span className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} /> “{busqueda.q}”{busqueda.lugar ? ` · ${busqueda.lugar}` : ''}
            </span>
            <div className="flex gap-2 items-center">
              <span style={{ fontSize: 13, color: 'var(--gray-500)' }}>
                {rows.length} {rows.length === 1 ? 'socio' : 'socios'}{pagina > 1 || rows.length === POR_PAGINA ? ` · página ${pagina}` : ''}
              </span>
              {rows.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => exportarCsv(rows, `socios_preferencia_${busqueda.q}_p${pagina}`)}>
                  <Download size={14} /> Exportar CSV
                </button>
              )}
            </div>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Nombre y Apellido</th>
                  <th>DNI</th>
                  <th>Teléfono</th>
                  <th>Email</th>
                  <th>Coincidencias</th>
                  <th>Sucursal</th>
                  <th>Perfil</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map(s => (
                  <tr key={s.socio_id} onClick={() => navigate(`/?dni=${encodeURIComponent(s.dni)}`)} style={{ cursor: 'pointer' }}>
                    <td style={{ fontWeight: 500 }}>{s.nombre_apellido}</td>
                    <td>{s.dni}</td>
                    <td>{s.telefono || '—'}</td>
                    <td>{s.email || '—'}</td>
                    <td style={{ fontSize: 13 }}>
                      {s.coincidencias.map((c, i) => (
                        <div key={i}><span style={{ color: 'var(--gray-500)' }}>{CAMPOS[c.campo] || c.campo}:</span> {c.valor}</div>
                      ))}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>{s.lugar_principal || '—'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtFecha(s.perfil_generado_en)}</td>
                    <td style={{ textAlign: 'right', color: 'var(--primary)', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                      Ver socio →
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(pagina > 1 || rows.length === POR_PAGINA) && (
            <div className="card-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="btn btn-secondary btn-sm" disabled={pagina === 1} onClick={() => irAPagina(busqueda.skip - POR_PAGINA)}>
                Anterior
              </button>
              <button className="btn btn-secondary btn-sm" disabled={rows.length < POR_PAGINA} onClick={() => irAPagina(busqueda.skip + POR_PAGINA)}>
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
