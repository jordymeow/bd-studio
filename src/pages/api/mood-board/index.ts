import type { APIRoute } from 'astro';
import { getMoodBoard, isValidMoodBoardScope, saveMoodBoard } from '../../../lib/data';
import type { MoodBoard } from '../../../lib/types';

function readScope(url: URL): string | null {
  const scope = url.searchParams.get('scope');
  return isValidMoodBoardScope(scope) ? scope : null;
}

export const GET: APIRoute = async ({ url }) => {
  const scope = readScope(url);
  if (!scope) return Response.json({ error: 'Invalid scope' }, { status: 400 });
  return Response.json(getMoodBoard(scope));
};

/**
 * Updates image captions only. Upload and delete of image files go through
 * `/api/mood-board/upload` and `/api/mood-board/images/[id]` so the file
 * store stays in sync with metadata.
 */
export const PUT: APIRoute = async ({ request, url }) => {
  const scope = readScope(url);
  if (!scope) return Response.json({ error: 'Invalid scope' }, { status: 400 });

  const body = (await request.json()) as Partial<MoodBoard>;
  const current = getMoodBoard(scope);

  const updated: MoodBoard = {
    images: current.images.map(img => {
      const incoming = body.images?.find(i => i.id === img.id);
      return incoming ? { ...img, caption: String(incoming.caption ?? '') } : img;
    }),
  };
  saveMoodBoard(scope, updated);
  return Response.json(updated);
};
