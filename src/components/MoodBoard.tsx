import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Upload, Trash2, ImageOff, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MoodBoard, MoodBoardImage } from '../lib/types';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { url } from '../lib/base';

interface Props {
  moodBoard: MoodBoard;
}

// Canvas layout — kept in sync with MOODBOARD_* constants in src/lib/data.ts.
const TILE_SIZE = 160;
const TILE_GAP = 16;
const BOARD_PAD = 16;
const BOARD_WIDTH = 1200;
const MIN_BOARD_HEIGHT = 600;
// Pixel distance the cursor must travel before a pointer-down becomes a drag —
// below this, the gesture is treated as a click and opens the lightbox.
const DRAG_THRESHOLD = 5;

const STRIDE = TILE_SIZE + TILE_GAP;
const MAX_COL = Math.floor((BOARD_WIDTH - BOARD_PAD * 2 - TILE_SIZE) / STRIDE);

/** Pixel size of a tile spanning `cols × rows` cells.
 *  Multi-cell tiles absorb the gap between the cells they span — that's how
 *  the spacing "disappears" between cells covered by the same photo. */
function tileWidth(cols: number) {
  return cols * TILE_SIZE + (cols - 1) * TILE_GAP;
}
function tileHeight(rows: number) {
  return rows * TILE_SIZE + (rows - 1) * TILE_GAP;
}

/** Snap a free pixel coordinate to the nearest grid cell so tiles always align. */
function snapToGrid(x: number, y: number): { x: number; y: number } {
  const col = Math.max(0, Math.min(MAX_COL, Math.round((x - BOARD_PAD) / STRIDE)));
  const row = Math.max(0, Math.round((y - BOARD_PAD) / STRIDE));
  return { x: BOARD_PAD + col * STRIDE, y: BOARD_PAD + row * STRIDE };
}

/** Tile area in grid cells — the basis for "which tile is bigger". */
function tileArea(img: { cols: number; rows: number }): number {
  return img.cols * img.rows;
}

/** Axis-aligned bounding-box overlap test. */
function tilesOverlap(
  a: { x: number; y: number; cols: number; rows: number },
  b: { x: number; y: number; cols: number; rows: number },
): boolean {
  const aRight = a.x + tileWidth(a.cols);
  const aBottom = a.y + tileHeight(a.rows);
  const bRight = b.x + tileWidth(b.cols);
  const bBottom = b.y + tileHeight(b.rows);
  return a.x < bRight && aRight > b.x && a.y < bBottom && aBottom > b.y;
}

/**
 * Map a tile's stack depth (number of strictly-larger overlapping tiles) to
 * its display opacity. depth=0 → fully opaque; each layer above a bigger tile
 * fades a little more, with a floor so things never disappear entirely.
 */
function depthToOpacity(depth: number): number {
  if (depth <= 0) return 1;
  return Math.max(0.3, 1 / (1 + depth * 0.5));
}

interface DragState {
  id: string;
  startMouseX: number;
  startMouseY: number;
  offsetX: number;
  offsetY: number;
  currentX: number;
  currentY: number;
  moved: boolean;
  swapTargetId: string | null;
}

type ResizeEdge = 'right' | 'bottom' | 'corner';

