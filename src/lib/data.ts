import fs from 'node:fs';
import path from 'node:path';
import type { BookSettings, Chapter, Character, MoodBoard, MoodBoardImage, Page, PageCount } from './types';
import { PAGE_COUNTS } from './types';
import { generateId } from './id';

export { generateId };

const DATA_DIR = path.join(process.cwd(), 'data');
const CHAPTERS_FILE = path.join(DATA_DIR, 'chapters.json');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const MOODBOARD_FILE = path.join(DATA_DIR, 'mood-board.json');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function writeJson(file: string, data: unknown) {
  ensureDir(path.dirname(file));
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

export function isValidPageCount(n: unknown): n is PageCount {
  return typeof n === 'number' && (PAGE_COUNTS as number[]).includes(n);
}

/** BD albums are printed in 8-page signatures, so the total must be a positive multiple of 8. */
export function isValidTotalPages(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0 && n % 8 === 0;
}

function makeBlankPage(order: number): Page {
  return { id: generateId('pg'), order, notes: '' };
}

/**
 * Reconcile a chapter's pages array against its pageCount.
 * - Adds empty pages at the end if pageCount grew.
 * - Trims pages from the end if pageCount shrank (notes on removed pages are lost — UI must warn).
 * - Always re-numbers `order` 1..N.
 */
function reconcilePages(pages: Page[], pageCount: PageCount): Page[] {
  const next = [...(pages ?? [])];
  while (next.length < pageCount) next.push(makeBlankPage(next.length + 1));
  while (next.length > pageCount) next.pop();
  return next.map((p, i) => ({ ...p, order: i + 1 }));
}

// ─── Chapters ─────────────────────────────────────────────────────────

export function getChapters(): Chapter[] {
  return readJson<Chapter[]>(CHAPTERS_FILE, []).sort((a, b) => a.order - b.order);
}

export function getChapter(id: string): Chapter | undefined {
  return getChapters().find(c => c.id === id);
}

export function saveChapters(chapters: Chapter[]) {
  writeJson(CHAPTERS_FILE, chapters);
}

export function createChapter(title: string, pageCount: PageCount): Chapter {
  const chapters = getChapters();
  const chapter: Chapter = {
    id: generateId('ch'),
    title,
    order: chapters.length + 1,
    synopsis: '',
    pageCount,
    pages: reconcilePages([], pageCount),
  };
  chapters.push(chapter);
  saveChapters(chapters);
  return chapter;
}

export function updateChapter(id: string, updates: Partial<Chapter>): Chapter | null {
  const chapters = getChapters();
  const idx = chapters.findIndex(c => c.id === id);
  if (idx === -1) return null;

  const current = chapters[idx];
  const merged: Chapter = { ...current, ...updates, id };

  // If pageCount changed, reconcile pages length (preserve existing notes by keeping the
  // incoming `pages` array if provided, otherwise the existing one).
  const incomingPages = updates.pages ?? merged.pages;
  merged.pages = reconcilePages(incomingPages, merged.pageCount);

  chapters[idx] = merged;
  saveChapters(chapters);
  return merged;
}

export function updatePage(chapterId: string, pageId: string, notes: string): Page | null {
  const chapters = getChapters();
  const chapter = chapters.find(c => c.id === chapterId);
  if (!chapter) return null;
  const page = chapter.pages.find(p => p.id === pageId);
  if (!page) return null;
  page.notes = notes;
  saveChapters(chapters);
  return page;
}

export function deleteChapter(id: string): boolean {
  const chapters = getChapters();
  const filtered = chapters.filter(c => c.id !== id);
  if (filtered.length === chapters.length) return false;
  filtered.sort((a, b) => a.order - b.order).forEach((c, i) => (c.order = i + 1));
  saveChapters(filtered);

  // Cascade: drop the chapter's mood board scope and unlink its image files.
  const orphans = deleteMoodBoardScope(chapterMoodBoardScope(id));
  for (const filename of orphans) {
    const filepath = path.join(UPLOADS_DIR, filename);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  }
  return true;
}

export function reorderChapters(orderedIds: string[]) {
  const chapters = getChapters();
  orderedIds.forEach((id, i) => {
    const ch = chapters.find(c => c.id === id);
    if (ch) ch.order = i + 1;
  });
  saveChapters(chapters);
}

// ─── Characters ───────────────────────────────────────────────────────

export function getCharacters(): Character[] {
  return readJson<Character[]>(CHARACTERS_FILE, []);
}

export function saveCharacters(characters: Character[]) {
  writeJson(CHARACTERS_FILE, characters);
}

// ─── Settings ─────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: BookSettings = {
  title: 'Untitled BD',
  author: 'Jordy',
  illustrator: 'Dreamy',
  story: '',
  totalPages: 72,
};

