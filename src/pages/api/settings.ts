import type { APIRoute } from 'astro';
import { getSettings, saveSettings, isValidTotalPages } from '../../lib/data';

export const GET: APIRoute = async () => {
  return Response.json(getSettings());
};

export const PUT: APIRoute = async ({ request }) => {
  const settings = await request.json();
  if (!isValidTotalPages(settings.totalPages)) {
    return Response.json(
      { error: 'totalPages must be a positive multiple of 8' },
      { status: 400 },
    );
  }
  saveSettings(settings);
  return Response.json(settings);
};
