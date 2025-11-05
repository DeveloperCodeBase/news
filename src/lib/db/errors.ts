import { Prisma } from '@prisma/client';

export function isPrismaConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P1001') {
    return true;
  }

  const message = extractMessage(error);

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

function extractMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const { message } = error as { message?: unknown };
    if (typeof message === 'string') {
      return message;
    }

    if (message != null) {
      return String(message);
    }
  }

  return '';
}
