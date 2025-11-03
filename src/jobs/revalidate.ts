import { getEnv } from '@/lib/env';

export async function runRevalidate(slug: string) {
  const env = getEnv();
  const baseUrl = env.INTERNAL_API_URL ?? env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000';

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/internal/revalidate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        authorization: `Bearer ${env.INTERNAL_API_TOKEN}`
      },
      body: JSON.stringify({ slug })
    });

    if (!response.ok) {
      const message = await response.text();
      console.error('Failed to trigger revalidation', { status: response.status, message });
    }
  } catch (error) {
    console.error('Unexpected error while requesting revalidation', error);
  }
}
