import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { UPLOADS_DIR } from '../../../lib/data';

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export const GET: APIRoute = async ({ params }) => {
  const filename = params.filename;
  // Guard against path traversal — filenames are generated as `img-xxxx.ext`
  if (!filename || filename.includes('/') || filename.includes('\\') || filename.includes('..')) {
    return new Response('Bad request', { status: 400 });
  }

  const filepath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filepath)) return new Response('Not found', { status: 404 });

  const ext = path.extname(filename).toLowerCase();
  const contentType = CONTENT_TYPES[ext] || 'application/octet-stream';
  const buffer = fs.readFileSync(filepath);

  return new Response(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'private, max-age=3600',
    },
  });
};