export function getSettings(): BookSettings {
  // Strip legacy `ambiance` field — it now lives in ambiance.json.
  // getAmbiance() handles the one-time migration from the old location.
  const raw = readJson<Partial<BookSettings> & { ambiance?: string }>(SETTINGS_FILE, {});
  const { ambiance: _legacy, ...clean } = raw;
  return { ...DEFAULT_SETTINGS, ...clean };
}

export function saveSettings(settings: BookSettings) {
  writeJson(SETTINGS_FILE, settings);
}

// ─── Mood board ───────────────────────────────────────────────────────

/**
 * Layout constants for the free-form mood board canvas.
 * The frontend uses the same values so newly-uploaded images snap to a tidy
 * starting grid before the user moves them around.
 */
export const MOODBOARD_TILE_SIZE = 160;
export const MOODBOARD_TILE_GAP = 16;
export const MOODBOARD_BOARD_PAD = 16;
export const MOODBOARD_BOARD_WIDTH = 1200;

/**
 * A mood board is scoped — there's one for the overall story and one per
 * chapter. Scopes are plain strings: "story" for the book-level board,
 * "chapter:<id>" for each chapter's board.
 */
export type MoodBoardScope = string;
type MoodBoardMap = Record<MoodBoardScope, MoodBoard>;

export const STORY_MOODBOARD_SCOPE: MoodBoardScope = 'story';
export function chapterMoodBoardScope(chapterId: string): MoodBoardScope {
  return `chapter:${chapterId}`;
}

export function isValidMoodBoardScope(scope: unknown): scope is MoodBoardScope {
  if (typeof scope !== 'string') return false;
  if (scope === STORY_MOODBOARD_SCOPE) return true;
  return /^chapter:[A-Za-z0-9_-]+$/.test(scope);
}

/** True if any tile (which may span multiple cells) covers the cell starting at (x, y). */
function isCellOccupied(existing: MoodBoardImage[], x: number, y: number): boolean {
  return existing.some(img => {
    const right = img.x + img.cols * MOODBOARD_TILE_SIZE + (img.cols - 1) * MOODBOARD_TILE_GAP;
    const bottom = img.y + img.rows * MOODBOARD_TILE_SIZE + (img.rows - 1) * MOODBOARD_TILE_GAP;
    // Treat the cell as occupied if its top-left lands within an existing tile's box.
    return x >= img.x - 4 && x < right - 4 && y >= img.y - 4 && y < bottom - 4;
  });
}

/** Find the first empty grid cell so new uploads don't pile on top of each other. */
function findEmptySlot(existing: MoodBoardImage[]): { x: number; y: number } {
  const stride = MOODBOARD_TILE_SIZE + MOODBOARD_TILE_GAP;
  const cols = Math.max(1, Math.floor((MOODBOARD_BOARD_WIDTH - MOODBOARD_BOARD_PAD * 2 + MOODBOARD_TILE_GAP) / stride));
  for (let row = 0; row < 1000; row++) {
    for (let col = 0; col < cols; col++) {
      const x = MOODBOARD_BOARD_PAD + col * stride;
      const y = MOODBOARD_BOARD_PAD + row * stride;
      if (!isCellOccupied(existing, x, y)) return { x, y };
    }
  }
  return { x: MOODBOARD_BOARD_PAD, y: MOODBOARD_BOARD_PAD };
}

/**
 * Read the whole scoped mood board map from disk. Legacy flat shape
 * `{ images: [...] }` is migrated on first read into the "story" scope so
 * existing installs keep their board as the overall story board.
 */
function readMoodBoardMap(): MoodBoardMap {
  if (!fs.existsSync(MOODBOARD_FILE)) return {};
  const raw = readJson<Record<string, unknown>>(MOODBOARD_FILE, {});
  if (Array.isArray((raw as { images?: unknown }).images)) {
    const legacy = raw as unknown as MoodBoard;
    const migrated: MoodBoardMap = { [STORY_MOODBOARD_SCOPE]: legacy };
    writeJson(MOODBOARD_FILE, migrated);
    return migrated;
  }
  return raw as MoodBoardMap;
}

