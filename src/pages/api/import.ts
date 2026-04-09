import type { APIRoute } from 'astro';
import {
  isValidPageCount,
  saveChapters,
  saveCharacters,
  saveMoodBoard,
  saveSettings,
} from '../../lib/data';
import type { BookSettings, Chapter, Character, MoodBoard } from '../../lib/types';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { settings, chapters, characters, moodBoard } = body as {
      settings?: BookSettings;
      chapters?: Chapter[];
      characters?: Character[];
      moodBoard?: MoodBoard;
    };

    if (!settings || !Array.isArray(chapters) || !Array.isArray(characters)) {
      return Response.json(
        { error: 'Invalid format: expected settings, chapters, characters' },
        { status: 400 },
      );
    }

    // Validate every chapter's pageCount before touching disk
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
    // Mood board is optional for backward compat with older backups.
    if (moodBoard && Array.isArray(moodBoard.images)) {
      saveMoodBoard(moodBoard);
    }

    return Response.json({
      ok: true,
      counts: {
        chapters: chapters.length,
        characters: characters.length,
        images: moodBoard?.images?.length ?? 0,
      },
    });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }
};
