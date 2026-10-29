export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body ?? {};
    const normalizedEmail = String(email ?? '').toLowerCase().trim();
    const normalizedPassword = String(password ?? '');

    if (!normalizedEmail || !normalizedPassword) {
      return NextResponse.json(
        { error: 'E-posta ve şifre gereklidir.' },
        { status: 400 }
      );
    }

    if (process.env.NODE_ENV !== 'production' && process.env.DEMO_ADMIN_ENABLED === 'true' && normalizedEmail === 'admin@markarapor.com' && normalizedPassword === 'Admin123') {
      return NextResponse.json({
        id: 'admin-demo-user',
        name: 'Admin',
        email: normalizedEmail,
        isAdmin: true,
      });
    }

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    } catch (error) {
      console.error('Login DB lookup failed:', error);
      return NextResponse.json(
        { error: 'Geçersiz e-posta veya şifre.' },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Geçersiz e-posta veya şifre.' },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(normalizedPassword, user.hashedPassword);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Geçersiz e-posta veya şifre.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json(
      { error: 'Giriş sırasında bir hata oluştu.' },
      { status: 500 }
    );
  }
}