function writeMoodBoardMap(map: MoodBoardMap) {
  writeJson(MOODBOARD_FILE, map);
}

/** Return every scope's mood board — used by export. */
export function getAllMoodBoards(): MoodBoardMap {
  return readMoodBoardMap();
}

/** Replace the entire mood board file — used by import. */
export function replaceAllMoodBoards(map: MoodBoardMap) {
  writeMoodBoardMap(map);
}

/**
 * Normalize any legacy images in a scope (missing x/y/cols/rows) so the rest
 * of the pipeline can assume fully-positioned tiles.
 */
function normalizeBoard(raw: MoodBoard | undefined): { board: MoodBoard; changed: boolean } {
  const images = raw?.images ?? [];
  let changed = false;
  const positioned: MoodBoardImage[] = [];
  for (const img of images) {
    const cols = typeof img.cols === 'number' && img.cols > 0 ? img.cols : 1;
    const rows = typeof img.rows === 'number' && img.rows > 0 ? img.rows : 1;
    if (img.cols !== cols || img.rows !== rows) changed = true;
    if (typeof img.x === 'number' && typeof img.y === 'number') {
      positioned.push({ ...img, cols, rows });
    } else {
      const slot = findEmptySlot(positioned);
      positioned.push({ ...img, x: slot.x, y: slot.y, cols, rows });
      changed = true;
    }
  }
  return { board: { images: positioned }, changed };
}

export function getMoodBoard(scope: MoodBoardScope): MoodBoard {
  const map = readMoodBoardMap();
  const { board, changed } = normalizeBoard(map[scope]);
  if (changed) {
    map[scope] = board;
    writeMoodBoardMap(map);
  }
  return board;
}

export function saveMoodBoard(scope: MoodBoardScope, moodBoard: MoodBoard) {
  const map = readMoodBoardMap();
  map[scope] = moodBoard;
  writeMoodBoardMap(map);
}

export function addMoodBoardImage(
  scope: MoodBoardScope,
  image: Omit<MoodBoardImage, 'x' | 'y' | 'cols' | 'rows'>,
): MoodBoardImage {
  const board = getMoodBoard(scope);
  const slot = findEmptySlot(board.images);
  const placed: MoodBoardImage = { ...image, x: slot.x, y: slot.y, cols: 1, rows: 1 };
  saveMoodBoard(scope, { images: [...board.images, placed] });
  return placed;
}

/** Remove an image's metadata and return its filename so the caller can delete the file. */
export function removeMoodBoardImage(scope: MoodBoardScope, id: string): string | null {
  const board = getMoodBoard(scope);
  const image = board.images.find(i => i.id === id);
  if (!image) return null;
  saveMoodBoard(scope, { images: board.images.filter(i => i.id !== id) });
  return image.filename;
}

export interface MoodBoardLayoutUpdate {
  id: string;
  x?: number;
  y?: number;
  cols?: number;
  rows?: number;
}

/** Apply layout updates (position and/or size) from the canvas. */
export function updateMoodBoardPositions(scope: MoodBoardScope, updates: MoodBoardLayoutUpdate[]) {
  const board = getMoodBoard(scope);
  const byId = new Map(updates.map(u => [u.id, u]));
  const images = board.images.map(img => {
    const u = byId.get(img.id);
    if (!u) return img;
    return {
      ...img,
      ...(u.x !== undefined ? { x: u.x } : {}),
      ...(u.y !== undefined ? { y: u.y } : {}),
      ...(u.cols !== undefined ? { cols: u.cols } : {}),
      ...(u.rows !== undefined ? { rows: u.rows } : {}),
    };
  });
  saveMoodBoard(scope, { images });
}

/**
 * Drop a whole scope (used when deleting a chapter). Returns the filenames
 * of the now-orphaned images so the caller can unlink them from disk.
 */
export function deleteMoodBoardScope(scope: MoodBoardScope): string[] {
  const map = readMoodBoardMap();
  const board = map[scope];
  if (!board) return [];
  const filenames = board.images.map(i => i.filename);
  delete map[scope];
  writeMoodBoardMap(map);
  return filenames;
}
