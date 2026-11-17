// Funciones y constantes compartidas por las pantallas de WhatsApp

// Errores del backend: { detail: { code, message } } · 422 de validación: { detail: [{ msg }] } · 403 admin
export const errorMessage = (err, fallback) => {
  if (err?.response?.status === 403) return 'Necesitás permisos de administrador para esta pantalla.';
  const d = err?.response?.data?.detail;
  if (d?.message) return d.message;
  if (Array.isArray(d) && d[0]?.msg) return `${d[0].loc?.slice(-1)[0] ?? ''} ${d[0].msg}`.trim();
  if (typeof d === 'string') return d;
  return fallback;
};

export const fmtFechaHora = (v) => (v ? new Date(v).toLocaleString('es-AR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
}) : '—');
export const fmtFecha = (v) => (v ? String(v).slice(0, 10).split('-').reverse().join('/') : '—');
export const fmtNum = (v) => (v == null ? '—' : new Intl.NumberFormat('es-AR').format(v));
export const fmtPct = (v) => (v == null ? '—' : `${String(v).replace('.', ',')} %`);
export const fmtMonto = (v, moneda = 'USD') => (v == null ? '—'
  : `${moneda} ${new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v)}`);

// ── Estados ───────────────────────────────────────────────────────────────
export const ESTADOS = {
  mensaje: {
    PENDIENTE: ['Pendiente', 'gray'], ENVIADO: ['Enviado', 'primary'], ENTREGADO: ['Entregado', 'primary'],
    LEIDO: ['Leído', 'success'], FALLIDO: ['Fallido', 'danger'], CANCELADO: ['Cancelado', 'gray'],
  },
  campania: {
    BORRADOR: ['Borrador', 'gray'], PROGRAMADA: ['Programada', 'warning'], EN_CURSO: ['En curso', 'primary'],
    PAUSADA: ['Pausada', 'warning'], FINALIZADA: ['Finalizada', 'success'], CANCELADA: ['Cancelada', 'gray'],
  },
  plantilla: {
    BORRADOR: ['Borrador', 'gray'], PENDIENTE: ['En revisión', 'warning'], APROBADA: ['Aprobada', 'success'],
    RECHAZADA: ['Rechazada', 'danger'], PAUSADA: ['Pausada', 'warning'], DESACTIVADA: ['Desactivada', 'gray'],
  },
  socio: {
    DESCONOCIDO: ['Sin verificar', 'gray'], VALIDO: ['WhatsApp válido', 'success'],
    INVALIDO: ['Número inválido', 'danger'], BAJA: ['Dado de baja', 'warning'],
  },
};
export const opcionesEstado = (tipo) => Object.entries(ESTADOS[tipo]).map(([value, [label]]) => ({ value, label }));
export const MOTIVOS_EXCLUSION = {
  SIN_TELEFONO: 'Sin teléfono', TELEFONO_INVALIDO: 'Teléfono incompleto o mal cargado',
  NUMERO_INVALIDO: 'Número inválido en WhatsApp', BAJA: 'Dado de baja de promociones',
  DUPLICADO: 'Teléfono repetido', EXCLUIDO_MANUAL: 'Quitado a mano',
  INVALIDO: 'Número inválido en WhatsApp',
};

export const TIPOS_AUDIENCIA = {
  PREFERENCIA: 'Por preferencia', TODOS: 'Todos los socios', CUMPLEANIOS: 'Cumpleaños', MANUAL: 'Lista manual',
};

export const describirAudiencia = (a) => {
  if (!a) return '—';
  const lugar = a.lugar ? ` · ${a.lugar}` : '';
  const excl = a.excluidos?.length ? ` · ${a.excluidos.length} quitados` : '';
  if (a.tipo === 'PREFERENCIA') return `Preferencia “${a.q}”${a.incluir_resumen ? ' (incluye resumen)' : ''}${lugar}${excl}`;
  if (a.tipo === 'CUMPLEANIOS') return `Cumpleaños del ${fmtFecha(a.desde)} al ${fmtFecha(a.hasta)}${lugar}${excl}`;
  if (a.tipo === 'MANUAL') return `${a.socio_ids?.length || 0} socios elegidos`;
  return `Todos los socios${lugar}${excl}`;
};

// ── CSV ───────────────────────────────────────────────────────────────────
export const exportarCsv = (cols, rows, nombre) => {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [cols.map(c => esc(c[1])).join(','),
    ...rows.map(r => cols.map(c => esc(typeof c[2] === 'function' ? c[2](r) : r[c[0]])).join(','))].join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' }));
  a.download = `${nombre}.csv`;
  a.click();
};

// ── Audiencia ─────────────────────────────────────────────────────────────
export const audienciaVacia = (tipo = 'PREFERENCIA') => ({
  tipo, q: '', incluir_resumen: false, lugar: '', desde: '', hasta: '', socio_ids: [], excluidos: [],
});

export const audienciaParaApi = (a) => ({
  tipo: a.tipo,
  q: a.tipo === 'PREFERENCIA' ? a.q : null,
  incluir_resumen: a.tipo === 'PREFERENCIA' && !!a.incluir_resumen,
  lugar: a.tipo === 'MANUAL' ? null : (a.lugar || null),
  desde: a.tipo === 'CUMPLEANIOS' ? a.desde || null : null,
  hasta: a.tipo === 'CUMPLEANIOS' ? a.hasta || null : null,
  socio_ids: a.tipo === 'MANUAL' ? a.socio_ids : [],
  excluidos: a.tipo === 'MANUAL' ? [] : a.excluidos,
});

export const audienciaCompleta = (a) => (
  (a.tipo === 'PREFERENCIA' && (a.q || '').trim().length >= 2)
  || a.tipo === 'TODOS'
  || (a.tipo === 'CUMPLEANIOS' && a.desde && a.hasta && a.hasta >= a.desde)
  || (a.tipo === 'MANUAL' && a.socio_ids.length > 0)
);

export const variablesFijas = (plantilla) => (plantilla?.variables || []).filter(v => v.origen === 'texto_fijo');

export const faltanValores = (plantilla, valores) => variablesFijas(plantilla)
  .filter(v => !v.texto?.trim() && !(valores[`${v.en || 'cuerpo'}:${v.n}`] || '').trim())
  .map(v => `{{${v.n}}}`);
