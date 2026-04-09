import fs from 'node:fs';
import path from 'node:path';
import type { BookSettings, Chapter, Character, Page, PageCount } from './types';
import { PAGE_COUNTS } from './types';
import { generateId } from './id';

export { generateId };

const DATA_DIR = path.join(process.cwd(), 'data');
const CHAPTERS_FILE = path.join(DATA_DIR, 'chapters.json');
const CHARACTERS_FILE = path.join(DATA_DIR, 'characters.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

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
  ambiance: '',
  totalPages: 72,
};

export function getSettings(): BookSettings {
  return { ...DEFAULT_SETTINGS, ...readJson<Partial<BookSettings>>(SETTINGS_FILE, {}) };
}

export function saveSettings(settings: BookSettings) {
  writeJson(SETTINGS_FILE, settings);
}
