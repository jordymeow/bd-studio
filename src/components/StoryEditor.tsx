import { useState, useCallback, useRef, useEffect } from 'react';
import { Sparkles, LayoutGrid } from 'lucide-react';
import type { BookSettings, MoodBoard } from '../lib/types';
import { Textarea } from './ui/textarea';
import { Tabs } from './ui/tabs';
import MoodBoardComponent from './MoodBoard';
import { url } from '../lib/base';

interface Props {
  settings: BookSettings;
  moodBoard: MoodBoard;
}

type TabId = 'story' | 'mood';

export default function StoryEditor({ settings: initial, moodBoard }: Props) {
  const [settings, setSettings] = useState<BookSettings>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('story');

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <Tabs
          tabs={[
            { id: 'story', label: 'Story', icon: <Sparkles size={14} /> },
            { id: 'mood', label: 'Mood Board', icon: <LayoutGrid size={14} /> },
          ]}
          active={activeTab}
          onChange={id => setActiveTab(id as TabId)}
        />
        {activeTab === 'story' && statusText && (
          <span className="text-xs text-text-muted">{statusText}</span>
        )}
      </div>

      {activeTab === 'story' ? (
        <div className="max-w-3xl">
          <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">
            Overall story
          </label>
          <Textarea
            value={settings.story}
            onChange={e => update({ story: e.target.value })}
            placeholder="The big picture — premise, the arc across all chapters, the ending you're aiming for…"
            rows={20}
          />
        </div>
      ) : (
        <MoodBoardComponent scope="story" moodBoard={moodBoard} />
      )}
    </div>
  );
}
