import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import crypto from 'crypto';
import path from 'path';
import { promises as fs } from 'fs';
import sharp from 'sharp';
import { authOptions } from '@/lib/auth/options';
import { isEditorialRole } from '@/lib/auth/permissions';
import { getEnv } from '@/lib/env';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.role || !isEditorialRole(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 });
  }

  const env = getEnv();
  const uploadDir = path.join(process.cwd(), env.MEDIA_UPLOAD_DIR);
  await fs.mkdir(uploadDir, { recursive: true });

  const originalExtension = path.extname(file.name)?.toLowerCase() || '';
  const identifier = crypto.randomUUID();
  const arrayBuffer = await file.arrayBuffer();
  const baseBuffer = Buffer.from(arrayBuffer);
  let outputBuffer = baseBuffer;
  let filename = `${identifier}.webp`;

  try {
    outputBuffer = await sharp(baseBuffer).rotate().webp({ quality: 85 }).toBuffer();
  } catch (error) {
    console.warn('Image optimization failed, using original buffer.', error);
    filename = `${identifier}${originalExtension || '.bin'}`;
    outputBuffer = baseBuffer;
  }

  const outputPath = path.join(uploadDir, filename);
  await fs.writeFile(outputPath, outputBuffer);

  const relativePath = path.relative(path.join(process.cwd(), 'public'), outputPath).replace(/\\\\/g, '/');
  const publicUrl = `/${relativePath}`;

  return NextResponse.json({ uploaded: true, url: publicUrl });
}
