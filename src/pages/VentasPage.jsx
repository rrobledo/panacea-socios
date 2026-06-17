import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ShoppingCart, AlertCircle, CheckCircle2, User } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { buscarPorDni, buscarPorNombre, registrarVenta } from '../services/sociosApi';
import { InlineLoader } from '../components/ui';

const LUGARES = ['Villa Allende', 'Villa Carlos Paz'];

const formatFecha = (f) => {
  if (!f) return '—';
  try { return new Date(f).toLocaleDateString('es-AR'); } catch { return f; }
};

export const VentasPage = () => {
  const toast = useToast();
  const dniRef = useRef(null);

  const [searchMode, setSearchMode] = useState('dni');
  const [dniValue, setDniValue]     = useState('');
  const [nameValue, setNameValue]   = useState('');
  const [searching, setSearching]   = useState(false);
  const [socios, setSocios]         = useState(null);
  const [selectedSocio, setSelectedSocio] = useState(null);

  const [lugar, setLugar]       = useState('');
  const [importe, setImporte]   = useState('');
  const [registering, setRegistering] = useState(false);

  useEffect(() => { dniRef.current?.focus(); }, []);

  const resetAll = useCallback(() => {
    setDniValue('');
    setNameValue('');
    setSocios(null);
    setSelectedSocio(null);
    setLugar('');
    setImporte('');
    setSearchMode('dni');
    setTimeout(() => dniRef.current?.focus(), 50);
  }, []);

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
      if (data.length > 0) setSelectedSocio(data[0]);
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
    if (!selectedSocio || !lugar || !importe) return;
    setRegistering(true);
    try {
      await registrarVenta({
        socio_id: selectedSocio.id,
        fecha: new Date().toISOString(),
        lugar,
        importe: parseFloat(importe),
        detalles: [],
      });
      toast.success('¡Venta registrada exitosamente!');
      resetAll();
    } catch {
      toast.error('Error al registrar la venta. Intentá de nuevo.');
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
                      onClick={() => { setSelectedSocio(s); setLugar(''); setImporte(''); }}
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
    </div>
  );
};
