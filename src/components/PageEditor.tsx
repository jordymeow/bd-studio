import { useState, useCallback, useRef, useEffect } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft } from 'lucide-react';
import type { Chapter } from '../lib/types';
import { Button } from './ui/button';
import { BdPage } from './BdPage';
import { url } from '../lib/base';

interface Props {
  chapter: Chapter;
  pageId: string;
}

export default function PageEditor({ chapter, pageId }: Props) {
  const initialIdx = chapter.pages.findIndex(p => p.id === pageId);
  const page = chapter.pages[initialIdx];

  const [notes, setNotes] = useState(page?.notes ?? '');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(notes);

  useEffect(() => {
    latest.current = notes;
  }, [notes]);

  const persist = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(url('/api/chapters/page'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: chapter.id,
          pageId,
          notes: latest.current,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setDirty(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }, [chapter.id, pageId]);

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

  const flushAndNavigate = useCallback(
    async (href: string) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      if (dirty) await persist();
      window.location.href = href;
    },
    [dirty, persist],
  );

  // Keyboard nav: alt+arrow to switch pages without stealing arrow keys from the textarea
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.altKey) return;
      if (e.key === 'ArrowLeft' && initialIdx > 0) {
        e.preventDefault();
        const prev = chapter.pages[initialIdx - 1];
        flushAndNavigate(url(`/chapters/${chapter.id}/pages/${prev.id}`));
      } else if (e.key === 'ArrowRight' && initialIdx < chapter.pages.length - 1) {
        e.preventDefault();
        const next = chapter.pages[initialIdx + 1];
        flushAndNavigate(url(`/chapters/${chapter.id}/pages/${next.id}`));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [chapter.id, chapter.pages, initialIdx, flushAndNavigate]);

  if (!page) {
    return (
      <div className="text-text-muted text-sm">
        Page not found.{' '}
        <a href={url(`/chapters/${chapter.id}`)} className="underline">
          Back to chapter
        </a>
      </div>
    );
  }

  const prev = initialIdx > 0 ? chapter.pages[initialIdx - 1] : null;
  const next = initialIdx < chapter.pages.length - 1 ? chapter.pages[initialIdx + 1] : null;

  const statusText = saving ? 'Saving…' : dirty ? 'Unsaved' : saved ? 'Saved' : '';

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 max-w-3xl mx-auto">
        <a
          href={url(`/chapters/${chapter.id}`)}
          className="text-xs text-text-muted hover:text-text inline-flex items-center gap-1.5"
        >
          <ChevronLeft size={14} /> {chapter.title}
        </a>
        <div className="flex items-center gap-3">
          {statusText && <span className="text-xs text-text-muted">{statusText}</span>}
          <Button
            variant="ghost"
            size="sm"
            disabled={!prev}
            onClick={() =>
              prev && flushAndNavigate(url(`/chapters/${chapter.id}/pages/${prev.id}`))
            }
            title="Previous page (Alt+←)"
          >
            <ArrowLeft size={14} /> Prev
          </Button>
          <span className="text-xs text-text-muted font-mono">
            {initialIdx + 1} / {chapter.pages.length}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={!next}
            onClick={() =>
              next && flushAndNavigate(url(`/chapters/${chapter.id}/pages/${next.id}`))
            }
            title="Next page (Alt+→)"
          >
            Next <ArrowRight size={14} />
          </Button>
        </div>
      </div>

      {/* The page itself */}
      <div className="max-w-md mx-auto">
        <BdPage
          variant="full"
          order={page.order}
          notes={notes}
          autoFocus
          onChange={value => {
            setNotes(value);
            scheduleSave();
          }}
        />
      </div>
    </div>
  );
}
