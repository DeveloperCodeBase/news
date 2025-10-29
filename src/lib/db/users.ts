import { prisma } from './client';
import { Role } from '@prisma/client';

export async function getUserByAuthId(authId: string) {
  return prisma.user.findUnique({ where: { authId } });
}

export async function ensureUser(authId: string, email: string, role: Role = Role.CONTRIBUTOR) {
  return prisma.user.upsert({
    where: { authId },
    create: { authId, email, role },
    update: { email, role }
  });
}
