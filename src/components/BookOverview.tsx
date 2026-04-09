import { useState } from 'react';
import { Plus, BookOpen, MoreHorizontal, AlertTriangle } from 'lucide-react';
import type { Chapter, PageCount } from '../lib/types';
import { PAGE_COUNTS } from '../lib/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from './ui/dialog';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from './ui/dropdown-menu';
import { url } from '../lib/base';

interface Props {
  chapters: Chapter[];
  totalPages: number;
}

export default function BookOverview({ chapters, totalPages: target }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [pageCount, setPageCount] = useState<PageCount>(6);
  const [busy, setBusy] = useState(false);

  const sorted = [...chapters].sort((a, b) => a.order - b.order);
  const used = sorted.reduce((s, c) => s + c.pageCount, 0);
  const remaining = target - used;

  async function handleCreate() {
    if (!title.trim()) return;
    setBusy(true);
    const res = await fetch(url('/api/chapters'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim(), pageCount }),
    });
    if (res.ok) {
      const ch = await res.json();
      window.location.href = url(`/chapters/${ch.id}`);
    } else {
      setBusy(false);
    }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}" and all its pages?`)) return;
    await fetch(url(`/api/chapters/${id}`), { method: 'DELETE' });
    window.location.reload();
  }

  async function handleReorder(index: number, direction: 'up' | 'down') {
    const ids = sorted.map(c => c.id);
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    await fetch(url('/api/chapters/reorder'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: ids }),
    });
    window.location.reload();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="text-sm text-text-muted">
            {sorted.length} chapter{sorted.length !== 1 ? 's' : ''} · {used} / {target} pages
            {remaining < 0 && (
              <span className="ml-2 text-danger">({-remaining} over)</span>
            )}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm">
              <Plus size={14} /> New Chapter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New chapter</DialogTitle>
              <DialogClose />
            </DialogHeader>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Title</label>
                <Input
                  autoFocus
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. The Awakening"
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleCreate();
                  }}
                />
              </div>
              <div>
                <label className="block text-xs text-text-muted mb-1.5">Pages</label>
                <div className="flex gap-2">
                  {PAGE_COUNTS.map(n => (
                    <button
                      key={n}
                      onClick={() => setPageCount(n)}
                      className={`flex-1 py-2 rounded-md border text-sm transition-colors ${
                        pageCount === n
                          ? 'border-accent bg-accent/10 text-accent'
                          : 'border-border text-text-muted hover:text-text hover:border-text/30'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-text-muted/70 mt-1.5">
                  Each chapter must end on a clean break — pick 2, 4, 6, or 8 pages.
                </p>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={busy}>
                  Cancel
                </Button>
                <Button variant="accent" size="sm" onClick={handleCreate} disabled={busy || !title.trim()}>
                  {busy ? 'Creating…' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-border/30 rounded-xl">
          <p className="flex justify-center mb-4">
            <BookOpen size={32} className="text-text-muted" />
          </p>
          <p className="text-lg text-text-muted mb-2">No chapters yet</p>
          <p className="text-sm text-text-muted mb-6">
            Create your first chapter to start sketching out the album.
          </p>
          <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
            <Plus size={14} /> Create First Chapter
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map((chapter, index) => (
            <a
              key={chapter.id}
              href={url(`/chapters/${chapter.id}`)}
              className="block border border-border rounded-lg p-5 hover:bg-surface transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0 w-8 h-8 flex items-center justify-center bg-accent/15 text-accent text-sm font-bold rounded-lg">
                    {chapter.order}
                  </span>
                  <h3 className="font-semibold text-text truncate">{chapter.title}</h3>
                </div>

                <div className="shrink-0 ml-2" onClick={e => e.preventDefault()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal size={14} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        disabled={index === 0}
                        onClick={() => handleReorder(index, 'up')}
                      >
                        Move up
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={index === sorted.length - 1}
                        onClick={() => handleReorder(index, 'down')}
                      >
                        Move down
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        data-danger="true"
                        onClick={() => handleDelete(chapter.id, chapter.title)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {chapter.synopsis ? (
                <p className="text-sm text-text-muted mb-4 line-clamp-2">{chapter.synopsis}</p>
              ) : (
                <p className="text-sm text-text-muted/50 italic mb-4">No synopsis yet</p>
              )}

              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="px-2 py-0.5 rounded bg-surface-light">{chapter.pageCount} pages</span>
                {chapter.pages.some(p => p.notes.trim()) && (
                  <span className="text-accent">
                    {chapter.pages.filter(p => p.notes.trim()).length}/{chapter.pageCount} written
                  </span>
                )}
              </div>
            </a>
          ))}

          {/* Remaining-pages slot — only shown when there's space (or warning if over) */}
          {remaining > 0 && (
            <button
              onClick={() => setOpen(true)}
              className="block border border-dashed border-border/50 rounded-lg p-5 text-left hover:border-text/30 hover:bg-surface/50 transition-colors group"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="shrink-0 w-8 h-8 flex items-center justify-center bg-surface-light text-text-muted text-sm rounded-lg group-hover:text-accent group-hover:bg-accent/15 transition-colors">
                  <Plus size={16} />
                </span>
                <h3 className="font-semibold text-text-muted group-hover:text-text transition-colors">
                  {remaining} page{remaining !== 1 ? 's' : ''} remaining
                </h3>
              </div>
              <p className="text-sm text-text-muted/70">
                Add another chapter to fill out the {target}-page album.
              </p>
            </button>
          )}
          {remaining < 0 && (
            <div className="border border-danger/40 bg-danger/5 rounded-lg p-5">
              <div className="flex items-center gap-3 mb-2">
                <span className="shrink-0 w-8 h-8 flex items-center justify-center bg-danger/15 text-danger rounded-lg">
                  <AlertTriangle size={16} />
                </span>
                <h3 className="font-semibold text-danger">{-remaining} pages over budget</h3>
              </div>
              <p className="text-sm text-text-muted">
                The chapters add up to {used} pages but the target is {target}. Trim a chapter or raise the total in Settings.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
