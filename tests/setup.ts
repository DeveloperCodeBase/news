import { afterEach, beforeAll, vi } from 'vitest';
import { resetEnvCache } from '@/lib/env';

beforeAll(() => {
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://test:test@localhost:5432/test';
});

afterEach(() => {
  vi.restoreAllMocks();
  resetEnvCache();
});
