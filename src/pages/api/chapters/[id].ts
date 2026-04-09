import type { APIRoute } from 'astro';
import { getChapter, updateChapter, deleteChapter, isValidPageCount } from '../../../lib/data';

export const GET: APIRoute = async ({ params }) => {
  const chapter = getChapter(params.id!);
  if (!chapter) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(chapter);
};

export const PUT: APIRoute = async ({ params, request }) => {
  const updates = await request.json();
  if (updates.pageCount !== undefined && !isValidPageCount(updates.pageCount)) {
    return Response.json({ error: 'pageCount must be 2, 4, 6, or 8' }, { status: 400 });
  }
  const chapter = updateChapter(params.id!, updates);
  if (!chapter) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(chapter);
};

export const DELETE: APIRoute = async ({ params }) => {
  const ok = deleteChapter(params.id!);
  if (!ok) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json({ ok: true });
};
