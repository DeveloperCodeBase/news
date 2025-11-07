import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { InferenceSession, Tensor } from 'onnxruntime-node';
import { getEnv } from '../env';
import { classifyText } from './classifier';

export type TopicPrediction = {
  label: string;
  score: number;
  source: 'onnx' | 'hybrid';
};

const KEYWORD_TOPICS: Array<{ label: string; keywords: string[]; boost?: number }> = [
  { label: 'پژوهش پیشرفته', keywords: ['research', 'paper', 'study', 'پژوهش', 'arxiv'], boost: 1.4 },
  { label: 'محصول و صنعت', keywords: ['launch', 'product', 'market', 'industry', 'صنعت', 'سرمایه'] },
  { label: 'سیاست‌گذاری و حاکمیت', keywords: ['policy', 'regulation', 'governance', 'دولت', 'قانون'], boost: 1.2 },
  { label: 'ایمنی و اخلاق', keywords: ['safety', 'risk', 'ethic', 'مسئولیت', 'امنیت'], boost: 1.3 },
  { label: 'آموزش و یادگیری', keywords: ['tutorial', 'guide', 'course', 'آموزش', 'یادگیری'], boost: 1.1 },
  { label: 'زیرساخت و محاسبات', keywords: ['inference', 'compute', 'gpu', 'cloud', 'مقیاس', 'زیرساخت'] },
  { label: 'متن‌باز و جامعه', keywords: ['open source', 'community', 'github', 'اکوسیستم', 'جامعه'], boost: 1.05 }
];

let sessionPromise: Promise<InferenceSession | null> | null = null;

async function loadOnnxSession(): Promise<InferenceSession | null> {
  if (sessionPromise) {
    return sessionPromise;
  }

  sessionPromise = (async () => {
    try {
      const env = getEnv();
      if (!env.TREND_MODEL_PATH) {
        return null;
      }
      const resolvedPath = path.isAbsolute(env.TREND_MODEL_PATH)
        ? env.TREND_MODEL_PATH
        : path.join(process.cwd(), env.TREND_MODEL_PATH);
      if (!fs.existsSync(resolvedPath)) {
        console.warn('Trend model path not found, falling back to keyword classification.');
        return null;
      }
      const ort = await import('onnxruntime-node');
      const session = await ort.InferenceSession.create(resolvedPath);
      return session;
    } catch (error) {
      console.warn('Failed to load ONNX model for trend topics:', error);
      return null;
    }
  })();

  return sessionPromise;
}

function buildKeywordVector(text: string) {
  const normalized = text.toLowerCase();
  return KEYWORD_TOPICS.map(({ keywords }) => {
    const score = keywords.reduce((total, keyword) => {
      const occurrences = normalized.split(keyword.toLowerCase()).length - 1;
      return total + Math.max(0, occurrences);
    }, 0);
    return score;
  });
}

async function runOnnxClassification(session: InferenceSession, text: string): Promise<TopicPrediction[]> {
  try {
    const ort = await import('onnxruntime-node');
    const vector = buildKeywordVector(text);
    const input = new ort.Tensor('float32', Float32Array.from(vector), [1, vector.length]);
    const outputs = await session.run({ input });
    const logits = outputs.logits ?? outputs.output ?? Object.values(outputs)[0];
    if (!logits) {
      return [];
    }
    const scores = Array.from((logits as Tensor).data as Float32Array);
    const maxScore = Math.max(...scores.map((value) => Math.abs(value)), 1);
    return scores
      .map((score, index) => ({
        label: KEYWORD_TOPICS[index]?.label ?? `topic-${index}`,
        score: Number((score / maxScore).toFixed(3)),
        source: 'onnx' as const
      }))
      .filter((item) => item.score > 0.05)
      .sort((a, b) => b.score - a.score);
  } catch (error) {
    console.warn('ONNX trend classification failed, using fallback classifier.', error);
    return [];
  }
}

function runHybridClassification(text: string): TopicPrediction[] {
  const normalized = text.toLowerCase();
  const keywordScores = KEYWORD_TOPICS.map(({ label, keywords, boost = 1 }) => {
    const score = keywords.reduce((total, keyword) => {
      return total + (normalized.includes(keyword.toLowerCase()) ? 1 : 0);
    }, 0);
    return { label, score: score * boost };
  }).filter((item) => item.score > 0);

  const baseClassification = classifyText(text);
  for (const category of baseClassification.categories) {
    if (category === 'papers') {
      keywordScores.push({ label: 'پژوهش پیشرفته', score: 1.2 });
    } else if (category === 'industry') {
      keywordScores.push({ label: 'محصول و صنعت', score: 1 });
    } else if (category === 'policy') {
      keywordScores.push({ label: 'سیاست‌گذاری و حاکمیت', score: 1 });
    } else if (category === 'safety') {
      keywordScores.push({ label: 'ایمنی و اخلاق', score: 1.1 });
    }
  }

  for (const tag of baseClassification.tags) {
    if (tag === 'compute') {
      keywordScores.push({ label: 'زیرساخت و محاسبات', score: 1 });
    }
    if (tag === 'open-source') {
      keywordScores.push({ label: 'متن‌باز و جامعه', score: 0.9 });
    }
  }

  const aggregated = new Map<string, number>();
  for (const item of keywordScores) {
    aggregated.set(item.label, (aggregated.get(item.label) ?? 0) + item.score);
  }

  return Array.from(aggregated.entries())
    .map(([label, score]) => ({ label, score: Number(score.toFixed(2)), source: 'hybrid' as const }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

export async function predictTopics(text: string): Promise<TopicPrediction[]> {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean) {
    return [];
  }

  const session = await loadOnnxSession();
  const onnxResults = session ? await runOnnxClassification(session, clean) : [];
  if (onnxResults.length) {
    return onnxResults;
  }
  return runHybridClassification(clean);
}

export function buildVisitorKeyHash(visitorKey: string, experimentId: string) {
  return crypto.createHash('sha256').update(`${visitorKey}:${experimentId}`).digest('hex');
}
