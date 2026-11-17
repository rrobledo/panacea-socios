import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Megaphone } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getCampanias } from '../../services/whatsappApi';
import { EmptyState, InlineLoader, Select } from '../../components/ui';
import { useSessionState } from '../../hooks/useSessionState';
import { useScrollRestore } from '../../hooks/useScrollRestore';
import { describirAudiencia, errorMessage, fmtFechaHora, fmtNum, fmtPct, opcionesEstado } from './comun';
import { EstadoBadge } from './componentes';

const Avance = ({ m }) => {
  const total = m.destinatarios || 0;
  const hechos = total - m.pendientes;
  return (
    <div title={`${fmtNum(hechos)} de ${fmtNum(total)} procesados`} style={{ minWidth: 120 }}>
      <div style={{ background: 'var(--gray-100)', borderRadius: 4, height: 8 }}>
        <div style={{ width: `${total ? (100 * hechos) / total : 0}%`, background: '#2a78d6', height: '100%', borderRadius: 4 }} />
      </div>
      <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>{fmtNum(hechos)} / {fmtNum(total)}</div>
    </div>
  );
};

export const CampaniasPage = () => {
  const toast = useToast();
  const navigate = useNavigate();
  const [estado, setEstado] = useSessionState('wa-campanias:estado', '');
  const [tipo, setTipo] = useSessionState('wa-campanias:tipo', '');
  const [desde, setDesde] = useSessionState('wa-campanias:desde', '');
  const [hasta, setHasta] = useSessionState('wa-campanias:hasta', '');
  const [resultado, setResultado] = useState({ clave: null, rows: [] });
  const clave = JSON.stringify([estado, tipo, desde, hasta]);
  const loading = resultado.clave !== clave;
  const rows = resultado.rows;
  useScrollRestore('wa-campanias:scroll', !loading);

  useEffect(() => {
    getCampanias({ estado: estado || undefined, tipo: tipo || undefined, desde: desde || undefined, hasta: hasta || undefined })
      .then(res => setResultado({ clave, rows: res.data }))
      .catch(err => { toast.error(errorMessage(err, 'No se pudieron cargar las campañas.')); setResultado({ clave, rows: [] }); });
  }, [clave]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Campañas de WhatsApp</div>
          <div className="page-subtitle">Cada campaña envía una plantilla aprobada a un grupo de socios</div>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => navigate('/whatsapp/envio-masivo')}>Envío masivo</button>
          <button className="btn btn-primary" onClick={() => navigate('/whatsapp/campanias/nueva')}><Plus size={15} /> Nueva campaña</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body flex gap-3" style={{ flexWrap: 'wrap' }}>
          <div className="form-group" style={{ minWidth: 180 }}>
            <label className="form-label">Estado</label>
            <Select options={opcionesEstado('campania')} value={estado} onChange={setEstado} placeholder="Todos" />
          </div>
          <div className="form-group" style={{ minWidth: 180 }}>
            <label className="form-label">Tipo</label>
            <Select options={[{ value: 'CAMPANIA', label: 'Campaña' }, { value: 'MASIVO', label: 'Envío masivo' }]} value={tipo} onChange={setTipo} placeholder="Todos" />
          </div>
          <div className="form-group"><label className="form-label">Creadas desde</label><input type="date" className="form-input" value={desde} onChange={e => setDesde(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Hasta</label><input type="date" className="form-input" value={hasta} onChange={e => setHasta(e.target.value)} /></div>
        </div>
      </div>

      {loading ? <InlineLoader text="Cargando campañas…" /> : rows.length === 0 ? (
        <div className="card"><EmptyState icon={Megaphone} title="No hay campañas" description="Creá una campaña o hacé un envío masivo."
          action={<button className="btn btn-primary" onClick={() => navigate('/whatsapp/campanias/nueva')}><Plus size={15} /> Nueva campaña</button>} /></div>
      ) : (
        <div className="card">
          <div className="table-container">
            <table>
              <thead><tr><th>Campaña</th><th>Plantilla</th><th>Estado</th><th>Avance</th><th>Entrega</th><th>Lectura</th><th>Fallidos</th><th>Creada</th></tr></thead>
              <tbody>
                {rows.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/whatsapp/campanias/${c.id}`)}>
                    <td style={{ fontWeight: 500 }}>
                      {c.nombre}{c.tipo === 'MASIVO' && <span className="badge badge-gray" style={{ marginLeft: 6 }}>Masivo</span>}
                      <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{describirAudiencia(c.audiencia)}</div>
                    </td>
                    <td>{c.plantilla?.nombre}</td>
                    <td><EstadoBadge tipo="campania" estado={c.estado} /></td>
                    <td>{c.estado === 'BORRADOR' ? '—' : <Avance m={c.metricas} />}</td>
                    <td>{fmtPct(c.metricas.tasa_entrega)}</td>
                    <td>{fmtPct(c.metricas.tasa_lectura)}</td>
                    <td>{fmtNum(c.metricas.fallidos)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtFechaHora(c.creado_en)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
