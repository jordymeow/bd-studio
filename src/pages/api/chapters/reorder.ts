import type { APIRoute } from 'astro';
import { reorderChapters } from '../../../lib/data';

export const PUT: APIRoute = async ({ request }) => {
  const { orderedIds } = await request.json();
  if (!Array.isArray(orderedIds)) {
    return Response.json({ error: 'orderedIds array required' }, { status: 400 });
  }
  reorderChapters(orderedIds);
  return Response.json({ ok: true });
};
