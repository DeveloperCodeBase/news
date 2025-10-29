import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('Strong!Pass#123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@vista-ai.ir' },
    update: {},
    create: {
      email: 'admin@vista-ai.ir',
      password: passwordHash,
      role: Role.ADMIN
    }
  });

  const categories = [
    { slug: 'news', nameFa: 'خبر', nameEn: 'News' },
    { slug: 'tools', nameFa: 'ابزار', nameEn: 'Tools' },
    { slug: 'papers', nameFa: 'پژوهش', nameEn: 'Papers' },
    { slug: 'industry', nameFa: 'صنعت', nameEn: 'Industry' },
    { slug: 'policy', nameFa: 'سیاست‌گذاری', nameEn: 'Policy' },
    { slug: 'safety', nameFa: 'امنیت', nameEn: 'Safety' },
    { slug: 'tutorials', nameFa: 'آموزش', nameEn: 'Tutorials' },
    { slug: 'events', nameFa: 'رویدادها', nameEn: 'Events' }
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category
    });
  }

  const tags = [
    'LLM',
    'Inference',
    'Vision',
    'NLP',
    'Robot',
    'Compute',
    'Open-Source'
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { slug: tag.toLowerCase() },
      update: {},
      create: {
        slug: tag.toLowerCase(),
        nameFa: tag,
        nameEn: tag
      }
    });
  }

  const sources = [
    {
      name: 'OpenAI Blog',
      url: 'https://openai.com/blog',
      feedUrl: 'https://openai.com/blog/rss/',
      isTrusted: true
    },
    {
      name: 'Google DeepMind',
      url: 'https://deepmind.google/',
      feedUrl: 'https://deepmind.google/feeds/news',
      isTrusted: true
    },
    {
      name: 'MIT News - AI',
      url: 'https://news.mit.edu/topic/artificial-intelligence2',
      feedUrl: 'https://news.mit.edu/rss/topic/artificial-intelligence2',
      isTrusted: false
    }
  ];

  for (const source of sources) {
    await prisma.source.upsert({
      where: { feedUrl: source.feedUrl },
      update: source,
      create: source
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error('Seed failed', error);
    await prisma.$disconnect();
    process.exit(1);
  });
