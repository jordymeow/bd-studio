import type { APIRoute } from 'astro';
import {
  isValidPageCount,
  replaceAllMoodBoards,
  saveChapters,
  saveCharacters,
  saveSettings,
  STORY_MOODBOARD_SCOPE,
} from '../../lib/data';
import type { BookSettings, Chapter, Character, MoodBoard } from '../../lib/types';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { settings, chapters, characters, moodBoards, moodBoard } = body as {
      settings?: BookSettings;
      chapters?: Chapter[];
      characters?: Character[];
      moodBoards?: Record<string, MoodBoard>;
      moodBoard?: MoodBoard; // legacy single-scope backups
    };

    if (!settings || !Array.isArray(chapters) || !Array.isArray(characters)) {
      return Response.json(
        { error: 'Invalid format: expected settings, chapters, characters' },
        { status: 400 },
      );
    }

    for (const ch of chapters) {
      if (!isValidPageCount(ch.pageCount)) {
        return Response.json(
          { error: `Chapter "${ch.title}" has invalid pageCount ${ch.pageCount}` },
          { status: 400 },
        );
      }
      if (ch.pages?.length !== ch.pageCount) {
        return Response.json(
          { error: `Chapter "${ch.title}" pages.length (${ch.pages?.length}) does not match pageCount (${ch.pageCount})` },
          { status: 400 },
        );
      }
    }

    saveSettings(settings);
    saveChapters(chapters);
    saveCharacters(characters);

    if (moodBoards && typeof moodBoards === 'object') {
      replaceAllMoodBoards(moodBoards);
    } else if (moodBoard && Array.isArray(moodBoard.images)) {
      // Legacy backups stored a single flat moodBoard → put it under "story".
      replaceAllMoodBoards({ [STORY_MOODBOARD_SCOPE]: moodBoard });
    }

    return Response.json({
      ok: true,
      counts: {
        chapters: chapters.length,
        characters: characters.length,
      },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }
};
