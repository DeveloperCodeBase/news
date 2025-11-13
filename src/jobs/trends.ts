import { Status } from '@prisma/client';
import { prisma } from '../lib/db/client';
import { predictTopics } from '../lib/news/topics';
import { startCronHeartbeat, finishCronHeartbeat } from '../lib/monitoring/heartbeat';

export async function refreshTrendSnapshot(windowMinutes = 720) {
  const heartbeat = await startCronHeartbeat('trends.refresh');

  try {
    const now = new Date();
    const windowStart = new Date(now.getTime() - windowMinutes * 60 * 1000);

    const articles = await prisma.article.findMany({
      where: {
        status: Status.PUBLISHED,
        publishedAt: { gte: windowStart }
      },
    select: {
      id: true,
      titleFa: true,
      titleEn: true,
      excerptFa: true,
      excerptEn: true,
      contentFa: true,
      contentEn: true,
      aiScore: true,
      topics: { select: { id: true, label: true, score: true } }
    }
  });

    const trendMap = new Map<string, { score: number; articleCount: number }>();

    for (const article of articles) {
      let topics = article.topics;
      if (!topics.length) {
        const text = `${article.titleFa ?? ''} ${article.titleEn ?? ''} ${article.excerptFa ?? ''} ${
          article.excerptEn ?? ''
        } ${article.contentFa ?? ''} ${article.contentEn ?? ''}`;
        const predictions = await predictTopics(text);
        if (predictions.length) {
          await prisma.articleTopic.createMany({
            data: predictions.map((prediction) => ({
              articleId: article.id,
              label: prediction.label,
              score: prediction.score,
              source: prediction.source
            }))
          });
          topics = predictions.map((prediction) => ({
            id: `${article.id}-${prediction.label}`,
            label: prediction.label,
            score: prediction.score
          }));
        }
      }

      const topTopicScore = topics.length ? Math.max(...topics.map((topic) => topic.score)) : null;
      const normalizedScore = typeof topTopicScore === 'number' ? Number(topTopicScore.toFixed(3)) : null;

      if ((normalizedScore ?? null) !== (article.aiScore ?? null)) {
        await prisma.article.update({
          where: { id: article.id },
          data: { aiScore: normalizedScore }
        });
      }

      for (const topic of topics) {
        const current = trendMap.get(topic.label) ?? { score: 0, articleCount: 0 };
        trendMap.set(topic.label, {
          score: current.score + topic.score,
          articleCount: current.articleCount + 1
        });
      }
    }

    if (trendMap.size === 0) {
      await finishCronHeartbeat(heartbeat.id, 'success', {
        startedAt: heartbeat.startedAt,
        message: 'no-topics'
      });
      return null;
    }

    const snapshot = await prisma.trendSnapshot.create({
      data: {
        windowStart,
        windowEnd: now,
        topics: {
          create: Array.from(trendMap.entries())
            .map(([topic, value]) => ({ topic, score: Number(value.score.toFixed(2)), articleCount: value.articleCount }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 12)
        }
      },
      include: { topics: true }
    });

    const staleSnapshots = await prisma.trendSnapshot.findMany({
      orderBy: { generatedAt: 'desc' },
      skip: 6,
      select: { id: true }
    });

    if (staleSnapshots.length) {
      await prisma.topicTrend.deleteMany({ where: { snapshotId: { in: staleSnapshots.map((item) => item.id) } } });
      await prisma.trendSnapshot.deleteMany({ where: { id: { in: staleSnapshots.map((item) => item.id) } } });
    }

    await finishCronHeartbeat(heartbeat.id, 'success', {
      startedAt: heartbeat.startedAt,
      message: `topics:${snapshot.topics.length}`
    });

    return snapshot;
  } catch (error) {
    await finishCronHeartbeat(heartbeat.id, 'error', {
      startedAt: heartbeat.startedAt,
      message: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

export async function getLatestTrendSnapshot(limit = 8) {
  const snapshot = await prisma.trendSnapshot.findFirst({
    orderBy: { generatedAt: 'desc' },
    include: {
      topics: {
        orderBy: { score: 'desc' },
        take: limit
      }
    }
  });
  return snapshot;
}
