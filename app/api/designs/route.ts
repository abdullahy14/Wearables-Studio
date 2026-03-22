import { NextResponse } from 'next/server';
import { z } from 'zod';

import { createDesign, generateQrCode, listPublishedDesigns } from '@/lib/store';

const designSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(2),
  imageUrl: z.string().min(2),
  price: z.number(),
  isPublished: z.boolean(),
  creatorId: z.string().min(2),
  layers: z.array(
    z.object({
      id: z.string(),
      type: z.enum(['text', 'image']),
      value: z.string(),
      x: z.number(),
      y: z.number(),
      width: z.number().optional(),
      height: z.number().optional(),
      fontSize: z.number().optional(),
      color: z.string().optional()
    })
  )
});

export async function GET() {
  const designs = await listPublishedDesigns();
  return NextResponse.json({ designs });
}

export async function POST(request: Request) {
  const body = designSchema.parse(await request.json());
  const design = await createDesign(body);
  await generateQrCode('design', design.id, `https://wearables.studio/designs/${design.id}`);

  return NextResponse.json({ id: design.id });
}
