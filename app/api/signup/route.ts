export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name } = body ?? {};

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Ad, e-posta ve şifre gereklidir.' },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).toLowerCase().trim();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Bu e-posta adresi zaten kayıtlı.' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(String(password), 12);

    const user = await prisma.user.create({
      data: {
        name: String(name),
        email: normalizedEmail,
        hashedPassword,
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (err: any) {
    console.error('Signup error:', err);
    return NextResponse.json(
      { error: 'Kayıt sırasında bir hata oluştu.' },
      { status: 500 }
    );
  }
}
