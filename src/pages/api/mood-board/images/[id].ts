import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import {
  isValidMoodBoardScope,
  removeMoodBoardImage,
  UPLOADS_DIR,
} from '../../../../lib/data';

export const DELETE: APIRoute = async ({ params, url }) => {
  const id = params.id;
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const scope = url.searchParams.get('scope');
  if (!isValidMoodBoardScope(scope)) {
    return Response.json({ error: 'Invalid scope' }, { status: 400 });
  }

  const filename = removeMoodBoardImage(scope, id);
  if (!filename) return Response.json({ error: 'Not found' }, { status: 404 });

  const filepath = path.join(UPLOADS_DIR, filename);
  if (fs.existsSync(filepath)) fs.unlinkSync(filepath);

  return Response.json({ ok: true });
};
