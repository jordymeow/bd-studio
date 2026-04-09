import { useState, useCallback, useRef, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Character } from '../lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ColorPicker } from './ui/color-picker';
import { generateId } from '../lib/id';
import { url } from '../lib/base';

interface Props {
  characters: Character[];
}

const ACCENT_COLORS = ['#38bdf8', '#f472b6', '#fbbf24', '#4ade80', '#a78bfa', '#fb7185'];

export default function CharacterManager({ characters: initial }: Props) {
  const [characters, setCharacters] = useState<Character[]>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Character[]>(initial);

  useEffect(() => {
    latest.current = characters;
  }, [characters]);

  const persist = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(url('/api/characters'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(latest.current),
      });
      if (!res.ok) throw new Error('Save failed');
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

  const update = useCallback(
    (id: string, patch: Partial<Character>) => {
      setCharacters(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
      scheduleSave();
    },
    [scheduleSave],
  );

  const addCharacter = useCallback(() => {
    const color = ACCENT_COLORS[characters.length % ACCENT_COLORS.length];
    const next: Character = {
      id: generateId('char'),
      name: '',
      role: '',
      description: '',
      color,
    };
    setCharacters(prev => [...prev, next]);
    scheduleSave();
  }, [characters.length, scheduleSave]);

  const removeCharacter = useCallback(
    (id: string, name: string) => {
      if (!confirm(`Delete ${name || 'this character'}?`)) return;
      setCharacters(prev => prev.filter(c => c.id !== id));
      scheduleSave();
    },
    [scheduleSave],
  );

  const statusText = saving ? 'Saving…' : dirty ? 'Unsaved' : saved ? 'Saved' : '';

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-text-muted">
          {characters.length} character{characters.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-3">
          {statusText && <span className="text-xs text-text-muted">{statusText}</span>}
          <Button variant="ghost" size="sm" onClick={addCharacter}>
            <Plus size={14} /> Add Character
          </Button>
        </div>
      </div>

      {characters.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-border/30 rounded-xl">
          <p className="text-sm text-text-muted mb-4">No characters yet.</p>
          <Button variant="ghost" size="sm" onClick={addCharacter}>
            <Plus size={14} /> Add the first character
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {characters.map(char => (
            <div
              key={char.id}
              className="border border-border rounded-lg p-4"
              style={{ borderLeftColor: char.color, borderLeftWidth: 4 }}
            >
              <div className="flex items-start gap-3 mb-3">
                <ColorPicker value={char.color} onChange={color => update(char.id, { color })} />
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <Input
                    value={char.name}
                    placeholder="Name"
                    onChange={e => update(char.id, { name: e.target.value })}
                  />
                  <Input
                    value={char.role}
                    placeholder="Role (e.g. protagonist)"
                    onChange={e => update(char.id, { role: e.target.value })}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeCharacter(char.id, char.name)}
                  title="Delete"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
              <Textarea
                value={char.description}
                placeholder="Appearance, personality, backstory, motivations…"
                onChange={e => update(char.id, { description: e.target.value })}
                rows={3}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
