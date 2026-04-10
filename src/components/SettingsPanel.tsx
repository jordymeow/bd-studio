import { useState, useCallback, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
import type { BookSettings } from '../lib/types';
import { Input } from './ui/input';
import { COLOR_SCHEMES } from '../lib/color-schemes';
import { url } from '../lib/base';

interface Props {
  settings: BookSettings;
}

export default function SettingsPanel({ settings: initial }: Props) {
  const [settings, setSettings] = useState<BookSettings>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<BookSettings>(initial);

  useEffect(() => {
    latest.current = settings;
  }, [settings]);

  const persist = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(url('/api/settings'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(latest.current),
      });
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, []);

  const applyScheme = useCallback(async (schemeId: string) => {
    setSettings(prev => ({ ...prev, colorScheme: schemeId }));
    await fetch(url('/api/settings'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...latest.current, colorScheme: schemeId }),
    });
    window.location.reload();
  }, []);

  const scheduleSave = useCallback(() => {
    setDirty(true);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => persist(), 400);
  }, [persist]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function update(patch: Partial<BookSettings>) {
    setSettings(prev => ({ ...prev, ...patch }));
    scheduleSave();
  }

  const statusText = saving ? 'Saving…' : dirty ? 'Unsaved' : saved ? 'Saved' : '';

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-end mb-8 h-6">
        {statusText && <span className="text-xs text-text-muted">{statusText}</span>}
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-1.5">Title</label>
          <Input
            value={settings.title}
            onChange={e => update({ title: e.target.value })}
            placeholder="e.g. The Last Voyage"
          />
          <p className="text-xs text-text-muted mt-1">The name of this BD album.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Author</label>
            <Input
              value={settings.author}
              onChange={e => update({ author: e.target.value })}
              placeholder="Jordy"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Illustrator</label>
            <Input
              value={settings.illustrator}
              onChange={e => update({ illustrator: e.target.value })}
              placeholder="Dreamy"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Total pages</label>
          <Input
            type="number"
            min={8}
            step={8}
            value={settings.totalPages}
            onChange={e => {
              const n = parseInt(e.target.value, 10);
              if (!Number.isNaN(n)) update({ totalPages: n });
            }}
            onBlur={e => {
              // Snap to the nearest multiple of 8 (min 8)
              const n = parseInt(e.target.value, 10) || 8;
              const snapped = Math.max(8, Math.round(n / 8) * 8);
              if (snapped !== settings.totalPages) update({ totalPages: snapped });
            }}
            className="w-32 font-mono"
          />
          <p className="text-xs text-text-muted mt-1">
            Target page count for the album. Must be a multiple of 8 (BD albums are printed in 8-page signatures).
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Color Scheme</label>
          <p className="text-xs text-text-muted mb-3">Pick a theme for the editor.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {COLOR_SCHEMES.map(scheme => {
              const isActive = (settings.colorScheme ?? 'zinc') === scheme.id;
              return (
                <button
                  key={scheme.id}
                  onClick={() => applyScheme(scheme.id)}
                  className={`relative p-3 rounded-md border text-left transition-colors ${
                    isActive ? 'border-text/40' : 'border-border hover:border-border'
                  }`}
                  style={{ backgroundColor: scheme.bg }}
                >
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: scheme.surface }} />
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: scheme.surfaceLight }} />
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: scheme.accent }} />
                  </div>
                  <span className="text-xs" style={{ color: scheme.text }}>
                    {scheme.name}
                  </span>
                  {isActive && (
                    <Check size={12} className="absolute top-2 right-2" style={{ color: scheme.accent }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
