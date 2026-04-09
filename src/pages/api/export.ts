import type { APIRoute } from 'astro';
import { getChapters, getCharacters, getMoodBoard, getSettings } from '../../lib/data';

export const GET: APIRoute = async () => {
  return Response.json({
    settings: getSettings(),
    chapters: getChapters(),
    characters: getCharacters(),
    moodBoard: getMoodBoard(),
  });
};
