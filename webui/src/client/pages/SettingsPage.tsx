import React, { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { useAuth } from '../App.js';

const FIELDS: { key: string; label: string; type?: string; placeholder?: string; sensitive?: boolean }[] = [
  { key: 'port', label: 'Server Port', placeholder: '3000' },
  { key: 'host_url', label: 'Host URL', placeholder: 'http://localhost:3000' },
  { key: 'https_enabled', label: 'HTTPS Enabled (true/false)', placeholder: 'false' },
  { key: 'letsencrypt_domain', label: "Let's Encrypt Domain", placeholder: 'example.com' },
  { key: 'letsencrypt_email', label: "Let's Encrypt Email", type: 'email', placeholder: 'admin@example.com' },
  { key: 'patreon_api_key', label: 'Patreon API Key', sensitive: true },
  { key: 'ai_api_key', label: 'AI API Key', sensitive: true },
  { key: 'ai_base_url', label: 'AI Base URL', placeholder: 'https://api.openai.com/v1' },
  { key: 'ai_model', label: 'AI Model', placeholder: 'gpt-4o-mini' },
  { key: 'whisper_model', label: 'Whisper Model', placeholder: 'base' },
  { key: 'scheduler_enabled', label: 'Scheduler Enabled (true/false)', placeholder: 'false' },
  { key: 'scheduler_interval_hours', label: 'Scheduler Interval (hours)', placeholder: '6' },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getSettings().then(setSettings).catch((err: unknown) => setError((err as Error).message));
  }, []);

  function handleChange(key: string, value: string) {
    setDirty((d) => ({ ...d, [key]: value }));
  }

  function getValue(key: string) {
    return dirty[key] ?? settings[key] ?? '';
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.updateSettings(dirty);
      setSettings((s) => ({ ...s, ...dirty }));
      setDirty({});
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const isAdmin = user?.is_admin;

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">Settings</h1>

      {!isAdmin && (
        <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 text-sm text-yellow-700 dark:text-yellow-300">
          Only admins can modify settings.
        </div>
      )}

      <form onSubmit={handleSave} className="card p-6 space-y-4">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label className="block text-sm font-medium mb-1">{f.label}</label>
            <input
              className="input"
              type={f.sensitive ? 'password' : f.type || 'text'}
              placeholder={f.placeholder}
              value={f.sensitive && settings[f.key] === '***' && !(f.key in dirty) ? '' : getValue(f.key)}
              onChange={(e) => handleChange(f.key, e.target.value)}
              disabled={!isAdmin}
              autoComplete={f.sensitive ? 'new-password' : undefined}
            />
          </div>
        ))}

        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {isAdmin && (
          <div className="flex items-center gap-3">
            <button type="submit" className="btn-primary" disabled={saving || Object.keys(dirty).length === 0}>
              {saving ? 'Saving…' : 'Save Settings'}
            </button>
            {saved && <span className="text-sm text-green-600 dark:text-green-400">Saved!</span>}
          </div>
        )}
      </form>
    </div>
  );
}
