# Hoosh Gate Ingestion Overview

This document explains the new **NewsSource** model, how the ingestion pipeline
is structured, and where operators can observe and manage sources inside the
Admin panel.

## NewsSource data model

The Prisma model (see `prisma/schema.prisma`) stores every AI feed or listing as
`NewsSource`. Important fields include:

| Field | Purpose |
| --- | --- |
| `name`, `homepageUrl` | Display name and public landing page. |
| `rssUrl` | RSS/Atom endpoint (optional). |
| `scrapeUrl` | Listing page to crawl when RSS is missing or blocked. |
| `language`, `region`, `topicTags` | Metadata for filtering and locale routing. |
| `enabled`, `isTrusted`, `blacklisted`, `priority` | Controls ingestion order and publishing behaviour. |
| `lastStatus`, `lastStatusCode`, `lastErrorMessage`, `lastFetchAt` | Updated after every ingestion run so monitoring reflects success/failure. |

The seed file (`prisma/seed.ts`) inserts ~20 well known AI sources as examples
and documents how to extend the list. Operators can add or edit records either
through Prisma or via the Admin UI.

## Ingestion pipeline

Shared helpers live in `src/lib/ingest/sources.ts`:

1. **`fetchSourceFeed`** picks RSS when available and gracefully falls back to
   HTML scraping if feeds respond with 403/404. The function never throws—
   instead it returns `{ ok: false, statusCode, errorMessage }` so the worker can
   log per-source failures.
2. **`normalizeRawItemToArticle`** sanitises the incoming HTML, detects the
   language, and prepares the payload for long‑form enrichment. The longform and
   translation hooks remain pluggable and can call real providers in production.

`runIngestion` (see `src/jobs/index.ts`) loops through enabled sources, uses the
helpers above, generates longform copy, and stores articles under the new
`newsSourceId` relation. Per-source failures are recorded through
`updateNewsSourceIngestionStatus` and surfaced via alert events.

### Scheduling & logging

* The worker schedules `JOB_NAMES.INGEST` using `INGEST_CRON` (default
  `*/5 * * * *`).
* Ingestion results are logged to stdout with created/skipped counts and a
  concise list of failing sources. `docker compose logs -f worker` shows these
  entries during operation.
* Heartbeats include `sourceFailures` so the monitoring dashboard highlights
  problematic feeds.

## Admin experience

### Managing sources

The **مدیریت منابع خبری** page (`/admin/sources`) lists all records with search
and filtering. Editors can toggle enable/disable, trust level, blacklist status,
priority, and edit RSS/HTML URLs. The summary cards display totals and the
latest failing sources.

### Monitoring ingestion

The **مانیتورینگ لحظه‌ای** dashboard now includes a “وضعیت منابع خبری” section
with aggregate counts and the latest fetch errors. This uses
`getMonitoringSnapshot` to combine queue metrics, heartbeats, alerts, and news
source health in a single API call.

## Extending the source list to 1000+

* Add new entries to the seed array in `src/lib/news/sources.ts` or insert rows
  via the Admin page/API. When seeding large batches, keep `priority` and
  `enabled` aligned with ingestion expectations.
* For sources without RSS, set `scrapeUrl` and optionally a note describing the
  scraping strategy. The placeholder HTML parser is ready for production
  selectors once filled in.
* After changing seeds, rerun `pnpm prisma db seed` (or `prisma db seed` in
  CI) so environments stay consistent.

## Local verification

Because this environment lacks outbound network access, automated tests mock the
HTTP layer (`tests/unit/ingest-sources.test.ts`). In production you can trigger a
single run with:

```bash
pnpm tsx src/jobs/index.ts
```

or call the secured API endpoint `POST /api/admin/ingest/trigger` as an Admin.
Watch worker logs to confirm per-source status updates and check the monitoring
dashboard for health summaries.
