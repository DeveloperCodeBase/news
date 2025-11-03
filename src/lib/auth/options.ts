import { PrismaAdapter } from '@next-auth/prisma-adapter';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/db/client';
import { getEnv } from '@/lib/env';
import { isEmailAllowed, roleForEmail } from '@/lib/auth/permissions';
import GoogleProvider from 'next-auth/providers/google';
import type { NextAuthOptions } from 'next-auth';

const env = getEnv();

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt'
  },
  pages: {
    signIn: '/login'
  },
  providers: [
    GoogleProvider({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET
    })
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.toLowerCase();
      if (!email) {
        return false;
      }
      return isEmailAllowed(email);
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const email = user.email.toLowerCase();
        const role = roleForEmail(email);
        token.email = email;
        token.role = role;
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              email,
              role,
              name: user.name ?? user.email?.split('@')[0] ?? email,
              image: user.image ?? null
            }
          });
        } catch {
          await prisma.user.upsert({
            where: { email },
            update: { role, name: user.name ?? email, image: user.image ?? null },
            create: {
              email,
              role,
              name: user.name ?? email,
              image: user.image ?? null
            }
          });
        }
      }

      if (!token.role && token.email) {
        const userRecord = await prisma.user.findUnique({ where: { email: token.email as string } });
        token.role = userRecord?.role ?? Role.CONTRIBUTOR;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = (token.email as string | undefined) ?? session.user.email ?? undefined;
        session.user.role = (token.role as Role | undefined) ?? Role.CONTRIBUTOR;
      }
      return session;
    }
  }
};
