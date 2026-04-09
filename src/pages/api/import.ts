import type { APIRoute } from 'astro';
import { saveChapters, saveCharacters, saveSettings, isValidPageCount } from '../../lib/data';
import type { BookSettings, Chapter, Character } from '../../lib/types';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { settings, chapters, characters } = body as {
      settings?: BookSettings;
      chapters?: Chapter[];
      characters?: Character[];
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
