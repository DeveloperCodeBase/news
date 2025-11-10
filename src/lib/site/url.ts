import { getEnv } from '../env';

const FALLBACK_SITE_URL = 'http://localhost:3000';

function normalizeUrl(url: string): string {
  return url.replace(/\/$/, '');
}

export function getSiteUrl(): string {
  if (typeof window !== 'undefined') {
    const clientEnvUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (clientEnvUrl && clientEnvUrl.length > 0) {
      return normalizeUrl(clientEnvUrl);
    }

    if (window.location.origin) {
      return normalizeUrl(window.location.origin);
    }

    return FALLBACK_SITE_URL;
  }

  const siteUrl =
    process.env.SITE_URL && process.env.SITE_URL.length > 0
      ? process.env.SITE_URL
      : undefined;

  if (siteUrl) {
    return normalizeUrl(siteUrl);
  }

  try {
    const env = getEnv();
    const resolved = env.SITE_URL ?? env.NEXT_PUBLIC_SITE_URL ?? env.NEXTAUTH_URL;
    if (resolved && resolved.length > 0) {
      return normalizeUrl(resolved);
    }
  } catch {
    const resolved =
      process.env.NEXT_PUBLIC_SITE_URL && process.env.NEXT_PUBLIC_SITE_URL.length > 0
        ? process.env.NEXT_PUBLIC_SITE_URL
        : process.env.NEXTAUTH_URL;
    if (resolved && resolved.length > 0) {
      return normalizeUrl(resolved);
    }
  }

  return FALLBACK_SITE_URL;
}

export function getSiteUrlForPath(path: string): string {
  const base = getSiteUrl();
  if (!path) {
    return base;
  }
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  if (path.startsWith('/')) {
    return `${base}${path}`;
  }
  return `${base}/${path}`;
}
