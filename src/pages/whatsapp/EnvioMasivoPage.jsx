import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { getPlantillas, envioMasivo } from '../../services/whatsappApi';
import { InlineLoader, Modal } from '../../components/ui';
import {
  audienciaCompleta, audienciaParaApi, audienciaVacia, errorMessage, faltanValores, fmtMonto, fmtNum, variablesFijas,
} from './comun';
import { AudienciaEditor, PreviaAudiencia, SelectorPlantilla, ValoresFijos } from './componentes';

export const EnvioMasivoPage = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [plantillas, setPlantillas] = useState(null);
  const [plantilla, setPlantilla] = useState(null);
  const [audiencia, setAudiencia] = useState(audienciaVacia('TODOS'));
  const [nombres, setNombres] = useState({});
  const [valores, setValores] = useState({});
  const [previa, setPrevia] = useState(null);
  const [confirmar, setConfirmar] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    getPlantillas({ estado: 'APROBADA' })
      .then(res => setPlantillas(res.data))
      .catch(err => { toast.error(errorMessage(err, 'No se pudieron cargar las plantillas.')); setPlantillas([]); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!plantillas) return <InlineLoader text="Cargando plantillas…" />;

  const faltan = faltanValores(plantilla, valores);
  const listo = plantilla && faltan.length === 0 && audienciaCompleta(audiencia) && previa?.enviables > 0;

  const enviar = async () => {
    setConfirmar(false);
    setEnviando(true);
    try {
      const res = await envioMasivo({ plantilla_id: plantilla.id, audiencia: audienciaParaApi(audiencia), valores_fijos: valores });
      toast.success(`Envío iniciado: ${fmtNum(res.data.metricas.enviados)} enviados en el primer lote.`);
      navigate(`/whatsapp/campanias/${res.data.id}`);
    } catch (err) {
      toast.error(errorMessage(err, 'No se pudo iniciar el envío.'));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Envío masivo</div>
          <div className="page-subtitle">Mandá una plantilla a todos los socios, a una sucursal, a los que cumplen años o a una lista, sin armar una campaña</div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><span className="card-title">1. Plantilla</span></div>
        <div className="card-body">
          <SelectorPlantilla plantillas={plantillas} value={plantilla} onChange={p => { setPlantilla(p); setValores({}); }} />
          {plantilla && variablesFijas(plantilla).length > 0 && (
            <div style={{ marginTop: 16 }}><ValoresFijos plantilla={plantilla} valores={valores} onChange={setValores} /></div>
          )}
        </div>
      </div>

      {plantilla && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><span className="card-title">2. Destinatarios</span></div>
          <div className="card-body">
            <AudienciaEditor value={audiencia} onChange={setAudiencia} tipos={['TODOS', 'CUMPLEANIOS', 'MANUAL']} nombres={nombres} onNombres={setNombres} />
            <div className="divider" style={{ margin: '20px 0' }} />
            <PreviaAudiencia plantilla={plantilla} audiencia={audiencia} valoresFijos={valores} onAudienciaChange={setAudiencia} onResultado={setPrevia} />
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2 items-center">
        {plantilla && faltan.length > 0 && <span style={{ fontSize: 12, color: 'var(--gray-500)' }}>Completá {faltan.join(', ')}</span>}
        <button className="btn btn-primary" disabled={!listo || enviando} onClick={() => setConfirmar(true)}>
          <Send size={15} /> {enviando ? 'Enviando…' : `Enviar${previa?.enviables ? ` a ${fmtNum(previa.enviables)} socios` : ''}`}
        </button>
      </div>

      <Modal open={confirmar} onClose={() => setConfirmar(false)} title="Confirmar envío masivo" size="sm"
        footer={<>
          <button className="btn btn-secondary" onClick={() => setConfirmar(false)}>Cancelar</button>
          <button className="btn btn-primary" onClick={enviar}>Sí, enviar</button>
        </>}>
        <p>Se va a enviar <b>“{plantilla?.nombre}”</b> a <b>{fmtNum(previa?.enviables)}</b> socios
          {previa?.costo_estimado ? <> con un costo estimado de <b>{fmtMonto(previa.costo_estimado.monto, previa.costo_estimado.moneda)}</b></> : ''}.</p>
      </Modal>
    </div>
  );
};
