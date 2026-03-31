import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const ALLOWED_BUCKETS = ['landmarks', 'svgs', 'animations'] as const;
type BucketName = (typeof ALLOWED_BUCKETS)[number];

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const bucket = req.nextUrl.searchParams.get('bucket') as BucketName | null;
  if (!bucket || !ALLOWED_BUCKETS.includes(bucket)) {
    return NextResponse.json(
      { error: 'Invalid or missing bucket parameter' },
      { status: 400 },
    );
  }

  const storageClient = supabaseAdmin ?? supabase;
  const { data, error } = await storageClient.storage
    .from(bucket)
    .list(user.id, { sortBy: { column: 'name', order: 'desc' } });

  if (error) {
    return NextResponse.json(
      { error: `List failed: ${error.message}` },
      { status: 500 },
    );
  }

  const files = (data ?? [])
    .filter((f) => f.name !== '.emptyFolderPlaceholder')
    .map((f) => ({
      key: `${user.id}/${f.name}`,
      name: f.name,
      source: 'cloud' as const,
    }));

  return NextResponse.json({ files });
}
