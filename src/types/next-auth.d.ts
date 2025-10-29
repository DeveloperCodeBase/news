import 'next-auth';
import 'next-auth/jwt';
import type { Role } from '@prisma/client';
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: (DefaultSession['user'] & {
      role?: Role;
    }) | undefined;
  }

  interface User {
    role: Role;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: Role;
    email?: string;
  }
}
