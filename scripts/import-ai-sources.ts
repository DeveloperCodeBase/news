#!/usr/bin/env tsx
import path from 'node:path';
import process from 'node:process';
import { loadAiSourcesFromFile, previewAiSourceFile } from '@/lib/news/source-import';

async function main() {
  const relativePath = process.argv[2] ?? path.join('data', 'allainews_sources.md');
  const absolutePath = path.isAbsolute(relativePath)
    ? relativePath
    : path.join(process.cwd(), relativePath);

  const preview = await previewAiSourceFile(absolutePath);
  const sources = await loadAiSourcesFromFile(absolutePath);

  console.log(`Parsed ${preview.count} AI sources from ${absolutePath}`);
  console.log('Language distribution:');
  for (const { language, total } of preview.languages.sort((a, b) => b.total - a.total)) {
    console.log(`  • ${language}: ${total}`);
  }

  const sample = sources.slice(0, 5).map((source) => ({
    name: source.name,
    homepageUrl: source.homepageUrl,
    rssUrl: source.rssUrl ?? null,
    language: source.language,
    tags: source.topicTags
  }));

  console.log('\nSample entries:', JSON.stringify(sample, null, 2));
}

main().catch((error) => {
  console.error('Failed to import AI sources:', error);
  process.exitCode = 1;
});
