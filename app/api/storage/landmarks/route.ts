import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { LandmarkFrame } from '@/lib/types';

interface UploadBody {
  name: string;
  frames: LandmarkFrame[];
  dimensions: { width: number; height: number };
}

const MAX_PAYLOAD_BYTES = 10 * 1024 * 1024; // 10 MB safety limit

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const contentLength = req.headers.get('content-length');
  if (contentLength && Number(contentLength) > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  let body: UploadBody;
  try {
    body = (await req.json()) as UploadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, frames, dimensions } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }
  if (!Array.isArray(frames) || frames.length === 0) {
    return NextResponse.json(
      { error: 'Missing or empty frames' },
      { status: 400 },
    );
  }
  if (
    !dimensions ||
    typeof dimensions.width !== 'number' ||
    typeof dimensions.height !== 'number' ||
    dimensions.width <= 0 ||
    dimensions.height <= 0
  ) {
    return NextResponse.json({ error: 'Invalid dimensions' }, { status: 400 });
  }

  // Validate first frame shape
  const sample = frames[0];
  if (
    !Array.isArray(sample) ||
    sample.length === 0 ||
    typeof sample[0]?.x !== 'number' ||
    typeof sample[0]?.y !== 'number'
  ) {
    return NextResponse.json(
      { error: 'Invalid frame structure' },
      { status: 400 },
    );
  }

  const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `${user.id}/${sanitizedName}.json`;

  const payload = JSON.stringify({ name: sanitizedName, dimensions, frames });
  const buffer = Buffer.from(payload);

  if (buffer.byteLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const { error } = await supabase.storage
    .from('landmarks')
    .upload(storagePath, buffer, {
      contentType: 'application/json',
      upsert: true,
    });

  if (error) {
    return NextResponse.json(
      { error: `Upload failed: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ path: storagePath });
}
