export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireBrand } from '@/lib/brand';
import { generateShareToken, hashShareToken, linkState, parseExpiry, parseSections } from '@/lib/share-token';
import type { ShareLink } from '@prisma/client';

function linkToJson(l: ShareLink) {
  return {
    id: l.id,
    label: l.label,
    sections: parseSections(l.sections),
    state: linkState(l),
    expires_at: l.expiresAt?.toISOString() ?? null,
    revoked_at: l.revokedAt?.toISOString() ?? null,
    last_viewed_at: l.lastViewedAt?.toISOString() ?? null,
    view_count: l.viewCount,
    created_at: l.createdAt.toISOString(),
  };
}

/** GET /api/share-links — aktif markanın müşteri linkleri (linklerin kendisi değil, bilgileri) */
export async function GET() {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const links = await prisma.shareLink.findMany({ where: { brandId: ctx.brandId }, orderBy: { createdAt: 'desc' } });
  return NextResponse.json({ brand: ctx.brand.name, links: links.map(linkToJson) });
}

/** POST /api/share-links { label, sections, expires_at? } — link YALNIZCA bu yanıtta döner */
export async function POST(req: NextRequest) {
  const ctx = await requireBrand();
  if (ctx instanceof NextResponse) return ctx;
  const body = await req.json().catch(() => null);

  const label = String(body?.label ?? '').trim().slice(0, 80) || `${ctx.brand.name} müşteri linki`;
  const sections = parseSections(body?.sections);
  if (!sections.length) return NextResponse.json({ error: 'En az bir bölüm seçin.' }, { status: 400 });
  const expiry = parseExpiry(body?.expires_at);
  if ('error' in expiry) return NextResponse.json({ error: expiry.error }, { status: 400 });

  const token = generateShareToken();
  const link = await prisma.shareLink.create({
    data: {
      brandId: ctx.brandId,
      userId: ctx.userId,
      label,
      tokenHash: hashShareToken(token),
      sections: JSON.stringify(sections),
      expiresAt: expiry.value,
    },
  });
  return NextResponse.json({ ...linkToJson(link), path: `/p/${token}` }, { status: 201 });
}
