import type { NextWebVitalsMetric } from 'next/app';

type MetricRating = 'good' | 'needs-improvement' | 'poor';

function hasRating(metric: NextWebVitalsMetric): metric is NextWebVitalsMetric & { rating: MetricRating } {
  const value = (metric as { rating?: unknown }).rating;
  return value === 'good' || value === 'needs-improvement' || value === 'poor';
}

export function reportWebVitals(metric: NextWebVitalsMetric) {
  if (typeof window === 'undefined') {
    return;
  }

  const rating = hasRating(metric) ? metric.rating : undefined;
  const payload = {
    metric: metric.name,
    value: metric.value,
    rating,
    delta: 'delta' in metric ? metric.delta : undefined,
    navigationType: metric.entries?.[0]?.navigationType,
    route: window.location.pathname
  };

  const body = JSON.stringify(payload);
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics/vitals', body);
  } else {
    void fetch('/api/analytics/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body
    });
  }
}