interface ResizeState {
  id: string;
  edge: ResizeEdge;
  tileX: number;
  tileY: number;
  startCols: number;
  startRows: number;
  currentCols: number;
  currentRows: number;
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
  const [drag, setDrag] = useState<DragState | null>(null);
  const [resize, setResize] = useState<ResizeState | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const captionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef<MoodBoard>(initial);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    latest.current = moodBoard;
  }, [moodBoard]);

  // ─── Caption autosave (lightbox edits) ─────────────────────────────
  const persistCaptions = useCallback(async () => {
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

  const scheduleCaptionSave = useCallback(() => {
    setDirty(true);
    setSaved(false);
    if (captionTimer.current) clearTimeout(captionTimer.current);
    captionTimer.current = setTimeout(() => persistCaptions(), 400);
  }, [persistCaptions]);

  // ─── Layout persist (after each drop or resize) ────────────────────
  const persistPositions = useCallback(
    async (
      updates: { id: string; x?: number; y?: number; cols?: number; rows?: number }[],
    ) => {
      setSaving(true);
      setDirty(true);
      try {
        await fetch(url('/api/mood-board/positions'), {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ updates }),
        });
        setDirty(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (captionTimer.current) clearTimeout(captionTimer.current);
    };
  }, []);

  const updateCaption = (id: string, caption: string) => {
    setMoodBoard(prev => ({
      ...prev,
      images: prev.images.map(img => (img.id === id ? { ...img, caption } : img)),
    }));
    scheduleCaptionSave();
  };

  // ─── Upload ────────────────────────────────────────────────────────
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

  // OS file drops are distinguished from internal pointer drags by checking
  // dataTransfer.types — only OS drags include the 'Files' type.
  const handleGridDragOver = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault();
      setDragActive(true);
    }
  };

  const handleGridDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    if (!e.dataTransfer.types.includes('Files')) return;
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
  };

  // ─── Tile drag (pointer events for free positioning) ───────────────
  const handleTilePointerDown = (img: MoodBoardImage) => (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDrag({
      id: img.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      offsetX: e.clientX - rect.left - img.x,
      offsetY: e.clientY - rect.top - img.y,
      currentX: img.x,
      currentY: img.y,
      moved: false,
      swapTargetId: null,
    });
    // Capture so the drag survives the cursor leaving the tile.
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleTilePointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dx = e.clientX - drag.startMouseX;
    const dy = e.clientY - drag.startMouseY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    const rawX = e.clientX - rect.left - drag.offsetX;
    const rawY = e.clientY - rect.top - drag.offsetY;
    const { x: newX, y: newY } = snapToGrid(rawX, rawY);

    // With snapping, every cell is either occupied or empty — a swap is just
    // another tile sitting on the exact destination cell.
    const swapTarget = moodBoard.images.find(
      i => i.id !== drag.id && i.x === newX && i.y === newY,
    );

    setDrag({
      ...drag,
      currentX: newX,
      currentY: newY,
      moved: true,
      swapTargetId: swapTarget?.id ?? null,
    });
  };

  const handleTilePointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* pointer may already be released — ignore */
    }

    if (!drag.moved) {
      // Treated as a click — open the lightbox.
      const idx = moodBoard.images.findIndex(i => i.id === drag.id);
      if (idx !== -1) setLightboxIdx(idx);
      setDrag(null);
      return;
    }

    const draggedImg = moodBoard.images.find(i => i.id === drag.id);
    if (!draggedImg) {
      setDrag(null);
      return;
    }

    let updatedImages: MoodBoardImage[];
    let positionUpdates: { id: string; x: number; y: number }[];

    if (drag.swapTargetId) {
      const target = moodBoard.images.find(i => i.id === drag.swapTargetId)!;
      updatedImages = moodBoard.images.map(i => {
        if (i.id === drag.id) return { ...i, x: target.x, y: target.y };
        if (i.id === target.id) return { ...i, x: draggedImg.x, y: draggedImg.y };
        return i;
      });
      positionUpdates = [
        { id: drag.id, x: target.x, y: target.y },
        { id: target.id, x: draggedImg.x, y: draggedImg.y },
      ];
    } else {
      // Free placement — the tile lands wherever the cursor released it.
      updatedImages = moodBoard.images.map(i =>
        i.id === drag.id ? { ...i, x: drag.currentX, y: drag.currentY } : i,
      );
      positionUpdates = [{ id: drag.id, x: drag.currentX, y: drag.currentY }];
    }

    setMoodBoard(prev => ({ ...prev, images: updatedImages }));
    persistPositions(positionUpdates);
    setDrag(null);
  };

  const handleTilePointerCancel = () => setDrag(null);

  // ─── Tile resize (right edge / bottom edge / bottom-right corner) ──
  const handleResizePointerDown =
    (img: MoodBoardImage, edge: ResizeEdge) => (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      // Don't let the resize gesture also trigger the tile drag handler.
      e.stopPropagation();
      e.preventDefault();
      setResize({
        id: img.id,
        edge,
        tileX: img.x,
        tileY: img.y,
        startCols: img.cols,
        startRows: img.rows,
        currentCols: img.cols,
        currentRows: img.rows,
      });
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    };

  const handleResizePointerMove = (e: React.PointerEvent) => {
    if (!resize) return;
    e.stopPropagation();
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;

    let newCols = resize.currentCols;
    let newRows = resize.currentRows;

    if (resize.edge === 'right' || resize.edge === 'corner') {
      const distX = e.clientX - rect.left - resize.tileX;
      // round((distX + TILE_GAP) / STRIDE) snaps to the nearest column edge
      const requested = Math.max(1, Math.round((distX + TILE_GAP) / STRIDE));
      // Clamp so the tile stays inside the board's right edge.
      const maxCols = Math.max(
        1,
        Math.floor((BOARD_WIDTH - BOARD_PAD - resize.tileX + TILE_GAP) / STRIDE),
      );
      newCols = Math.min(requested, maxCols);
    }

    if (resize.edge === 'bottom' || resize.edge === 'corner') {
      const distY = e.clientY - rect.top - resize.tileY;
      newRows = Math.max(1, Math.round((distY + TILE_GAP) / STRIDE));
    }

    if (newCols !== resize.currentCols || newRows !== resize.currentRows) {
      setResize({ ...resize, currentCols: newCols, currentRows: newRows });
    }
  };

  const handleResizePointerUp = (e: React.PointerEvent) => {
    if (!resize) return;
    e.stopPropagation();
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }

    const { id, currentCols, currentRows, startCols, startRows } = resize;
    if (currentCols !== startCols || currentRows !== startRows) {
      setMoodBoard(prev => ({
        ...prev,
        images: prev.images.map(i =>
          i.id === id ? { ...i, cols: currentCols, rows: currentRows } : i,
        ),
      }));
      persistPositions([{ id, cols: currentCols, rows: currentRows }]);
    }
    setResize(null);
  };

  const handleResizePointerCancel = () => setResize(null);

  // ─── Delete ────────────────────────────────────────────────────────
  const deleteImage = async (id: string) => {
    if (!confirm('Delete this image? This cannot be undone.')) return;
    const res = await fetch(url(`/api/mood-board/images/${id}`), { method: 'DELETE' });
    if (res.ok) {
      const remainingCount = moodBoard.images.length - 1;
      setMoodBoard(prev => ({ ...prev, images: prev.images.filter(i => i.id !== id) }));
      setLightboxIdx(idx => {
        if (idx === null) return null;
        if (remainingCount === 0) return null;
        return idx >= remainingCount ? remainingCount - 1 : idx;
      });
    }
  };

  // ─── Computed ──────────────────────────────────────────────────────
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

  // Live view of every image with drag/resize overrides applied. All
  // overlap-aware computations (z-index, stack depth, board height) read from
  // here so the layout updates in real time while the user is dragging or
  // resizing.
  const liveImages = useMemo(() => {
    return moodBoard.images.map(img => {
      const isDragging = drag?.id === img.id && drag.moved;
      const isResizing = resize?.id === img.id;
      return {
        ...img,
        x: isDragging ? drag.currentX : img.x,
        y: isDragging ? drag.currentY : img.y,
        cols: isResizing ? resize.currentCols : img.cols,
        rows: isResizing ? resize.currentRows : img.rows,
      };
    });
  }, [moodBoard.images, drag, resize]);

  // Stack info: for each tile, how many strictly-bigger tiles overlap it
  // (used for fade), and a global render order (used for z-index — bigger
  // tiles get lower z so smaller tiles always sit on top of them).
  const stackInfo = useMemo(() => {
    const sortedByArea = [...liveImages].sort((a, b) => tileArea(b) - tileArea(a));
    const zIndex = new Map<string, number>();
    sortedByArea.forEach((img, i) => zIndex.set(img.id, i + 1));

    const depth = new Map<string, number>();
    for (const img of liveImages) {
      const myArea = tileArea(img);
      let count = 0;
      for (const other of liveImages) {
        if (other.id === img.id) continue;
        if (tileArea(other) > myArea && tilesOverlap(img, other)) count++;
      }
      depth.set(img.id, count);
    }
    return { zIndex, depth };
  }, [liveImages]);

  // The board grows downward as tiles are placed/resized lower so there's
  // always empty canvas to drop into below the lowest image.
  const boardHeight = useMemo(() => {
    let maxY = 0;
    for (const img of liveImages) {
      const bottom = img.y + tileHeight(img.rows);
      if (bottom > maxY) maxY = bottom;
    }
    return Math.max(MIN_BOARD_HEIGHT, maxY + BOARD_PAD);
  }, [liveImages]);

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
        onDragOver={handleGridDragOver}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleGridDrop}
        className={`overflow-x-auto rounded-md border border-dashed transition-colors ${
          dragActive ? 'border-accent bg-accent/5' : 'border-border'
        }`}
      >
        <div
          ref={boardRef}
          className="relative bg-surface-light"
          style={{ width: BOARD_WIDTH, height: boardHeight }}
        >
          {total === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-text-muted text-sm pointer-events-none">
              <ImageOff size={28} className="mb-3 opacity-40" />
              <p>No images yet. Drag and drop images here, or click "Upload images" above.</p>
            </div>
          )}

          {moodBoard.images.map((storedImg, i) => {
            const img = liveImages[i];
            const isDragging = drag?.id === img.id && drag.moved;
            const isResizing = resize?.id === img.id;
            const isSwapTarget = drag?.swapTargetId === img.id;
            const w = tileWidth(img.cols);
            const h = tileHeight(img.rows);

            // Bigger tiles render below (lower z-index); the active drag/resize
            // tile floats above everything else so the user can always see it.
            const baseZ = stackInfo.zIndex.get(img.id) ?? 1;
            const z = isDragging || isResizing ? 1000 : baseZ;

            // Stack-depth opacity: a tile sitting on top of bigger tiles fades
            // so the bigger ones below stay readable. The active drag stays at
            // 0.9 regardless so the user can see what they're moving.
            const depthOpacity = depthToOpacity(stackInfo.depth.get(img.id) ?? 0);
            const opacity = isDragging ? 0.9 : depthOpacity;

            return (
              <div
                key={img.id}
                onPointerDown={handleTilePointerDown(storedImg)}
                onPointerMove={handleTilePointerMove}
                onPointerUp={handleTilePointerUp}
                onPointerCancel={handleTilePointerCancel}
                style={{
                  left: img.x,
                  top: img.y,
                  width: w,
                  height: h,
                  zIndex: z,
                  opacity,
                  touchAction: 'none',
                }}
                className={`absolute group overflow-hidden rounded-md border bg-surface focus:outline-none cursor-grab active:cursor-grabbing transition-[opacity,box-shadow] duration-200 ${
                  isDragging || isResizing ? 'shadow-2xl' : ''
                } ${
                  isSwapTarget ? 'border-accent ring-2 ring-accent' : 'border-border'
                }`}
              >
                <img
                  src={url(`/api/uploads/${img.filename}`)}
                  alt={img.caption || img.originalName}
                  draggable={false}
                  className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                />
                {img.caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-2.5 pt-8 pointer-events-none">
                    <p className="text-white text-xs leading-snug line-clamp-3 whitespace-pre-wrap">
                      {img.caption}
                    </p>
                  </div>
                )}

                {/* Resize handles — generous invisible hit zones at each edge,
                    with small centered pill indicators that fade in on hover.
                    Each handle stops propagation in its own pointerdown so the
                    tile drag handler doesn't fire when grabbing a handle. */}
                <div
                  onPointerDown={handleResizePointerDown(storedImg, 'right')}
                  onPointerMove={handleResizePointerMove}
                  onPointerUp={handleResizePointerUp}
                  onPointerCancel={handleResizePointerCancel}
                  style={{ touchAction: 'none' }}
                  className="absolute top-0 right-0 w-2.5 h-full cursor-ew-resize"
                  title="Drag to resize horizontally"
                >
                  <div className="absolute right-[3px] top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-full bg-white/85 shadow-[0_0_3px_rgba(0,0,0,0.45)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none" />
                </div>
                <div
                  onPointerDown={handleResizePointerDown(storedImg, 'bottom')}
                  onPointerMove={handleResizePointerMove}
                  onPointerUp={handleResizePointerUp}
                  onPointerCancel={handleResizePointerCancel}
                  style={{ touchAction: 'none' }}
                  className="absolute bottom-0 left-0 right-0 h-2.5 cursor-ns-resize"
                  title="Drag to resize vertically"
                >
                  <div className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-7 h-[3px] rounded-full bg-white/85 shadow-[0_0_3px_rgba(0,0,0,0.45)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none" />
                </div>
                <div
                  onPointerDown={handleResizePointerDown(storedImg, 'corner')}
                  onPointerMove={handleResizePointerMove}
                  onPointerUp={handleResizePointerUp}
                  onPointerCancel={handleResizePointerCancel}
                  style={{ touchAction: 'none' }}
                  className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
                  title="Drag to resize"
                >
                  <div className="absolute bottom-[3px] right-[3px] w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none">
                    <div className="absolute bottom-0 right-0 w-full h-[2px] rounded-full bg-white/85 shadow-[0_0_3px_rgba(0,0,0,0.45)]" />
                    <div className="absolute bottom-0 right-0 h-full w-[2px] rounded-full bg-white/85 shadow-[0_0_3px_rgba(0,0,0,0.45)]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
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
