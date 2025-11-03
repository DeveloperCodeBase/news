import { Role } from '@prisma/client';
import { getEnv } from '@/lib/env';

function parseEmails(value?: string) {
  if (!value) return [] as string[];
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function getEmailRoleMaps() {
  const env = getEnv();
  return {
    admin: new Set(parseEmails(env.ADMIN_EMAILS)),
    editor: new Set(parseEmails(env.EDITOR_EMAILS)),
    contributor: new Set(parseEmails(env.CONTRIBUTOR_EMAILS))
  } as const;
}

export function roleForEmail(email: string): Role {
  const normalized = email.toLowerCase();
  const lists = getEmailRoleMaps();
  if (lists.admin.has(normalized)) {
    return Role.ADMIN;
  }
  if (lists.editor.has(normalized)) {
    return Role.EDITOR;
  }
  if (lists.contributor.has(normalized)) {
    return Role.CONTRIBUTOR;
  }
  return Role.CONTRIBUTOR;
}

export function isEmailAllowed(email: string): boolean {
  const lists = getEmailRoleMaps();
  const normalized = email.toLowerCase();
  return lists.admin.has(normalized) || lists.editor.has(normalized) || lists.contributor.has(normalized);
}

export function isEditorialRole(role: Role | string | null | undefined): role is Role {
  if (!role) return false;
  const normalized = normalizeRole(role);
  return normalized === Role.ADMIN || normalized === Role.EDITOR;
}

export function normalizeRole(role: unknown): Role | null {
  if (!role) return null;
  if (typeof role === 'string') {
    const upper = role.toUpperCase();
    return upper in Role ? (Role[upper as keyof typeof Role] as Role) : null;
  }
  if (Object.values(Role).includes(role as Role)) {
    return role as Role;
  }
  return null;
}
