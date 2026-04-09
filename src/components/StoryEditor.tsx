import { useState, useCallback, useRef, useEffect } from 'react';
import type { BookSettings } from '../lib/types';
import { Textarea } from './ui/textarea';
import { url } from '../lib/base';

interface Props {
  settings: BookSettings;
}

export default function StoryEditor({ settings: initial }: Props) {
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
    <div className="max-w-3xl">
      <div className="flex items-center justify-end mb-6 h-6">
        {statusText && <span className="text-xs text-text-muted">{statusText}</span>}
      </div>

      <div className="space-y-8">
        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">
            Overall story
          </label>
          <Textarea
            value={settings.story}
            onChange={e => update({ story: e.target.value })}
            placeholder="The big picture — premise, the arc across all chapters, the ending you're aiming for…"
            rows={12}
          />
        </div>

        <div>
          <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">
            Ambiance
          </label>
          <Textarea
            value={settings.ambiance}
            onChange={e => update({ ambiance: e.target.value })}
            placeholder="Tone, mood, color palette, visual references, art direction notes for Dreamy…"
            rows={10}
          />
        </div>
      </div>
    </div>
  );
}
