// API route – list and download files from S3
//
// TODO: Implement GET handler for:
// - List available landmark files
// - List available SVG files
// - Download specific file by key

import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: Implement S3 list/download via AWS SDK
  return NextResponse.json({ error: 'Not implemented' }, { status: 501 });
}
