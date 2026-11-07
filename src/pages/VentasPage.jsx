import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, ShoppingCart, AlertCircle, CheckCircle2, User, Gift } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { buscarPorDni, buscarPorNombre, registrarVenta, getBeneficiosDisponibles } from '../services/sociosApi';
import { InlineLoader } from '../components/ui';
import { SocioResumen } from '../components/socio/SocioResumen';

const LUGARES = ['Villa Allende', 'Villa Carlos Paz', 'Villa General Belgrano'];

const fmtImporte = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(v || 0);

// Mensaje de error de negocio del backend: { detail: { code, message } }
const errorMessage = (err, fallback) => err?.response?.data?.detail?.message || fallback;

// Por qué un beneficio no se puede usar (códigos del backend)
const MOTIVOS = {
  SALDO_INSUFICIENTE: 'Puntos insuficientes',
  LIMITE_ALCANZADO: 'Ya usó este beneficio',
  PROGRAMA_INACTIVO: 'Programa de puntos inactivo',
  SIN_STOCK: 'Sin stock',
  BENEFICIO_NO_DISPONIBLE: 'No disponible',
};
// Errores al registrar que pueden deberse a un listado desactualizado: se vuelve a pedir.
const ERRORES_BENEFICIO = new Set([...Object.keys(MOTIVOS), 'BENEFICIO_NO_ENCONTRADO']);

// Mismo cálculo que el backend: porcentaje con tope opcional, redondeado a centavos.
const calcularDescuento = (b, monto) => {
  if (!b || !(monto > 0)) return 0;
  let d = monto * Number(b.porcentaje_descuento) / 100;
  if (b.tope_descuento != null) d = Math.min(d, Number(b.tope_descuento));
  return Math.round(d * 100) / 100;
};

const formatFecha = (f) => {
  if (!f) return '—';
  try { return new Date(f).toLocaleDateString('es-AR'); } catch { return f; }
};

