import { afterEach, beforeAll, vi } from 'vitest';
import { resetEnvCache } from '@/lib/env';

beforeAll(() => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://test:test@localhost:5432/test';
  process.env.NEXTAUTH_SECRET =
    process.env.NEXTAUTH_SECRET || 'test_secret_123456789012345678901234567890';
  process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  process.env.NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'test-google-client-id';
  process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'test-google-client-secret';
  process.env.ADMIN_EMAILS = process.env.ADMIN_EMAILS || 'admin@test.dev';
  process.env.EDITOR_EMAILS = process.env.EDITOR_EMAILS || '';
  process.env.CONTRIBUTOR_EMAILS = process.env.CONTRIBUTOR_EMAILS || '';
  process.env.INTERNAL_API_TOKEN = process.env.INTERNAL_API_TOKEN || 'internal_token_123456';
  process.env.MEDIA_UPLOAD_DIR = process.env.MEDIA_UPLOAD_DIR || 'public/media';
});

afterEach(() => {
  vi.restoreAllMocks();
  resetEnvCache();
});
