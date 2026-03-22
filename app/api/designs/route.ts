import { NextResponse } from 'next/server';
import { getPublishedDesigns } from '@/lib/db';

export async function GET() {
  const designs = await getPublishedDesigns();
  return NextResponse.json(designs);
}
