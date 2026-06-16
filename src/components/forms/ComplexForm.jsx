import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, User, Building, Lock, Bell } from 'lucide-react';
import { Field, Tabs } from '../ui';
import { useToast } from '../../context/ToastContext';

const schema = z.object({
  // Personal
  first_name: z.string().min(1, 'Required'),
  last_name:  z.string().min(1, 'Required'),
  email:      z.string().email('Invalid email'),
  phone:      z.string().optional(),
  bio:        z.string().max(500).optional(),
  avatar_url: z.string().url().optional().or(z.literal('')),

  // Company
  company:    z.string().optional(),
  job_title:  z.string().optional(),
  department: z.string().optional(),
  website:    z.string().url().optional().or(z.literal('')),
  country:    z.string().min(1, 'Country required'),
  timezone:   z.string().min(1, 'Timezone required'),

  // Security
  current_password: z.string().optional(),
  new_password:     z.string().min(8).optional().or(z.literal('')),
  confirm_password: z.string().optional(),

  // Notifications
  email_digest:    z.boolean().default(true),
  push_enabled:    z.boolean().default(true),
  sms_enabled:     z.boolean().default(false),
  marketing_emails:z.boolean().default(false),
}).refine(d => !d.new_password || d.new_password === d.confirm_password, {
  message: 'Passwords must match', path: ['confirm_password'],
});

const TABS = [
  { value: 'personal', label: 'Personal', icon: User },
  { value: 'company',  label: 'Company',  icon: Building },
  { value: 'security', label: 'Security', icon: Lock },
  { value: 'notifications', label: 'Notifications', icon: Bell },
];

const COUNTRIES = ['United States','Argentina','Brazil','United Kingdom','Germany','France','Spain','Mexico','Canada','Australia'];
const TIMEZONES = ['UTC-5 (EST)','UTC-3 (ART)','UTC+0 (GMT)','UTC+1 (CET)','UTC+9 (JST)','UTC+10 (AEST)'];

const Toggle = ({ label, hint, value, onChange }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--gray-100)' }}>
    <div>
      <div style={{ fontWeight: 500, fontSize: 14 }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>{hint}</div>}
    </div>
    <label style={{ display: 'flex', cursor: 'pointer' }}>
      <div style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? 'var(--primary)' : 'var(--gray-300)',
        position: 'relative', transition: 'background 0.2s',
      }}>
        <div style={{
          width: 18, height: 18, borderRadius: 9, background: 'white',
          position: 'absolute', top: 3,
          left: value ? 23 : 3,
          transition: 'left 0.2s',
          boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
      <input type="checkbox" checked={value} onChange={e => onChange(e.target.checked)} style={{ display: 'none' }} />
    </label>
  </div>
);

export const ComplexForm = ({ initialData, onSubmit: handleSave }) => {
  const toast = useToast();
  const [tab, setTab]     = useState('personal');
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      first_name: '', last_name: '', email: '', phone: '', bio: '', avatar_url: '',
      company: '', job_title: '', department: '', website: '', country: '', timezone: '',
      current_password: '', new_password: '', confirm_password: '',
      email_digest: true, push_enabled: true, sms_enabled: false, marketing_emails: false,
      ...initialData,
    },
  });

  const watchBool = (name) => watch(name);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await handleSave?.(data);
      toast.success('Profile updated successfully');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Account Settings</h3>
        </div>

        <div style={{ padding: '0 20px' }}>
          <Tabs
            tabs={TABS}
            active={tab}
            onChange={setTab}
          />
        </div>

        <div className="card-body">
          {/* ── Personal ─────────────────────────────────── */}
          {tab === 'personal' && (
            <div className="grid-2">
              <Field label="First name" required error={errors.first_name?.message}>
                <input {...register('first_name')} className={`form-input ${errors.first_name ? 'error' : ''}`} />
              </Field>
              <Field label="Last name" required error={errors.last_name?.message}>
                <input {...register('last_name')} className={`form-input ${errors.last_name ? 'error' : ''}`} />
              </Field>
              <Field label="Email" required error={errors.email?.message}>
                <input {...register('email')} type="email" className={`form-input ${errors.email ? 'error' : ''}`} />
              </Field>
              <Field label="Phone" error={errors.phone?.message}>
                <input {...register('phone')} type="tel" className="form-input" placeholder="+1 555 000 0000" />
              </Field>
              <Field label="Avatar URL" error={errors.avatar_url?.message} span={2}>
                <input {...register('avatar_url')} type="url" className="form-input" placeholder="https://…" />
              </Field>
              <Field label="Bio" error={errors.bio?.message} hint="Max 500 characters" span={2}>
                <textarea {...register('bio')} className="form-textarea" rows={3} />
              </Field>
            </div>
          )}

          {/* ── Company ──────────────────────────────────── */}
          {tab === 'company' && (
            <div className="grid-2">
              <Field label="Company" error={errors.company?.message}>
                <input {...register('company')} className="form-input" />
              </Field>
              <Field label="Job title" error={errors.job_title?.message}>
                <input {...register('job_title')} className="form-input" />
              </Field>
              <Field label="Department" error={errors.department?.message}>
                <input {...register('department')} className="form-input" />
              </Field>
              <Field label="Website" error={errors.website?.message}>
                <input {...register('website')} type="url" className="form-input" placeholder="https://…" />
              </Field>
              <Field label="Country" required error={errors.country?.message}>
                <select {...register('country')} className={`form-select ${errors.country ? 'error' : ''}`}>
                  <option value="">Select country…</option>
                  {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Timezone" required error={errors.timezone?.message}>
                <select {...register('timezone')} className={`form-select ${errors.timezone ? 'error' : ''}`}>
                  <option value="">Select timezone…</option>
                  {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
            </div>
          )}

          {/* ── Security ─────────────────────────────────── */}
          {tab === 'security' && (
            <div style={{ maxWidth: 480 }}>
              <div className="alert alert-info" style={{ marginBottom: 20 }}>
                Leave blank to keep your current password.
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="Current password" error={errors.current_password?.message}>
                  <input {...register('current_password')} type="password" className="form-input" />
                </Field>
                <Field label="New password" error={errors.new_password?.message} hint="Minimum 8 characters">
                  <input {...register('new_password')} type="password" className="form-input" />
                </Field>
                <Field label="Confirm new password" error={errors.confirm_password?.message}>
                  <input {...register('confirm_password')} type="password" className="form-input" />
                </Field>
              </div>
            </div>
          )}

          {/* ── Notifications ─────────────────────────────── */}
          {tab === 'notifications' && (
            <div style={{ maxWidth: 520 }}>
              <Toggle
                label="Email digest"
                hint="Receive a daily summary of activity"
                value={watchBool('email_digest')}
                onChange={v => setValue('email_digest', v)}
              />
              <Toggle
                label="Push notifications"
                hint="Browser & mobile push alerts"
                value={watchBool('push_enabled')}
                onChange={v => setValue('push_enabled', v)}
              />
              <Toggle
                label="SMS alerts"
                hint="Critical alerts via SMS"
                value={watchBool('sms_enabled')}
                onChange={v => setValue('sms_enabled', v)}
              />
              <Toggle
                label="Marketing emails"
                hint="Product updates and promotions"
                value={watchBool('marketing_emails')}
                onChange={v => setValue('marketing_emails', v)}
              />
            </div>
          )}
        </div>

        <div className="card-footer">
          <div className="flex justify-end">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : <Save size={16} />}
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
