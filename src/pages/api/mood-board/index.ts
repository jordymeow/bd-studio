import type { APIRoute } from 'astro';
import { getMoodBoard, saveMoodBoard } from '../../../lib/data';
import type { MoodBoard } from '../../../lib/types';

export const GET: APIRoute = async () => {
  return Response.json(getMoodBoard());
};

/**
 * Updates image captions only. Upload and delete of image files go through
 * `/api/mood-board/upload` and `/api/mood-board/images/[id]` so the file
 * store stays in sync with metadata.
 */
export const PUT: APIRoute = async ({ request }) => {
  const body = (await request.json()) as Partial<MoodBoard>;
  const current = getMoodBoard();

  const updated: MoodBoard = {
    images: current.images.map(img => {
      const incoming = body.images?.find(i => i.id === img.id);
      return incoming ? { ...img, caption: String(incoming.caption ?? '') } : img;
    }),
  };
  saveMoodBoard(updated);
  return Response.json(updated);
};