export const VentasPage = () => {
  const toast = useToast();
  const dniRef = useRef(null);
  // Permite abrir la consulta con un socio ya buscado: /?dni=12345678
  const [searchParams, setSearchParams] = useSearchParams();
  const [dniParam] = useState(() => searchParams.get('dni')?.trim() || '');

  const [searchMode, setSearchMode] = useState('dni');
  const [dniValue, setDniValue]     = useState(dniParam);
  const [nameValue, setNameValue]   = useState('');
  const [searching, setSearching]   = useState(!!dniParam);
  const [socios, setSocios]         = useState(null);
  const [selectedSocio, setSelectedSocio] = useState(null);

  const [lugar, setLugar]       = useState('');
  const [importe, setImporte]   = useState('');
  const [registering, setRegistering] = useState(false);

  // La carga de cupones está deshabilitada por ahora (ver validarCupon en sociosApi para reactivarla).
  // Beneficio elegido en el mostrador (opcional): descuenta sus puntos al registrar.
  const [beneficiosData, setBeneficiosData] = useState(null); // { saldo_puntos, beneficios }
  const [cargandoBeneficios, setCargandoBeneficios] = useState(false);
  const [beneficioId, setBeneficioId] = useState('');

  const cargarBeneficios = useCallback(async (socioId) => {
    setCargandoBeneficios(true);
    try {
      const res = await getBeneficiosDisponibles(socioId);
      setBeneficiosData(res.data);
    } catch {
      setBeneficiosData(null);
    } finally {
      setCargandoBeneficios(false);
    }
  }, []);

  // Seleccionar un socio reinicia el beneficio elegido y carga sus beneficios.
  const seleccionarSocio = useCallback((socio) => {
    setSelectedSocio(socio);
    setBeneficioId('');
    setBeneficiosData(null);
    if (socio) cargarBeneficios(socio.id);
  }, [cargarBeneficios]);

  useEffect(() => {
    if (!dniParam) { dniRef.current?.focus(); return; }
    buscarPorDni(dniParam)
      .then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
        setSocios(data);
        if (data.length > 0) seleccionarSocio(data[0]);
      })
      .catch(() => toast.error('Error al buscar el socio. Intentá de nuevo.'))
      .finally(() => setSearching(false));
  }, [dniParam]);

  const resetAll = useCallback(() => {
    setSearchParams({}, { replace: true });
    setDniValue('');
    setNameValue('');
    setSocios(null);
    setSelectedSocio(null);
    setLugar('');
    setImporte('');
    setSearchMode('dni');
    setTimeout(() => dniRef.current?.focus(), 50);
  }, [setSearchParams]);

  const handleSearch = async () => {
    const query = searchMode === 'dni' ? dniValue.trim() : nameValue.trim();
    if (!query) return;
    setSearching(true);
    setSocios(null);
    setSelectedSocio(null);
    setLugar('');
    setImporte('');
    try {
      const res = searchMode === 'dni'
        ? await buscarPorDni(query)
        : await buscarPorNombre(query);
      const data = Array.isArray(res.data) ? res.data : (res.data ? [res.data] : []);
      setSocios(data);
      if (data.length > 0) seleccionarSocio(data[0]);
    } catch {
      toast.error('Error al buscar el socio. Intentá de nuevo.');
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && canSearch) handleSearch();
  };

  const handleRegistrar = async () => {
    if (!canRegister) return;
    setRegistering(true);
    try {
      const res = await registrarVenta({
        socio_id: selectedSocio.id,
        fecha: new Date().toISOString(),
        lugar,
        importe: parseFloat(importe),
        detalles: [],
        ...(beneficioId ? { beneficio_id: Number(beneficioId) } : {}),
      });
      const {
        descuento, puntos_generados: puntos, puntos_canjeados: canjeados, saldo_puntos: saldo,
      } = res.data || {};
      const partes = ['¡Venta registrada!'];
      if (Number(descuento) > 0) partes.push(`Descuento: ${fmtImporte(descuento)}.`);
      if (canjeados > 0) partes.push(`Se descontaron ${canjeados} puntos por el beneficio.`);
      if (puntos > 0) partes.push(`El socio sumó ${puntos} puntos.`);
      if (canjeados > 0 && saldo != null) partes.push(`Saldo: ${saldo} puntos.`);
      toast.success(partes.join(' '));
      resetAll();
    } catch (err) {
      toast.error(errorMessage(err, 'Error al registrar la venta. Intentá de nuevo.'));
      const code = err?.response?.data?.detail?.code;
      if (beneficioId && ERRORES_BENEFICIO.has(code)) {
        // El saldo o la disponibilidad cambiaron: refrescar el listado y volver a elegir.
        setBeneficioId('');
        cargarBeneficios(selectedSocio.id);
      }
    } finally {
      setRegistering(false);
    }
  };

  const switchMode = (mode) => {
    setSearchMode(mode);
    setSocios(null);
    setSelectedSocio(null);
    setLugar('');
    setImporte('');
    if (mode === 'dni') setTimeout(() => dniRef.current?.focus(), 50);
  };

  const canSearch = searchMode === 'dni' ? dniValue.trim().length > 0 : nameValue.trim().length > 0;
  const canRegister = selectedSocio && lugar && importe && parseFloat(importe) > 0;
  const beneficios = beneficiosData?.beneficios || [];
  const beneficio = beneficios.find(b => String(b.id) === String(beneficioId)) || null;
  const descuentoBeneficio = calcularDescuento(beneficio, parseFloat(importe));
  const neto = beneficio && parseFloat(importe) > 0 ? parseFloat(importe) - descuentoBeneficio : null;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Registro de Ventas</div>
          <div className="page-subtitle">Buscá el socio y registrá la venta</div>
        </div>
      </div>

      {/* ── Search card ───────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Buscar Socio</span>
          <div style={{ display: 'flex', gap: 0, border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
            <button
              className={`btn btn-sm ${searchMode === 'dni' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 0, borderRight: '1px solid var(--gray-200)' }}
              onClick={() => switchMode('dni')}
            >
              Por DNI
            </button>
            <button
              className={`btn btn-sm ${searchMode === 'name' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius: 0 }}
              onClick={() => switchMode('name')}
            >
              Por Nombre
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="flex gap-3 items-center">
            {searchMode === 'dni' ? (
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">DNI</label>
                <input
                  ref={dniRef}
                  type="text"
                  inputMode="numeric"
                  className="form-input"
                  placeholder="Ingresá el DNI"
                  value={dniValue}
                  onChange={e => setDniValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
              </div>
            ) : (
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">Nombre</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ingresá el nombre o apellido"
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
              </div>
            )}
            <button
              className="btn btn-primary"
              style={{ alignSelf: 'flex-end', marginBottom: 0 }}
              onClick={handleSearch}
              disabled={!canSearch || searching}
            >
              {searching
                ? <span className="spinner" style={{ width: 16, height: 16 }} />
                : <Search size={16} />}
              Buscar
            </button>
          </div>
        </div>
      </div>

      {/* ── Loading ───────────────────────────────────────────── */}
      {searching && <InlineLoader text="Buscando socio..." />}

      {/* ── No results ───────────────────────────────────────── */}
      {socios !== null && !searching && socios.length === 0 && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>Socio no está registrado</span>
        </div>
      )}

      {/* ── Results table ────────────────────────────────────── */}
      {socios !== null && !searching && socios.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">
              {socios.length === 1
                ? '1 socio encontrado'
                : `${socios.length} socios encontrados — seleccioná uno`}
            </span>
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
                  <th>ID</th>
                </tr>
              </thead>
              <tbody>
                {socios.map(s => {
                  const isSelected = selectedSocio?.id === s.id;
                  return (
                    <tr
                      key={s.id}
                      onClick={() => { seleccionarSocio(s); setLugar(''); setImporte(''); }}
                      style={{
                        cursor: 'pointer',
                        background: isSelected ? 'var(--primary-light)' : undefined,
                        outline: isSelected ? '2px solid var(--primary)' : undefined,
                        outlineOffset: isSelected ? '-2px' : undefined,
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: 'var(--primary)', color: 'white',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 11, fontWeight: 700, flexShrink: 0,
                          }}>
                            {(s.nombre_apellido || '?')[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: isSelected ? 600 : undefined }}>
                            {s.nombre_apellido}
                          </span>
                          {isSelected && (
                            <span className="badge badge-primary" style={{ marginLeft: 4 }}>
                              <CheckCircle2 size={11} /> Seleccionado
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{s.dni}</td>
                      <td>{s.telefono || '—'}</td>
                      <td>{s.email || '—'}</td>
                      <td>{formatFecha(s.fecha_nacimiento)}</td>
                      <td style={{ color: 'var(--gray-400)', fontSize: 12 }}>{s.id}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Sale form ────────────────────────────────────────── */}
      {selectedSocio && (
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShoppingCart size={18} />
                Registrar Venta
              </div>
              <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
                Socio: <strong>{selectedSocio.nombre_apellido}</strong> — DNI {selectedSocio.dni}
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="grid grid-2">
              <div className="form-group">
                <label className="form-label">
                  Lugar <span className="required">*</span>
                </label>
                <select
                  className="form-select"
                  value={lugar}
                  onChange={e => setLugar(e.target.value)}
                >
                  <option value="">Seleccionar lugar...</option>
                  {LUGARES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  Importe <span className="required">*</span>
                </label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  value={importe}
                  onChange={e => setImporte(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && canRegister && handleRegistrar()}
                />
              </div>
              <div className="form-group">
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Gift size={14} /> Beneficio a usar (opcional)
                  {beneficiosData && (
                    <span style={{ marginLeft: 'auto', fontWeight: 400, color: 'var(--gray-500)' }}>
                      Saldo: <strong>{beneficiosData.saldo_puntos}</strong> puntos
                    </span>
                  )}
                </label>
                <select
                  className="form-select"
                  value={beneficioId}
                  onChange={e => setBeneficioId(e.target.value)}
                  disabled={cargandoBeneficios || beneficios.length === 0}
                >
                  <option value="">
                    {cargandoBeneficios ? 'Cargando beneficios...'
                      : beneficios.length === 0 ? 'No hay beneficios vigentes' : 'Ninguno'}
                  </option>
                  {beneficios.map(b => {
                    const desc = calcularDescuento(b, parseFloat(importe));
                    const detalle = b.usable
                      ? (desc > 0 ? ` · −${fmtImporte(desc)}` : ` · ${b.porcentaje_descuento}%`)
                      : ` · ${MOTIVOS[b.motivo] || 'No disponible'}`;
                    return (
                      <option key={b.id} value={b.id} disabled={!b.usable}>
                        {b.nombre} — {b.costo_puntos} pts{detalle}
                      </option>
                    );
                  })}
                </select>
                {beneficio && (
                  <span className="form-hint">
                    Al registrar se descuentan {beneficio.costo_puntos} puntos del socio.
                  </span>
                )}
              </div>
              {beneficio && parseFloat(importe) > 0 && (
                <div className="form-group">
                  <label className="form-label">Total con beneficio</label>
                  <div className="alert alert-success" style={{ margin: 0 }}>
                    <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                    <span>
                      {beneficio.porcentaje_descuento}% · −{fmtImporte(descuentoBeneficio)} → <strong>{fmtImporte(neto)}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="card-footer" style={{ justifyContent: 'flex-end', display: 'flex', gap: 12 }}>
            <button className="btn btn-secondary" onClick={resetAll}>
              Cancelar
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleRegistrar}
              disabled={!canRegister || registering}
            >
              {registering
                ? <span className="spinner" style={{ width: 16, height: 16 }} />
                : <ShoppingCart size={16} />}
              Registrar Venta
            </button>
          </div>
        </div>
      )}

      {/* ── Créditos y compras del socio ─────────────────────── */}
      {selectedSocio && <SocioResumen socioId={selectedSocio.id} />}
    </div>
  );
};
