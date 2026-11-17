import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RefreshCw, Copy, Archive, FileText } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getPlantillas, sincronizarPlantillas, copiarPlantilla, eliminarPlantilla } from '../../services/whatsappApi';
import { ConfirmDialog, EmptyState, InlineLoader, Select } from '../../components/ui';
import { useSessionState } from '../../hooks/useSessionState';
import { errorMessage, fmtFechaHora, opcionesEstado } from './comun';
import { EstadoBadge } from './componentes';

export const PlantillasPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [estado, setEstado] = useSessionState('wa-plantillas:estado', '');
  const [categoria, setCategoria] = useSessionState('wa-plantillas:categoria', '');
  // Resultado con la clave de los filtros que lo originaron (si no coincide, está cargando)
  const [resultado, setResultado] = useState({ clave: null, rows: [] });
  const [sincronizando, setSincronizando] = useState(false);
  const [aArchivar, setAArchivar] = useState(null);
  const [version, setVersion] = useState(0);

  const clave = `${estado}|${categoria}|${version}`;
  const loading = resultado.clave !== clave;
  const rows = resultado.rows;

  useEffect(() => {
    getPlantillas({ estado: estado || undefined, categoria: categoria || undefined })
      .then(res => setResultado({ clave, rows: res.data }))
      .catch(err => { toast.error(errorMessage(err, 'No se pudieron cargar las plantillas.')); setResultado({ clave, rows: [] }); });
  }, [clave]); // eslint-disable-line react-hooks/exhaustive-deps

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const r = (await sincronizarPlantillas()).data;
      toast.success(`Sincronizado: ${r.actualizadas} actualizadas, ${r.importadas} importadas${r.omitidas ? `, ${r.omitidas} omitidas (con imagen o formato no soportado)` : ''}.`);
      setVersion(v => v + 1);
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo sincronizar con Meta.'));
    } finally {
      setSincronizando(false);
    }
  };

  const copiar = async (p) => {
    try {
      const res = await copiarPlantilla(p.id);
      navigate(`/whatsapp/plantillas/${res.data.id}`);
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo copiar la plantilla.'));
    }
  };

  const archivar = async () => {
    const p = aArchivar;
    setAArchivar(null);
    try {
      await eliminarPlantilla(p.id);
      toast.success(p.campanias || p.estado !== 'BORRADOR' ? 'Plantilla archivada.' : 'Plantilla eliminada.');
      setVersion(v => v + 1);
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo eliminar la plantilla.'));
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Plantillas de WhatsApp</div>
          <div className="page-subtitle">Mensajes reutilizables con variables del socio. Meta las revisa antes de poder usarlas (hasta 24 h).</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={sincronizar} disabled={sincronizando}>
            <RefreshCw size={15} className={sincronizando ? 'spin' : ''} /> Sincronizar con Meta
          </button>
          <button className="btn btn-primary" onClick={() => navigate('/whatsapp/plantillas/nueva')}><Plus size={15} /> Nueva plantilla</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body flex gap-3" style={{ flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: 200 }}>
            <label className="form-label">Estado</label>
            <Select options={opcionesEstado('plantilla')} value={estado} onChange={setEstado} placeholder="Todos" />
          </div>
          <div className="form-group" style={{ minWidth: 200 }}>
            <label className="form-label">Categoría</label>
            <Select options={[{ value: 'MARKETING', label: 'Marketing' }, { value: 'UTILITY', label: 'Utilidad' }]} value={categoria} onChange={setCategoria} placeholder="Todas" />
          </div>
        </div>
      </div>

      {loading ? <InlineLoader text="Cargando plantillas…" /> : rows.length === 0 ? (
        <div className="card"><EmptyState icon={FileText} title="No hay plantillas" description="Creá una nueva o sincronizá las que ya tenés en WhatsApp Manager." /></div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead><tr><th>Nombre</th><th>Nombre en Meta</th><th>Categoría</th><th>Estado</th><th>Campañas</th><th>Actualizada</th><th /></tr></thead>
              <tbody>
                {rows.map(p => (
                  <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/whatsapp/plantillas/${p.id}`)}>
                    <td style={{ fontWeight: 500 }}>
                      {p.nombre}
                      {p.origen === 'IMPORTADA' && <span className="badge badge-gray" style={{ marginLeft: 6 }}>Importada</span>}
                      <div style={{ fontSize: 12, color: 'var(--gray-500)', maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.cuerpo}</div>
                    </td>
                    <td><code>{p.nombre_meta}</code> <span style={{ color: 'var(--gray-500)', fontSize: 12 }}>{p.idioma}</span></td>
                    <td>{p.categoria === 'MARKETING' ? 'Marketing' : 'Utilidad'}</td>
                    <td>
                      <EstadoBadge tipo="plantilla" estado={p.estado} />
                      {p.motivo_rechazo && <div style={{ fontSize: 12, color: 'var(--danger)' }}>{p.motivo_rechazo}</div>}
                    </td>
                    <td>{p.campanias}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtFechaHora(p.actualizado_en || p.creado_en)}</td>
                    <td style={{ whiteSpace: 'nowrap', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <button className="btn btn-ghost btn-icon" title="Copiar" onClick={() => copiar(p)}><Copy size={15} /></button>
                      <button className="btn btn-ghost btn-icon" title="Archivar" onClick={() => setAArchivar(p)}><Archive size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog open={!!aArchivar} onCancel={() => setAArchivar(null)} onConfirm={archivar}
        title="Archivar plantilla"
        message={aArchivar && (aArchivar.campanias || aArchivar.estado !== 'BORRADOR'
          ? `“${aArchivar.nombre}” se va a archivar: deja de ofrecerse para nuevas campañas.`
          : `“${aArchivar.nombre}” se va a eliminar.`)} />
    </div>
  );
};
