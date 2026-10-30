import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const DEMO_ADMIN = {
  id: 'admin-demo-user',
  email: 'admin@markarapor.com',
  name: 'Admin',
  isAdmin: true,
  companyName: 'MarkaRapor Admin',
} as const;
// Demo admin yalnizca acikca izin verilirse (DEMO_ADMIN_ENABLED="true") ve production disinda calisir.
// Veritabanina yazilmaz; demo verileri bellekte tutulur (lib/demo-data.ts).
const demoAdminEnabled = process.env.NODE_ENV !== 'production' && process.env.DEMO_ADMIN_ENABLED === 'true';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = String(credentials.email).toLowerCase().trim();
        const password = String(credentials.password);
        const isAdminLogin = email === 'admin@markarapor.com' && password === 'Admin123';

        if (isAdminLogin && demoAdminEnabled) {
          return DEMO_ADMIN as any;
        }

        let user: any = null;
        try {
          user = await prisma.user.findUnique({ where: { email } });
        } catch (error) {
          console.error('Auth DB lookup failed:', error);
          return null;
        }

        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(password, user.hashedPassword);

        if (!isValid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          companyName: user.companyName,
        } as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: any) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
        token.companyName = user.companyName;
      }
      return token;
    },
    async session({ session, token }: any) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = token.isAdmin as boolean;
        session.user.companyName = token.companyName as string;
      }
      return session;
    },
  },
});
