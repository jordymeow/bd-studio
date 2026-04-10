import type { APIRoute } from 'astro';
import fs from 'node:fs';
import path from 'node:path';
import { addMoodBoardImage, generateId, UPLOADS_DIR } from '../../../lib/data';

const ALLOWED_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return Response.json({ error: 'No file provided' }, { status: 400 });
    }

    const ext = ALLOWED_EXT[file.type];
    if (!ext) {
      return Response.json(
        { error: `Unsupported type ${file.type}. Allowed: jpg, png, webp, gif` },
        { status: 400 },
      );
    }

    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

    const id = generateId('img');
    const filename = `${id}${ext}`;
    const filepath = path.join(UPLOADS_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    const placed = addMoodBoardImage({
      id,
      filename,
      originalName: file.name,
      caption: '',
      uploadedAt: new Date().toISOString(),
    });

    return Response.json(placed);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }
};
