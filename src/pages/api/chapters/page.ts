import type { APIRoute } from 'astro';
import { updatePage } from '../../../lib/data';

/**
 * Lightweight page-notes update — used by the per-page editor for autosave so we
 * don't have to round-trip the entire chapter object on every keystroke.
 */
export const PUT: APIRoute = async ({ request }) => {
  const { chapterId, pageId, notes } = await request.json();
  if (typeof chapterId !== 'string' || typeof pageId !== 'string' || typeof notes !== 'string') {
    return Response.json({ error: 'chapterId, pageId, notes required' }, { status: 400 });
  }
  const page = updatePage(chapterId, pageId, notes);
  if (!page) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(page);
};
