import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const ALLOWED_BUCKETS = ['landmarks', 'svgs', 'animations'] as const;
type BucketName = (typeof ALLOWED_BUCKETS)[number];

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bucket = req.nextUrl.searchParams.get('bucket') as BucketName | null;
  const key = req.nextUrl.searchParams.get('key');

  if (!bucket || !ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json(
      { error: 'Invalid or missing bucket parameter' },
      { status: 400 },
    );
  }

  if (!key) {
    return NextResponse.json(
      { error: 'Missing key parameter' },
      { status: 400 },
    );
  }

  // Enforce that the key belongs to the authenticated user
  if (!key.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const storageClient = supabaseAdmin ?? supabase;
  const { error } = await storageClient.storage.from(bucket).remove([key]);

  if (error) {
    return NextResponse.json(
      { error: `Delete failed: ${error.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
