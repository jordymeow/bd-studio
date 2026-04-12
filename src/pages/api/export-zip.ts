import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import archiver from 'archiver';
import { Readable } from 'node:stream';
import {
  getChapters,
  getCharacters,
  getAllMoodBoards,
  getSettings,
  UPLOADS_DIR,
} from '../../lib/data';

export const GET: APIRoute = async () => {
  const data = {
    settings: getSettings(),
    chapters: getChapters(),
    characters: getCharacters(),
    moodBoards: getAllMoodBoards(),
  };

  const archive = archiver('zip', { zlib: { level: 5 } });

  archive.append(JSON.stringify(data, null, 2), { name: 'data.json' });

  if (fs.existsSync(UPLOADS_DIR)) {
    archive.directory(UPLOADS_DIR, 'uploads');
  }

  archive.finalize();

  const webStream = Readable.toWeb(archive) as ReadableStream;

  const date = new Date().toISOString().slice(0, 10);
  return new Response(webStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="bd-backup-${date}.zip"`,
    },
  });
};
