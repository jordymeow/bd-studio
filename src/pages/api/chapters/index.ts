import type { APIRoute } from 'astro';
import { getChapters, createChapter, isValidPageCount } from '../../../lib/data';

export const GET: APIRoute = async () => {
  return Response.json(getChapters());
};

export const POST: APIRoute = async ({ request }) => {
  const { title, pageCount } = await request.json();
  if (!title?.trim()) {
    return Response.json({ error: 'Title is required' }, { status: 400 });
  }
  if (!isValidPageCount(pageCount)) {
    return Response.json({ error: 'pageCount must be 2, 4, 6, or 8' }, { status: 400 });
  }
  const chapter = createChapter(title.trim(), pageCount);
  return Response.json(chapter, { status: 201 });
};
