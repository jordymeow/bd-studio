import { useState, useCallback, useRef, useEffect } from 'react';
import { Upload, Trash2, ImageOff, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MoodBoard, MoodBoardImage } from '../lib/types';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { url } from '../lib/base';

interface Props {
  moodBoard: MoodBoard;
}

export default function MoodBoardComponent({ moodBoard: initial }: Props) {
  const [moodBoard, setMoodBoard] = useState<MoodBoard>(initial);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<MoodBoard>(initial);

  useEffect(() => {
    latest.current = moodBoard;
  }, [moodBoard]);

  const persist = useCallback(async () => {
    setSaving(true);
    try {
      await fetch(url('/api/mood-board'), {
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

  const updateCaption = (id: string, caption: string) => {
    setMoodBoard(prev => ({
      ...prev,
      images: prev.images.map(img => (img.id === id ? { ...img, caption } : img)),
    }));
    scheduleSave();
  };

  const uploadFiles = useCallback(async (files: FileList | File[]) => {
    const list = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (list.length === 0) return;

    setUploading(true);
    setUploadError('');
    try {
      for (const file of list) {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(url('/api/mood-board/upload'), {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || `Upload failed for ${file.name}`);
        }
        const image: MoodBoardImage = await res.json();
        setMoodBoard(prev => ({ ...prev, images: [...prev.images, image] }));
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : String(e));
    } finally {
      setUploading(false);
    }
  }, []);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) uploadFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
  };

  const deleteImage = async (id: string) => {
    if (!confirm('Delete this image? This cannot be undone.')) return;
    const res = await fetch(url(`/api/mood-board/images/${id}`), { method: 'DELETE' });
    if (res.ok) {
      setMoodBoard(prev => ({ ...prev, images: prev.images.filter(i => i.id !== id) }));
      setLightboxIdx(idx => {
        if (idx === null) return null;
        const nextLen = moodBoard.images.length - 1;
        if (nextLen === 0) return null;
        return idx >= nextLen ? nextLen - 1 : idx;
      });
    }
  };

  const statusText = saving ? 'Saving…' : dirty ? 'Unsaved' : saved ? 'Saved' : '';

  const total = moodBoard.images.length;
  const lightboxImage = lightboxIdx !== null ? moodBoard.images[lightboxIdx] : null;

  const closeLightbox = useCallback(() => setLightboxIdx(null), []);
  const prevImage = useCallback(
    () => setLightboxIdx(i => (i === null || total === 0 ? null : (i - 1 + total) % total)),
    [total],
  );
  const nextImage = useCallback(
    () => setLightboxIdx(i => (i === null || total === 0 ? null : (i + 1) % total)),
    [total],
  );

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6 h-6">
        <div className="flex items-center gap-2">
          {uploadError && <span className="text-xs text-danger">{uploadError}</span>}
        </div>
        <div className="flex items-center gap-3">
          {statusText && <span className="text-xs text-text-muted">{statusText}</span>}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload images'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={handleFileSelected}
            className="hidden"
          />
        </div>
      </div>

      <div
        onDragOver={e => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        className={`rounded-md border border-dashed transition-colors ${
          dragActive ? 'border-accent bg-accent/5' : 'border-border'
        } p-4 min-h-[300px]`}
      >
        {total === 0 ? (
          <div className="flex flex-col items-center justify-center text-text-muted text-sm py-20">
            <ImageOff size={28} className="mb-3 opacity-40" />
            <p>No images yet. Drag and drop images here, or click "Upload images" above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {moodBoard.images.map((img, idx) => (
              <button
                key={img.id}
                onClick={() => setLightboxIdx(idx)}
                className="group relative aspect-square overflow-hidden rounded-md border border-border bg-surface-light text-left focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <img
                  src={url(`/api/uploads/${img.filename}`)}
                  alt={img.caption || img.originalName}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                />
                {img.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-2.5 pt-8">
                    <p className="text-white text-xs leading-snug line-clamp-3 whitespace-pre-wrap">
                      {img.caption}
                    </p>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {lightboxImage && (
        <Lightbox
          image={lightboxImage}
          index={lightboxIdx!}
          total={total}
          onClose={closeLightbox}
          onPrev={prevImage}
          onNext={nextImage}
          onCaptionChange={caption => updateCaption(lightboxImage.id, caption)}
          onDelete={() => deleteImage(lightboxImage.id)}
        />
      )}
    </div>
  );
}

interface LightboxProps {
  image: MoodBoardImage;
  index: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onCaptionChange: (caption: string) => void;
  onDelete: () => void;
}

function Lightbox({
  image,
  index,
  total,
  onClose,
  onPrev,
  onNext,
  onCaptionChange,
  onDelete,
}: LightboxProps) {
  // Keyboard nav + close. Skip arrow handling while the textarea is focused
  // so left/right arrows move the caret instead of jumping to another image.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const target = e.target as HTMLElement | null;
      const inInput =
        target && (target.tagName === 'TEXTAREA' || target.tagName === 'INPUT');
      if (inInput) return;
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose, onPrev, onNext]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="bg-bg border border-border rounded-lg overflow-hidden w-full max-w-5xl max-h-full flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3 py-2 border-b border-border">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <button
              onClick={onPrev}
              disabled={total <= 1}
              className="p-1 rounded hover:bg-surface-light disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Previous (←)"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={onNext}
              disabled={total <= 1}
              className="p-1 rounded hover:bg-surface-light disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="Next (→)"
            >
              <ChevronRight size={16} />
            </button>
            <span className="ml-2">
              {index + 1} / {total}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onDelete}
              className="p-1.5 rounded text-text-muted hover:text-danger hover:bg-surface-light transition-colors"
              title="Delete image"
            >
              <Trash2 size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded text-text-muted hover:text-text hover:bg-surface-light transition-colors"
              title="Close (Esc)"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center bg-surface-light p-4 min-h-0">
          <img
            src={url(`/api/uploads/${image.filename}`)}
            alt={image.caption || image.originalName}
            className="max-h-[60vh] max-w-full object-contain"
          />
        </div>

        <div className="p-4 border-t border-border">
          <Textarea
            key={image.id}
            defaultValue={image.caption}
            onChange={e => onCaptionChange(e.target.value)}
            placeholder="Add notes about this image — mood, reference, color palette…"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
