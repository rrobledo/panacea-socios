import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Send, Save } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getPlantillas, crearCampania, enviarCampania } from '../../services/whatsappApi';
import { Field, InlineLoader, Modal } from '../../components/ui';
import {
  audienciaCompleta, audienciaParaApi, audienciaVacia, describirAudiencia, errorMessage, faltanValores, fmtMonto, fmtNum,
  variablesFijas,
} from './comun';
import { AudienciaEditor, BurbujaWhatsapp, PreviaAudiencia, SelectorPlantilla, ValoresFijos } from './componentes';

const PASOS = ['Plantilla', 'Audiencia', 'Revisar y enviar'];

export const NuevaCampaniaPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { state } = useLocation(); // { audiencia, nombres } desde "Por preferencia"
  const [paso, setPaso] = useState(0);
  const [plantillas, setPlantillas] = useState(null);
  const [plantilla, setPlantilla] = useState(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [audiencia, setAudiencia] = useState(() => ({ ...audienciaVacia(), ...(state?.audiencia || {}) }));
  const [nombres, setNombres] = useState(state?.nombres || {});
  const [valores, setValores] = useState({});
  const [previa, setPrevia] = useState(null);
  const [programar, setProgramar] = useState(false);
  const [programadaPara, setProgramadaPara] = useState('');
  const [confirmar, setConfirmar] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPlantillas({ estado: 'APROBADA' })
      .then(res => setPlantillas(res.data))
      .catch(err => { toast.error(errorMessage(err, 'No se pudieron cargar las plantillas.')); setPlantillas([]); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!plantillas) return <InlineLoader text="Cargando plantillas…" />;

  const faltan = faltanValores(plantilla, valores);
  const puedeSeguir = [
    !!plantilla && nombre.trim() && faltan.length === 0,
    audienciaCompleta(audiencia) && previa?.enviables > 0,
    true,
  ][paso];

  const crear = async () => {
    const res = await crearCampania({
      nombre: nombre.trim(), descripcion: descripcion.trim() || null, plantilla_id: plantilla.id,
      audiencia: audienciaParaApi(audiencia), valores_fijos: valores,
    });
    return res.data;
  };

  const guardarBorrador = async () => {
    setSaving(true);
    try {
      const c = await crear();
      toast.success('Campaña guardada como borrador.');
      navigate(`/whatsapp/campanias/${c.id}`);
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo guardar la campaña.'));
    } finally {
      setSaving(false);
    }
  };

  const enviar = async () => {
    setConfirmar(false);
    setSaving(true);
    let c;
    try {
      c = await crear();
      const fecha = programar && programadaPara ? new Date(programadaPara).toISOString() : null;
      const res = await enviarCampania(c.id, { programada_para: fecha });
      toast.success(res.data.estado === 'PROGRAMADA' ? 'Campaña programada.' : `Campaña iniciada: ${fmtNum(res.data.metricas.enviados)} enviados en el primer lote.`);
      navigate(`/whatsapp/campanias/${c.id}`);
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo iniciar la campaña.'));
      if (c) navigate(`/whatsapp/campanias/${c.id}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/whatsapp/campanias')} style={{ marginBottom: 6 }}><ArrowLeft size={14} /> Campañas</button>
          <div className="page-title">Nueva campaña</div>
          <div className="page-subtitle">Paso {paso + 1} de 3 · {PASOS[paso]}</div>
        </div>
      </div>

      <div className="tabs" style={{ marginBottom: 20 }}>
        {PASOS.map((p, i) => (
          <button key={p} className={`tab-btn ${paso === i ? 'active' : ''}`} disabled={i > paso} onClick={() => setPaso(i)}>{i + 1}. {p}</button>
        ))}
      </div>

      {paso === 0 && (
        <div className="card"><div className="card-body">
          <div className="grid grid-2">
            <Field label="Nombre de la campaña" required><input className="form-input" maxLength={200} value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej.: Promo chocolate julio" /></Field>
            <Field label="Descripción"><input className="form-input" maxLength={2000} value={descripcion} onChange={e => setDescripcion(e.target.value)} /></Field>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, margin: '8px 0' }}>Plantilla</div>
          <SelectorPlantilla plantillas={plantillas} value={plantilla} onChange={p => { setPlantilla(p); setValores({}); }} />
          {plantilla && variablesFijas(plantilla).length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Textos para esta campaña</div>
              <ValoresFijos plantilla={plantilla} valores={valores} onChange={setValores} />
            </div>
          )}
        </div></div>
      )}

      {paso === 1 && (
        <div className="card"><div className="card-body">
          <AudienciaEditor value={audiencia} onChange={setAudiencia} nombres={nombres} onNombres={setNombres} />
          <div className="divider" style={{ margin: '20px 0' }} />
          <PreviaAudiencia plantilla={plantilla} audiencia={audiencia} valoresFijos={valores} onAudienciaChange={setAudiencia} onResultado={setPrevia} />
        </div></div>
      )}

      {paso === 2 && previa && (
        <div className="card"><div className="card-body">
          <div className="grid grid-2">
            <div>
              <dl style={{ display: 'grid', gridTemplateColumns: '140px 1fr', rowGap: 8, fontSize: 14 }}>
                <dt style={{ color: 'var(--gray-500)' }}>Campaña</dt><dd>{nombre}</dd>
                <dt style={{ color: 'var(--gray-500)' }}>Plantilla</dt><dd>{plantilla.nombre}</dd>
                <dt style={{ color: 'var(--gray-500)' }}>Audiencia</dt><dd>{describirAudiencia(audienciaParaApi(audiencia))}</dd>
                <dt style={{ color: 'var(--gray-500)' }}>Destinatarios</dt><dd><b>{fmtNum(previa.enviables)}</b>{previa.excluidos ? ` (${fmtNum(previa.excluidos)} excluidos)` : ''}</dd>
                <dt style={{ color: 'var(--gray-500)' }}>Costo estimado</dt><dd>{previa.costo_estimado ? fmtMonto(previa.costo_estimado.monto, previa.costo_estimado.moneda) : '—'}</dd>
              </dl>
              <label className="flex items-center gap-2" style={{ marginTop: 20, cursor: 'pointer' }}>
                <input type="checkbox" checked={programar} onChange={e => setProgramar(e.target.checked)} /> Programar para más tarde
              </label>
              {programar && (
                <Field label="Fecha y hora de envío"><input type="datetime-local" className="form-input" value={programadaPara} onChange={e => setProgramadaPara(e.target.value)} /></Field>
              )}
            </div>
            {previa.muestras[0] && (
              <div>
                <div style={{ fontSize: 13, color: 'var(--gray-500)', marginBottom: 6 }}>Ejemplo para {previa.muestras[0].nombre_apellido}</div>
                <BurbujaWhatsapp texto={previa.muestras[0].texto} botones={plantilla.botones} />
              </div>
            )}
          </div>
        </div></div>
      )}

      <div className="flex gap-2 justify-end" style={{ marginTop: 20 }}>
        {paso > 0 && <button className="btn btn-secondary" onClick={() => setPaso(p => p - 1)}><ArrowLeft size={15} /> Anterior</button>}
        {paso < 2 && <button className="btn btn-primary" disabled={!puedeSeguir} onClick={() => setPaso(p => p + 1)}>Siguiente <ArrowRight size={15} /></button>}
        {paso === 2 && <>
          <button className="btn btn-secondary" onClick={guardarBorrador} disabled={saving}><Save size={15} /> Guardar borrador</button>
          <button className="btn btn-primary" onClick={() => setConfirmar(true)} disabled={saving || (programar && !programadaPara)}>
            <Send size={15} /> {programar ? 'Programar' : 'Enviar ahora'}
          </button>
        </>}
      </div>
      {paso === 0 && faltan.length > 0 && plantilla && <div style={{ fontSize: 12, color: 'var(--gray-500)', textAlign: 'right', marginTop: 6 }}>Completá {faltan.join(', ')}</div>}

      <Modal open={confirmar} onClose={() => setConfirmar(false)} title="Confirmar envío" size="sm"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setConfirmar(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={enviar}>Sí, {programar ? 'programar' : 'enviar'}</button>
        </>}>
        <p>Se va a enviar <b>“{plantilla?.nombre}”</b> a <b>{fmtNum(previa?.enviables)}</b> socios
          {previa?.costo_estimado ? <> con un costo estimado de <b>{fmtMonto(previa.costo_estimado.monto, previa.costo_estimado.moneda)}</b></> : ''}.
          {programar && programadaPara ? ` El envío empieza el ${new Date(programadaPara).toLocaleString('es-AR')}.` : ''}</p>
      </Modal>
    </div>
  );
};
