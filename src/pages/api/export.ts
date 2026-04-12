import type { APIRoute } from 'astro';
import { getChapters, getCharacters, getAllMoodBoards, getSettings } from '../../lib/data';

export const GET: APIRoute = async () => {
  return Response.json({
    settings: getSettings(),
    chapters: getChapters(),
    characters: getCharacters(),
    moodBoards: getAllMoodBoards(),
  });
};
