import { Role } from '@prisma/client';

export function isEditorialRole(role: string | null | undefined): role is keyof typeof Role {
  if (!role) return false;
  return role === Role.ADMIN || role === Role.EDITOR;
}

export function normalizeRole(role: unknown): keyof typeof Role | null {
  if (typeof role !== 'string') return null;
  const upper = role.toUpperCase();
  return upper in Role ? (upper as keyof typeof Role) : null;
}
