import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { env } from '../env/index.js';
import { HttpError } from '../https/errors/index.js';

const MAX_AVATAR_BYTES = 300 * 1024;
const AVATARS_SUBDIR = 'avatars';

const MIME_TO_EXT: Record<string, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
};

function uploadsRoot(): string {
  return path.resolve(env.UPLOADS_DIR);
}

export async function ensureUploadsDirs(): Promise<void> {
  const root = uploadsRoot();
  await mkdir(path.join(root, AVATARS_SUBDIR), { recursive: true });
}

function detectImageMime(buffer: Buffer): string | null {
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return 'image/webp';
  }
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return 'image/jpeg';
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }
  return null;
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const match = /^data:(image\/(?:webp|jpeg|png));base64,(.+)$/i.exec(
    dataUrl.trim(),
  );
  if (!match) {
    throw new HttpError(
      'Foto inválida. Envie uma imagem WebP, JPEG ou PNG.',
      400,
    );
  }
  const mime = match[1]!.toLowerCase();
  const base64 = match[2]!;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(base64, 'base64');
  } catch {
    throw new HttpError('Foto inválida.', 400);
  }
  if (!buffer.length) {
    throw new HttpError('Foto inválida.', 400);
  }
  if (buffer.length > MAX_AVATAR_BYTES) {
    throw new HttpError(
      'A foto é muito grande. Use uma imagem menor (até 300 KB).',
      400,
    );
  }
  return { mime, buffer };
}

export async function saveAvatarFromDataUrl(dataUrl: string): Promise<string> {
  const { mime, buffer } = parseDataUrl(dataUrl);
  const detected = detectImageMime(buffer);
  if (!detected || detected !== mime) {
    throw new HttpError(
      'Foto inválida. O conteúdo não corresponde ao formato informado.',
      400,
    );
  }

  const ext = MIME_TO_EXT[mime];
  if (!ext) {
    throw new HttpError('Formato de foto não suportado.', 400);
  }

  await ensureUploadsDirs();
  const relativePath = `${AVATARS_SUBDIR}/${randomUUID()}.${ext}`;
  const absolutePath = path.join(uploadsRoot(), relativePath);
  await writeFile(absolutePath, buffer);
  return relativePath.replace(/\\/g, '/');
}

export async function deleteAvatar(
  relativePath: string | null | undefined,
): Promise<void> {
  if (!relativePath) return;
  const normalized = relativePath.replace(/\\/g, '/');
  if (
    normalized.includes('..') ||
    !normalized.startsWith(`${AVATARS_SUBDIR}/`)
  ) {
    return;
  }
  const absolutePath = path.join(uploadsRoot(), normalized);
  try {
    await unlink(absolutePath);
  } catch {
    // ignore missing file
  }
}

export function avatarPublicUrl(
  relativePath: string | null | undefined,
): string | null {
  if (!relativePath) return null;
  const normalized = relativePath.replace(/\\/g, '/');
  if (
    normalized.includes('..') ||
    !normalized.startsWith(`${AVATARS_SUBDIR}/`)
  ) {
    return null;
  }
  return `/uploads/${normalized}`;
}
