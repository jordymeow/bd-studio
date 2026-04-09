import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { removeMoodBoardImage, UPLOADS_DIR } from '../../../../lib/data';

export const DELETE: APIRoute = async ({ params }) => {
  const id = params.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const filename = removeMoodBoardImage(id);
  if (!filename) return Response.json({ error: 'Not found' }, { status: 404 });

  const filepath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

  return Response.json({ ok: true });
};
