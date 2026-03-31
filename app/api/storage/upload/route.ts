import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { BODY_PARTS } from '@/lib/constants/anchor-descriptors';
import type { BodyPartName, Side } from '@/hooks/use-sketch-canvas-rig';

const VALID_PARTS = new Set<string>(BODY_PARTS);

interface UploadBody {
  setName: string;
  images: {
    front: Partial<Record<BodyPartName, string>>;
    back: Partial<Record<BodyPartName, string>>;
  };
}

const WEBP_PREFIX = 'data:image/webp;base64,';

/**
 * GET: Download all images from an SVG set folder, return as data-URL map.
 * Query: ?key={userId}/{setName}
 */
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

  if (!key.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const storageClient = supabaseAdmin ?? supabase;

  // List files in the set folder
  const { data: files, error: listError } = await storageClient.storage
    .from('svgs')
    .list(key, { sortBy: { column: 'name', order: 'asc' } });

  if (listError) {
    return NextResponse.json(
      { error: `List failed: ${listError.message}` },
      { status: 500 },
    );
  }

  const webpFiles = (files ?? []).filter((f) => f.name.endsWith('.webp'));

  const results = await Promise.allSettled(
    webpFiles.map(async (file) => {
      const filePath = `${key}/${file.name}`;
      const { data, error } = await storageClient.storage
        .from('svgs')
        .download(filePath);

      if (error || !data) return null;

      const arrayBuffer = await data.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      const partKey = file.name.replace(/\.webp$/, '');
      return { partKey, dataUrl: `data:image/webp;base64,${base64}` };
    }),
  );

  const images: Record<string, string> = {};
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      images[r.value.partKey] = r.value.dataUrl;
    }
  }

  return NextResponse.json({ images });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: UploadBody;
  try {
    body = (await req.json()) as UploadBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { setName, images } = body;
  if (!setName || typeof setName !== 'string' || !images) {
    return NextResponse.json(
      { error: 'Missing setName or images' },
      { status: 400 },
    );
  }

  const sanitizedName = setName.replace(/[^a-zA-Z0-9_-]/g, '_');
  if (!sanitizedName) {
    return NextResponse.json({ error: 'Invalid setName' }, { status: 400 });
  }

  const paths: string[] = [];
  const errors: string[] = [];

  const storageClient = supabaseAdmin ?? supabase;

  for (const side of ['front', 'back'] as Side[]) {
    const sideImages = images[side] ?? {};
    for (const [partName, dataUrl] of Object.entries(sideImages)) {
      if (!VALID_PARTS.has(partName)) continue;
      if (!dataUrl || !dataUrl.startsWith(WEBP_PREFIX)) continue;

      const base64 = dataUrl.slice(WEBP_PREFIX.length);
      const buffer = Buffer.from(base64, 'base64');
      const storagePath = `${user.id}/${sanitizedName}/${partName}-${side}.webp`;

      const { error } = await storageClient.storage
        .from('svgs')
        .upload(storagePath, buffer, {
          contentType: 'image/webp',
          upsert: true,
        });

      if (error) {
        errors.push(`${partName}-${side}: ${error.message}`);
      } else {
        paths.push(storagePath);
      }
    }
  }

  if (errors.length > 0 && paths.length === 0) {
    return NextResponse.json(
      { error: 'All uploads failed', details: errors },
      { status: 500 },
    );
  }

  return NextResponse.json({
    paths,
    errors: errors.length ? errors : undefined,
  });
}
