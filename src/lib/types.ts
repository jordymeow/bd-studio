export type PageCount = 2 | 4 | 6 | 8;

export const PAGE_COUNTS: PageCount[] = [2, 4, 6, 8];

export interface BookSettings {
  title: string;
  author: string;       // Jordy
  illustrator: string;  // Dreamy
  story: string;        // long-form: overall story arc
  totalPages: number;   // target page count for the album — must be a positive multiple of 8
  colorScheme?: string;
}

export interface MoodBoardImage {
  id: string;           // "img-xxxxxxxx"
  filename: string;     // stored on disk as <id>.<ext>
  originalName: string; // original upload filename, shown as fallback
  caption: string;      // free-form note for this image — shown in the tile and in the lightbox
  uploadedAt: string;   // ISO timestamp
  x: number;            // top-left position on the board, in pixels
  y: number;
  cols: number;         // tile spans cols × rows grid cells (default 1)
  rows: number;
}

export interface MoodBoard {
  images: MoodBoardImage[];
}

export interface Page {
  id: string;
  order: number;        // 1..pageCount within the chapter
  notes: string;        // free-form text
}

export interface Chapter {
  id: string;
  title: string;
  order: number;
  synopsis: string;     // chapter story Jordy wants to tell
  pageCount: PageCount;
  pages: Page[];        // length === pageCount
}

export interface Character {
  id: string;
  name: string;
  role: string;         // short label (protagonist, sidekick, …)
  description: string;  // long-form
  color: string;        // hex
}
