import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function GET(request: NextRequest) {
  const data = request.nextUrl.searchParams.get('data') ?? 'Wearables Studio';
  const svg = await QRCode.toString(data, { type: 'svg', color: { dark: '#0B0B0B', light: '#FFFFFF' } });
  return new NextResponse(svg, { headers: { 'Content-Type': 'image/svg+xml' } });
}
