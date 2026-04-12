import { useState, useCallback, useRef, useEffect } from 'react';
import { FileText, LayoutGrid } from 'lucide-react';
import type { Chapter, MoodBoard, PageCount } from '../lib/types';
import { PAGE_COUNTS } from '../lib/types';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Tabs } from './ui/tabs';
import { BdPage } from './BdPage';
import MoodBoardComponent from './MoodBoard';
import { url } from '../lib/base';

interface Props {
  chapter: Chapter;
  moodBoard: MoodBoard;
}

type TabId = 'chapter' | 'mood';

export default function ChapterDetail({ chapter: initial, moodBoard }: Props) {
  const [chapter, setChapter] = useState<Chapter>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>('chapter');

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<Chapter>(initial);

  useEffect(() => {
    latest.current = chapter;
  }, [chapter]);

  const persist = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(url(`/api/chapters/${latest.current.id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(latest.current),
      });
      if (!res.ok) throw new Error('Save failed');
      const updated = await res.json();
      // Server may have reconciled pages — sync back
      setChapter(updated);
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

  const updateField = useCallback(
    (patch: Partial<Chapter>) => {
      setChapter(prev => ({ ...prev, ...patch }));
      scheduleSave();
    },
    [scheduleSave],
  );

  async function changePageCount(next: PageCount) {
    if (next === chapter.pageCount) return;
    if (next < chapter.pageCount) {
      const droppedNotes = chapter.pages
        .slice(next)
        .filter(p => p.notes.trim())
        .length;
      if (droppedNotes > 0) {
        const ok = confirm(
          `Shrinking to ${next} pages will discard the notes on ${droppedNotes} page${droppedNotes > 1 ? 's' : ''}. Continue?`,
        );
        if (!ok) return;
      }
    }
    // Page count is a structural change — save immediately (no debounce) and reload
    // so the server-rendered sidebar/totals/"pages remaining" all catch up.
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    await fetch(url(`/api/chapters/${chapter.id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...latest.current, pageCount: next }),
    });
    window.location.reload();
  }

  const statusText = saving ? 'Saving…' : dirty ? 'Unsaved' : saved ? 'Saved' : '';

  return (
    <div>
      {/* Header */}
      <div className="max-w-6xl flex items-start justify-between mb-6 gap-4">
        <div className="flex-1 min-w-0">
          <Input
            value={chapter.title}
            onChange={e => updateField({ title: e.target.value })}
            className="text-lg font-semibold border-transparent hover:border-border focus:border-text/30 -mx-3"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {activeTab === 'chapter' && statusText && (
            <span className="text-xs text-text-muted">{statusText}</span>
          )}
        </div>
      </div>

      <Tabs
        className="mb-6"
        tabs={[
          { id: 'chapter', label: 'Chapter', icon: <FileText size={14} /> },
          { id: 'mood', label: 'Mood Board', icon: <LayoutGrid size={14} /> },
        ]}
        active={activeTab}
        onChange={id => setActiveTab(id as TabId)}
      />

      {activeTab === 'chapter' ? (
        <div className="max-w-6xl">
          {/* Synopsis */}
          <div className="mb-8">
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">
              Story for this chapter
            </label>
            <Textarea
              value={chapter.synopsis}
              onChange={e => updateField({ synopsis: e.target.value })}
              placeholder="Explain what happens in this chapter — the beats, the turning points, where it ends…"
              rows={5}
            />
          </div>

          {/* Page count */}
          <div className="mb-8">
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-2">
              Pages in this chapter
            </label>
            <div className="flex gap-2 max-w-xs">
              {PAGE_COUNTS.map(n => (
                <button
                  key={n}
                  onClick={() => changePageCount(n)}
                  className={`flex-1 py-2 rounded-md border text-sm transition-colors ${
                    chapter.pageCount === n
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-border text-text-muted hover:text-text hover:border-text/30'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Pages grid */}
          <div className="mb-4">
            <label className="block text-xs text-text-muted uppercase tracking-wider mb-3">
              Pages
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-6">
              {chapter.pages.map(page => (
                <BdPage
                  key={page.id}
                  variant="thumb"
                  order={page.order}
                  notes={page.notes}
                  href={url(`/chapters/${chapter.id}/pages/${page.id}`)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <MoodBoardComponent scope={`chapter:${chapter.id}`} moodBoard={moodBoard} />
      )}
    </div>
  );
}
