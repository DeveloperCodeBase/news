import {
  PrismaClient,
  Role,
  Status,
  Lang,
  ExperimentStatus,
  ExperimentTemplateType
} from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const seedUsers = [
    {
      email: 'admin@hooshgate.ir',
      name: 'Hoosh Gate Admin',
      role: Role.ADMIN
    },
    {
      email: 'editor@hooshgate.ir',
      name: 'Hoosh Gate Editor',
      role: Role.EDITOR
    }
  ];

  for (const user of seedUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { role: user.role, name: user.name },
      create: user
    });
  }

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
      isTrusted: true,
      notes: 'منبع رسمی OpenAI',
      priority: 5
    },
    {
      name: 'Google DeepMind',
      url: 'https://deepmind.google/',
      feedUrl: 'https://deepmind.google/feeds/news',
      isTrusted: true,
      notes: 'پوشش پژوهش‌های دیپ‌مایند',
      priority: 5
    },
    {
      name: 'MIT News - AI',
      url: 'https://news.mit.edu/topic/artificial-intelligence2',
      feedUrl: 'https://news.mit.edu/rss/topic/artificial-intelligence2',
      isTrusted: false,
      notes: 'رسانه دانشگاهی'
    },
    {
      name: 'Anthropic',
      url: 'https://www.anthropic.com/news',
      feedUrl: 'https://www.anthropic.com/rss.xml',
      isTrusted: true
    },
    {
      name: 'NVIDIA Developer Blog',
      url: 'https://developer.nvidia.com/blog',
      feedUrl: 'https://developer.nvidia.com/blog/feed/',
      isTrusted: true
    },
    {
      name: 'Hugging Face',
      url: 'https://huggingface.co/blog',
      feedUrl: 'https://huggingface.co/blog/feed.xml',
      isTrusted: true,
      notes: 'اکوسیستم متن‌باز'
    },
    {
      name: 'VentureBeat AI',
      url: 'https://venturebeat.com/category/ai/',
      feedUrl: 'https://venturebeat.com/category/ai/feed/',
      isTrusted: false,
      notes: 'خبرهای صنعت'
    }
  ];

  for (const source of sources) {
    await prisma.source.upsert({
      where: { feedUrl: source.feedUrl },
      update: source,
      create: source
    });
  }

  const sampleArticles = [
    {
      slug: '202405-gpt-advancements',
      titleFa: 'پیشرفت‌های جدید GPT در سال ۲۰۲۴',
      titleEn: 'New GPT advancements arrive in 2024',
      excerptFa: 'OpenAI نسل بعدی مدل‌های زبانی خود را با تمرکز بر کارایی و کنترل دقیق‌تر معرفی کرد.',
      excerptEn: 'OpenAI introduced the next wave of GPT models focusing on efficiency and controllability.',
      contentFa:
        '<p>OpenAI مدل جدیدی از مجموعه GPT معرفی کرده که به صورت بومی از زبان فارسی پشتیبانی می‌کند و امکان استفاده امن‌تری برای صنایع حساس فراهم می‌کند.</p>',
      contentEn:
        '<p>OpenAI unveiled the latest GPT lineup with native Persian support, enabling safer deployments for regulated industries.</p>',
      coverImageUrl: 'https://cdn.openai.com/news/gpt-2024.jpg',
      sourceFeedUrl: 'https://openai.com/blog/rss/',
      categories: ['news', 'industry'],
      tags: ['llm', 'compute'],
      language: Lang.FA
    },
    {
      slug: '202405-ai-safety-pact',
      titleFa: 'پیمان جهانی برای ایمنی هوش مصنوعی',
      titleEn: 'Global AI safety pact signed by major labs',
      excerptFa: 'رهبران صنعت توافق کردند چارچوبی مشترک برای ارزیابی ریسک مدل‌های بزرگ پیاده‌سازی کنند.',
      excerptEn: 'Industry leaders agreed on a joint framework to evaluate large-model risks.',
      contentFa:
        '<p>در رویدادی مشترک میان اتحادیه اروپا و شرکت‌های بزرگ فناوری، سازوکاری برای ارزیابی ریسک و گزارش‌دهی شفاف مدل‌های بزرگ AI تدوین شد.</p>',
      contentEn:
        '<p>During a joint summit with the EU and leading tech firms, a new risk evaluation and transparency framework for frontier AI models was established.</p>',
      coverImageUrl: 'https://hooshgate.ir/images/ai-safety.jpg',
      sourceFeedUrl: 'https://deepmind.google/feeds/news',
      categories: ['policy', 'safety'],
      tags: ['open-source', 'llm'],
      language: Lang.EN
    }
  ];

  for (const article of sampleArticles) {
    const created = await prisma.article.upsert({
      where: { slug: article.slug },
      update: {
        titleFa: article.titleFa,
        titleEn: article.titleEn,
        excerptFa: article.excerptFa,
        excerptEn: article.excerptEn,
        summaryFa: article.excerptFa,
        summaryEn: article.excerptEn,
        contentFa: article.contentFa,
        contentEn: article.contentEn,
        coverImageUrl: article.coverImageUrl,
        status: Status.PUBLISHED
      },
      create: {
        slug: article.slug,
        urlCanonical: `https://hooshgate.ir/${article.slug}`,
        titleFa: article.titleFa,
        titleEn: article.titleEn,
        excerptFa: article.excerptFa,
        excerptEn: article.excerptEn,
        summaryFa: article.excerptFa,
        summaryEn: article.excerptEn,
        contentFa: article.contentFa,
        contentEn: article.contentEn,
        coverImageUrl: article.coverImageUrl,
        source: { connect: { feedUrl: article.sourceFeedUrl } },
        status: Status.PUBLISHED,
        publishedAt: new Date('2024-05-01T10:00:00Z'),
        language: article.language,
        categories: {
          create: article.categories.map((slug) => ({
            category: { connect: { slug } }
          }))
        },
        tags: {
          create: article.tags.map((slug) => ({
            tag: { connect: { slug } }
          }))
        }
      }
    });

    const totalViews = Math.floor(Math.random() * 120) + 30;
    const uniqueVisitors = Math.floor(Math.random() * 90) + 20;
    const avgReadTimeMs = 78000;
    const avgCompletion = 0.68;

    await prisma.articleAnalytics.upsert({
      where: { articleId: created.id },
      update: {},
      create: {
        articleId: created.id,
        totalViews,
        uniqueVisitors,
        totalReadTimeMs: avgReadTimeMs * totalViews,
        totalCompletion: avgCompletion * totalViews,
        avgReadTimeMs,
        avgCompletion
      }
    });
  }

  const experiments = [
    {
      key: 'article-template',
      name: 'قالب صفحه خبر',
      description: 'مقایسه چیدمان کلاسیک در برابر نسخه مدرن با تاکید بر تصاویر',
      status: ExperimentStatus.RUNNING,
      variants: [
        {
          key: 'classic',
          label: 'چیدمان کلاسیک',
          weight: 1,
          templateType: ExperimentTemplateType.ARTICLE,
          templatePath: 'classic'
        },
        {
          key: 'immersive',
          label: 'چیدمان غنی',
          weight: 1,
          templateType: ExperimentTemplateType.ARTICLE,
          templatePath: 'immersive'
        }
      ]
    },
    {
      key: 'newsletter-template',
      name: 'قالب خبرنامه',
      description: 'آزمایش خبرنامه مینیمال در مقابل نسخه روایی',
      status: ExperimentStatus.RUNNING,
      variants: [
        {
          key: 'minimal',
          label: 'خبرنامه مینیمال',
          weight: 1,
          templateType: ExperimentTemplateType.NEWSLETTER,
          templatePath: 'minimal'
        },
        {
          key: 'story',
          label: 'خبرنامه روایی',
          weight: 1,
          templateType: ExperimentTemplateType.NEWSLETTER,
          templatePath: 'story'
        }
      ]
    }
  ];

  for (const experiment of experiments) {
    const upserted = await prisma.experiment.upsert({
      where: { key: experiment.key },
      update: {
        name: experiment.name,
        description: experiment.description,
        status: experiment.status
      },
      create: {
        key: experiment.key,
        name: experiment.name,
        description: experiment.description,
        status: experiment.status
      }
    });

    for (const variant of experiment.variants) {
      await prisma.experimentVariant.upsert({
        where: { experimentId_key: { experimentId: upserted.id, key: variant.key } },
        update: {
          label: variant.label,
          weight: variant.weight,
          templateType: variant.templateType,
          templatePath: variant.templatePath
        },
        create: {
          experimentId: upserted.id,
          key: variant.key,
          label: variant.label,
          weight: variant.weight,
          templateType: variant.templateType,
          templatePath: variant.templatePath
        }
      });
    }
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
