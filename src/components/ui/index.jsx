import { useEffect, useRef } from 'react';
import { X, AlertTriangle, CheckCircle } from 'lucide-react';

// ── Modal ─────────────────────────────────────────────────────────────────
export const Modal = ({ open, onClose, title, children, footer, size = '', noPad = false }) => {
  useEffect(() => {
    const esc = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  if (!open) return null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className={noPad ? '' : 'modal-body'}>{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
};

// ── Confirm Dialog ────────────────────────────────────────────────────────
export const ConfirmDialog = ({ open, onConfirm, onCancel, title, message, variant = 'danger' }) => (
  <Modal open={open} onClose={onCancel} title={title || 'Confirm action'} size="sm"
    footer={<>
      <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
      <button className={`btn btn-${variant}`} onClick={onConfirm}>Confirm</button>
    </>}
  >
    <div className="flex items-center gap-3">
      <AlertTriangle size={22} color={variant === 'danger' ? 'var(--danger)' : 'var(--warning)'} style={{ flexShrink: 0 }} />
      <p style={{ color: 'var(--gray-700)' }}>{message || 'Are you sure?'}</p>
    </div>
  </Modal>
);

// ── Form Field wrapper ────────────────────────────────────────────────────
export const Field = ({ label, required, error, hint, children, span }) => (
  <div className="form-group" style={span ? { gridColumn: `span ${span}` } : {}}>
    {label && (
      <label className="form-label">
        {label}{required && <span className="required">*</span>}
      </label>
    )}
    {children}
    {error && <span className="form-error">{error}</span>}
    {!error && hint && <span className="form-hint">{hint}</span>}
  </div>
);

// ── Loading states ────────────────────────────────────────────────────────
export const PageLoader = () => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
    <div className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
  </div>
);

export const InlineLoader = ({ text = 'Loading…' }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--gray-500)', padding: '16px 0' }}>
    <div className="spinner" />
    <span style={{ fontSize: 14 }}>{text}</span>
  </div>
);

// ── Empty State ────────────────────────────────────────────────────────────
export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--gray-500)' }}>
    {Icon && <Icon size={40} style={{ margin: '0 auto 16px', color: 'var(--gray-300)' }} />}
    <h4 style={{ fontSize: 16, fontWeight: 600, color: 'var(--gray-700)', marginBottom: 6 }}>{title}</h4>
    {description && <p style={{ fontSize: 14, marginBottom: 20 }}>{description}</p>}
    {action}
  </div>
);

// ── Error State ────────────────────────────────────────────────────────────
export const ErrorState = ({ message, onRetry }) => (
  <div style={{ textAlign: 'center', padding: '32px 24px' }}>
    <div className="alert alert-danger" style={{ display: 'inline-flex', marginBottom: 16 }}>
      {message || 'Something went wrong.'}
    </div>
    {onRetry && <button className="btn btn-secondary" onClick={onRetry}>Try again</button>}
  </div>
);

// ── Search Input ──────────────────────────────────────────────────────────
import { Search } from 'lucide-react';
export const SearchInput = ({ value, onChange, placeholder = 'Search…', style }) => {
  const ref = useRef(null);
  return (
    <div style={{ position: 'relative', ...style }}>
      <Search size={15} style={{
        position: 'absolute', left: 10, top: '50%',
        transform: 'translateY(-50%)', color: 'var(--gray-400)'
      }} />
      <input
        ref={ref}
        type="search"
        className="form-input"
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ paddingLeft: 34 }}
      />
    </div>
  );
};

// ── Select ────────────────────────────────────────────────────────────────
export const Select = ({ options = [], value, onChange, placeholder = 'Select…', className = '', ...props }) => (
  <select
    className={`form-select ${className}`}
    value={value}
    onChange={e => onChange(e.target.value)}
    {...props}
  >
    {placeholder && <option value="">{placeholder}</option>}
    {options.map(o => (
      <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
    ))}
  </select>
);

// ── Status Badge ──────────────────────────────────────────────────────────
const STATUS_MAP = {
  active: 'success', inactive: 'gray', pending: 'warning',
  cancelled: 'danger', completed: 'primary', draft: 'gray',
  published: 'success', archived: 'gray',
};
export const StatusBadge = ({ status }) => (
  <span className={`badge badge-${STATUS_MAP[status?.toLowerCase()] || 'gray'}`}>
    {status}
  </span>
);

// ── Tabs ──────────────────────────────────────────────────────────────────
export const Tabs = ({ tabs, active, onChange }) => (
  <div className="tabs">
    {tabs.map(t => (
      <button
        key={t.value}
        className={`tab-btn ${active === t.value ? 'active' : ''}`}
        onClick={() => onChange(t.value)}
      >
        {t.label}
        {t.count !== undefined && (
          <span className="badge badge-gray" style={{ marginLeft: 6 }}>{t.count}</span>
        )}
      </button>
    ))}
  </div>
);
