import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { BodyPartName, Side } from '@/hooks/use-sketch-canvas-rig';

interface UploadBody {
  setName: string;
  images: {
    front: Partial<Record<BodyPartName, string>>;
    back: Partial<Record<BodyPartName, string>>;
  };
}

const WEBP_PREFIX = 'data:image/webp;base64,';

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

  const paths: string[] = [];
  const errors: string[] = [];

  const storageClient = supabaseAdmin ?? supabase;

  for (const side of ['front', 'back'] as Side[]) {
    const sideImages = images[side] ?? {};
    for (const [partName, dataUrl] of Object.entries(sideImages)) {
      if (!dataUrl || !dataUrl.startsWith(WEBP_PREFIX)) continue;

      const base64 = dataUrl.slice(WEBP_PREFIX.length);
      const buffer = Buffer.from(base64, 'base64');
      const storagePath = `${user.id}/${setName}/${partName}-${side}.webp`;

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
