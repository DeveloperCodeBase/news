import { Prisma } from '@prisma/client';

export function isPrismaConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P1001') {
    return true;
  }

  const message = typeof error === 'object' && error !== null && 'message' in error ? String((error as any).message) : '';

  return message.includes("Can't reach database server") || message.includes('Unable to require');
}

export async function withPrismaConnectionFallback<T>(factory: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await factory();
  } catch (error) {
    if (isPrismaConnectionError(error)) {
      console.warn('Database connection unavailable during build, using fallback result.');
      return fallback;
    }

    throw error;
  }
}
