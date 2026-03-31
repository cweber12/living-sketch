import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  LandmarkFrame,
  SvgParts,
  ShiftFactors,
  ScaleFactors,
} from '@/lib/types';

interface AnimationBody {
  name: string;
  landmarks: LandmarkFrame[];
  svgs: SvgParts;
  dimensions: { width: number; height: number };
  shiftFactors: ShiftFactors;
  scaleFactors: ScaleFactors;
}

const MAX_PAYLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

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

  let body: AnimationBody;
  try {
    body = (await req.json()) as AnimationBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { name, landmarks, svgs, dimensions, shiftFactors, scaleFactors } =
    body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'Missing name' }, { status: 400 });
  }
  if (!Array.isArray(landmarks) || landmarks.length === 0) {
    return NextResponse.json(
      { error: 'Missing or empty landmarks' },
      { status: 400 },
    );
  }
  if (!svgs || typeof svgs !== 'object' || Object.keys(svgs).length === 0) {
    return NextResponse.json(
      { error: 'Missing or empty svgs' },
      { status: 400 },
    );
  }
  if (
    !dimensions ||
    typeof dimensions.width !== 'number' ||
    typeof dimensions.height !== 'number'
  ) {
    return NextResponse.json({ error: 'Invalid dimensions' }, { status: 400 });
  }

  const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const storagePath = `${user.id}/${sanitizedName}.json`;

  const payload = JSON.stringify({
    name: sanitizedName,
    timestamp: new Date().toISOString(),
    dimensions,
    landmarks,
    svgs,
    shiftFactors,
    scaleFactors,
  });

  const buffer = Buffer.from(payload);
  if (buffer.byteLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  const storageClient = supabaseAdmin ?? supabase;
  const { error } = await storageClient.storage
    .from('animations')
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

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const key = req.nextUrl.searchParams.get('key');
  if (!key || typeof key !== 'string') {
    return NextResponse.json({ error: 'Missing key' }, { status: 400 });
  }

  // Ensure user can only access their own data
  if (!key.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const storageClient = supabaseAdmin ?? supabase;
  const { data, error } = await storageClient.storage
    .from('animations')
    .download(key);

  if (error || !data) {
    return NextResponse.json(
      { error: `Download failed: ${error?.message ?? 'unknown'}` },
      { status: 500 },
    );
  }

  const text = await data.text();
  return NextResponse.json(JSON.parse(text));
}
