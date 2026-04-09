import type { APIRoute } from 'astro';
import { getCharacters, saveCharacters } from '../../lib/data';

export const GET: APIRoute = async () => {
  return Response.json(getCharacters());
};

export const PUT: APIRoute = async ({ request }) => {
  const characters = await request.json();
  if (!Array.isArray(characters)) {
    return Response.json({ error: 'Array of characters required' }, { status: 400 });
  }
  saveCharacters(characters);
  return Response.json(characters);
};
