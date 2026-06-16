import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { Field, Modal, ConfirmDialog } from '../ui';
import { useToast } from '../../context/ToastContext';

// ── Validation schema ─────────────────────────────────────────────────────
const lineItemSchema = z.object({
  product_name: z.string().min(1, 'Product is required'),
  qty:          z.coerce.number().min(1, 'Qty must be ≥ 1'),
  unit_price:   z.coerce.number().min(0, 'Price must be ≥ 0'),
  discount:     z.coerce.number().min(0).max(100).default(0),
});

const schema = z.object({
  // Master
  customer_name:   z.string().min(2, 'Customer name required'),
  customer_email:  z.string().email('Valid email required'),
  order_date:      z.string().min(1, 'Date required'),
  status:          z.enum(['draft', 'confirmed', 'shipped', 'completed']),
  shipping_address:z.string().min(5, 'Address required'),
  notes:           z.string().optional(),
  // Detail rows
  items:           z.array(lineItemSchema).min(1, 'Add at least one item'),
});

const DEFAULT_ITEM = { product_name: '', qty: 1, unit_price: 0, discount: 0 };

const fmt = (n) => Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export const MasterDetailForm = ({ initialData, onSubmit: handleSave, onCancel }) => {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const { register, control, handleSubmit, watch, formState: { errors, isDirty } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: initialData || {
      customer_name: '', customer_email: '', order_date: new Date().toISOString().slice(0,10),
      status: 'draft', shipping_address: '', notes: '',
      items: [{ ...DEFAULT_ITEM }],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const items = watch('items');

  // Computed totals
  const lineTotal  = (item) => (item.qty * item.unit_price) * (1 - (item.discount || 0) / 100);
  const subtotal   = items.reduce((s, it) => s + lineTotal(it), 0);
  const tax        = subtotal * 0.1;
  const grandTotal = subtotal + tax;

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await handleSave?.(data);
      toast.success('Order saved successfully');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ── Master section ──────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h3 className="card-title">Order Information</h3>
            <span className="badge badge-gray">Master</span>
          </div>
          <div className="card-body">
            <div className="grid-2">
              <Field label="Customer Name" required error={errors.customer_name?.message}>
                <input {...register('customer_name')} className={`form-input ${errors.customer_name ? 'error' : ''}`} placeholder="John Doe" />
              </Field>
              <Field label="Email" required error={errors.customer_email?.message}>
                <input {...register('customer_email')} type="email" className={`form-input ${errors.customer_email ? 'error' : ''}`} placeholder="john@example.com" />
              </Field>
              <Field label="Order Date" required error={errors.order_date?.message}>
                <input {...register('order_date')} type="date" className={`form-input ${errors.order_date ? 'error' : ''}`} />
              </Field>
              <Field label="Status" required error={errors.status?.message}>
                <select {...register('status')} className="form-select">
                  <option value="draft">Draft</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="shipped">Shipped</option>
                  <option value="completed">Completed</option>
                </select>
              </Field>
              <Field label="Shipping Address" required error={errors.shipping_address?.message} span={2}>
                <textarea {...register('shipping_address')} className={`form-textarea ${errors.shipping_address ? 'error' : ''}`} rows={2} placeholder="123 Main St, City, Country" />
              </Field>
              <Field label="Notes" error={errors.notes?.message} span={2}>
                <textarea {...register('notes')} className="form-textarea" rows={2} placeholder="Internal notes…" />
              </Field>
            </div>
          </div>
        </div>

        {/* ── Detail section ──────────────────────────────── */}
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <div>
              <h3 className="card-title">Line Items</h3>
              {errors.items?.message && <span className="form-error">{errors.items.message}</span>}
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => append({ ...DEFAULT_ITEM })}>
              <Plus size={14} /> Add item
            </button>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ minWidth: 200 }}>Product</th>
                  <th style={{ width: 90 }}>Qty</th>
                  <th style={{ width: 130 }}>Unit Price</th>
                  <th style={{ width: 110 }}>Discount %</th>
                  <th style={{ width: 130, textAlign: 'right' }}>Total</th>
                  <th style={{ width: 50 }}></th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field, i) => {
                  const item = items[i] || {};
                  return (
                    <tr key={field.id}>
                      <td>
                        <input
                          {...register(`items.${i}.product_name`)}
                          className={`form-input ${errors.items?.[i]?.product_name ? 'error' : ''}`}
                          placeholder="Product name"
                        />
                        {errors.items?.[i]?.product_name && (
                          <div className="form-error">{errors.items[i].product_name.message}</div>
                        )}
                      </td>
                      <td>
                        <input {...register(`items.${i}.qty`)} type="number" min={1} className="form-input" />
                      </td>
                      <td>
                        <input {...register(`items.${i}.unit_price`)} type="number" min={0} step="0.01" className="form-input" />
                      </td>
                      <td>
                        <input {...register(`items.${i}.discount`)} type="number" min={0} max={100} className="form-input" />
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 600 }}>
                        {fmt(lineTotal(item))}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-sm"
                          onClick={() => fields.length > 1 && remove(i)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 size={14} color="var(--danger)" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="card-footer">
            <div style={{ marginLeft: 'auto', width: 260 }}>
              <div className="flex justify-between" style={{ padding: '4px 0', fontSize: 14 }}>
                <span style={{ color: 'var(--gray-500)' }}>Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <div className="flex justify-between" style={{ padding: '4px 0', fontSize: 14 }}>
                <span style={{ color: 'var(--gray-500)' }}>Tax (10%)</span>
                <span>{fmt(tax)}</span>
              </div>
              <hr className="divider" />
              <div className="flex justify-between" style={{ fontSize: 16, fontWeight: 700 }}>
                <span>Total</span>
                <span style={{ color: 'var(--primary)' }}>{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between">
          <button
            type="button" className="btn btn-secondary"
            onClick={() => isDirty ? setConfirmCancel(true) : onCancel?.()}
          >
            <ArrowLeft size={16} /> Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Save size={16} />}
            {saving ? 'Saving…' : 'Save Order'}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmCancel}
        onConfirm={() => { setConfirmCancel(false); onCancel?.(); }}
        onCancel={() => setConfirmCancel(false)}
        title="Discard changes?"
        message="You have unsaved changes. Are you sure you want to leave?"
        variant="warning"
      />
    </div>
  );
};
