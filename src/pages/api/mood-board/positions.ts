import type { APIRoute } from 'astro';
import { isValidMoodBoardScope, updateMoodBoardPositions } from '../../../lib/data';
import type { MoodBoardLayoutUpdate } from '../../../lib/data';

function isValidUpdate(u: unknown): u is MoodBoardLayoutUpdate {
  if (!u || typeof u !== 'object') return false;
  const obj = u as Record<string, unknown>;
  if (typeof obj.id !== 'string') return false;
  if (obj.x !== undefined && !Number.isFinite(obj.x)) return false;
  if (obj.y !== undefined && !Number.isFinite(obj.y)) return false;
  if (obj.cols !== undefined && !(Number.isInteger(obj.cols) && (obj.cols as number) >= 1)) return false;
  if (obj.rows !== undefined && !(Number.isInteger(obj.rows) && (obj.rows as number) >= 1)) return false;
  return true;
}

export const PUT: APIRoute = async ({ request, url }) => {
  const scope = url.searchParams.get('scope');
  if (!isValidMoodBoardScope(scope)) {
    return Response.json({ error: 'Invalid scope' }, { status: 400 });
  }
  const body = await request.json();
  const updates = body?.updates;
  if (!Array.isArray(updates) || !updates.every(isValidUpdate)) {
    return Response.json(
      { error: 'updates must be an array of { id, x?, y?, cols?, rows? }' },
      { status: 400 },
    );
  }
  updateMoodBoardPositions(scope, updates);
  return Response.json({ ok: true });
};
