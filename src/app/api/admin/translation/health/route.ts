import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Role, Lang } from '@prisma/client';
import { authOptions } from '@/lib/auth/options';
import { normalizeRole } from '@/lib/auth/permissions';
import { getTranslationHealthSnapshot } from '@/lib/translation/health';
import { translateWithCache } from '@/lib/translation/provider';

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const role = normalizeRole(session.user.role);
  if (role !== Role.ADMIN) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { session };
}

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const snapshot = await getTranslationHealthSnapshot();

  return NextResponse.json({
    provider: snapshot.provider,
    lastSuccessAt: toIso(snapshot.lastSuccessAt),
    lastErrorAt: toIso(snapshot.lastErrorAt),
    lastErrorMessage: snapshot.lastErrorMessage,
    lastErrorContext: snapshot.lastErrorContext
  });
}

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return error;

  const result = await translateWithCache(
    {
      text: 'Hello world',
      sourceLang: Lang.EN,
      targetLang: Lang.FA
    },
    { bypassCache: true, persist: false }
  );

  if (!result.translated) {
    return NextResponse.json(
      {
        ok: false,
        provider: result.providerId,
        error: result.error ?? 'translation-failed'
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, provider: result.providerId, translated: result.translated });
}
