import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { Role } from '@prisma/client';
import { authOptions } from '@/lib/auth/options';
import { prisma } from '@/lib/db/client';
import { normalizeRole } from '@/lib/auth/permissions';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = normalizeRole(session.user.role);
  if (role !== Role.ADMIN) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const [heartbeats, queueSnapshots, alerts] = await Promise.all([
    prisma.cronHeartbeat.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.queueSnapshot.findMany({ orderBy: { createdAt: 'desc' }, take: 20 }),
    prisma.alertEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 15 })
  ]);

  return NextResponse.json({ heartbeats, queueSnapshots, alerts });
}
