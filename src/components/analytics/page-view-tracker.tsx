'use client';

import { useEffect } from 'react';

function getVisitorKey(articleId: string) {
  if (typeof window === 'undefined') {
    return articleId;
  }
  const storageKey = `vista-article-${articleId}`;
  const existing = window.sessionStorage.getItem(storageKey);
  if (existing) {
    return existing;
  }
  const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${articleId}-${Date.now()}`;
  window.sessionStorage.setItem(storageKey, generated);
  return generated;
}

type PageViewTrackerProps = {
  articleId: string;
  experimentKey?: string;
  variantKey?: string;
};

export default function PageViewTracker({ articleId, experimentKey, variantKey }: PageViewTrackerProps) {
  useEffect(() => {
    if (!articleId) return;

    const visitorId = getVisitorKey(articleId);
    let maxCompletion = 0;
    const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    let flushed = false;

    const updateCompletion = () => {
      const totalHeight = document.documentElement.scrollHeight || document.body.scrollHeight || 1;
      const viewportBottom = window.scrollY + window.innerHeight;
      const ratio = Math.min(1, viewportBottom / totalHeight);
      if (ratio > maxCompletion) {
        maxCompletion = ratio;
      }
    };

    const flush = () => {
      if (flushed) return;
      flushed = true;
      window.removeEventListener('scroll', updateCompletion);
      window.removeEventListener('beforeunload', flush);
      const endedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
      const readTimeMs = Math.max(0, Math.round(endedAt - startedAt));
      const completion = Number(maxCompletion.toFixed(2));
      const body = JSON.stringify({
        articleId,
        readTimeMs,
        completion,
        visitorId,
        experimentKey,
        variantKey
      });
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/analytics/pageview', body);
      } else {
        void fetch('/api/analytics/pageview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body
        });
      }
    };

    window.addEventListener('scroll', updateCompletion, { passive: true });
    window.addEventListener('beforeunload', flush);

    return () => {
      flush();
    };
  }, [articleId]);

  return null;
}
