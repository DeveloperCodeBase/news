# Vista AI News Magazine

مجلهٔ خبری «ویستا AI» یک پلتفرم دو‌زبانهٔ مبتنی بر Next.js 14 است که با هدف گردآوری، ترجمه و انتشار سریع اخبار هوش مصنوعی طراحی شده است. این مخزن شامل لایهٔ کاربری، پنل مدیریت، پایپلاین جمع‌آوری خودکار، صف پردازش، و تست‌های کیفی است و برای اجرا روی سرورهای شخصی یا استقرار ابری (Vercel + Supabase) آماده‌سازی شده است.

## نمای کلی پروژه

| حوزه | وضعیت پیاده‌سازی |
| --- | --- |
| رابط کاربری عمومی | صفحهٔ اصلی، لیست اخبار، صفحهٔ خبر، صفحات درباره/تماس، جست‌وجو و خروجی‌های SEO (RSS/Sitemap/Robots) پیاده‌سازی شده‌اند. |
| بین‌المللی‌سازی | `next-intl` زبان‌های فارسی/انگلیسی را با پشتیبانی RTL، سوئیچ زبان و متون بومی مدیریت می‌کند. |
| احراز هویت | Supabase Auth (Email/Password) با نقش‌های Admin/Editor/Contributor و Middleware محافظ مسیر `/admin`. |
| پنل مدیریت | صف بازبینی، ویرایشگر TipTap دو‌زبانه، تنظیم وضعیت خبر، مدیریت انتشار و خروج از حساب. |
| پایپلاین جمع‌آوری | `rss-parser` + `metascraper` + پاکسازی HTML + جلوگیری از تکرار، طبقه‌بندی کلیدواژه‌ای و ذخیره در Postgres. |
| ترجمهٔ خودکار | رابط pluggable برای LibreTranslate، OpenAI یا Google با کش ترجمه در DB جهت جلوگیری از تکرار. |
| صف و کران | صف `pg-boss` با Worker اختصاصی (`queue:worker`) برای هماهنگی اینجست و بازسازی کش. |
| تست و کیفیت | تست‌های واحد برای طبقه‌بندی، تست‌های انتها-به-انتها برای ترجمه، ESLint/Prettier/Husky، TypeScript strict. |

## فناوری‌های کلیدی

- **Next.js 14 (App Router)** برای SSR/ISR و ساختار مسیر‌های `/[locale]` و `/admin`.
- **TailwindCSS + shadcn/ui + lucide-react** برای ساخت رابط کاربری واکنش‌گرا و قابل سفارشی‌سازی.
- **Supabase (Auth + Postgres + Storage)** به‌عنوان بکند احراز هویت و پایگاه‌داده.
- **Prisma** برای مدل‌سازی، مهاجرت و دسترسی به داده.
- **pg-boss** برای صف و زمان‌بندی ایمن وظایف.
- **RSS Parser + Metascraper + sanitize-html** جهت نرمال‌سازی محتوا.
- **Vitest** برای پوشش تستی.

## آماده‌سازی سرور از صفر (Ubuntu 22.04)

دستورالعمل زیر برای سروری است که هیچ ابزار از پیش نصب‌شده‌ای ندارد. پیش‌فرض بر این است که احراز هویت و دیتابیس از Supabase تأمین می‌شود. در صورت اجرای Postgres محلی، مراحل را متناسب تغییر دهید.

### ۱. به‌روزرسانی سیستم و نصب ابزار پایه

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl git unzip
```

### ۲. نصب Node.js و pnpm

```bash
# نصب nvm برای مدیریت نسخه‌های Node
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh
nvm install 20
nvm use 20

# نصب pnpm (نسخهٔ اشاره‌شده در package.json)
curl -fsSL https://get.pnpm.io/install.sh | PNPM_VERSION=10.13.1 sh -
source ~/.bashrc
```

### ۳. نصب Postgres (اختیاری، برای دیپلوی محلی بدون Supabase)

اگر قصد استفاده از Supabase را دارید این بخش را رد کنید. برای Postgres محلی:

```bash
sudo apt install -y postgresql postgresql-contrib
sudo -u postgres psql -c "CREATE ROLE vista WITH LOGIN PASSWORD 'change_me'"
sudo -u postgres psql -c "ALTER ROLE vista CREATEDB"
createdb vista_ai_news -U vista
```

### ۴. ایجاد پروژه در Supabase

1. در [Supabase](https://supabase.com/) پروژهٔ جدید بسازید.
2. در تب **Authentication → Providers** ورود ایمیل/رمز را فعال کنید.
3. در تب **Database**، اتصال `DATABASE_URL` (pooling disabled) را یادداشت کنید.
4. در بخش **Project Settings → API** کلیدهای `ANON_KEY` و `SERVICE_ROLE_KEY` را بردارید.
5. یک Bucket با نام `media` در Supabase Storage بسازید و سطح دسترسی را Public قرار دهید.

### ۵. کلون مخزن و تنظیم محیط

```bash
git clone https://github.com/<YOUR_ORG>/vista-ai-news.git
cd vista-ai-news
cp .env.example .env

# مقادیر زیر را در .env تکمیل کنید
# - DATABASE_URL (از Supabase یا Postgres محلی)
# - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY و همچنین NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY
# - QUEUE_DATABASE_URL (در صورت استفاده از دیتابیس جدا برای صف) و JOB_QUEUE_SCHEMA
# - LT_URL یا کلیدهای سرویس ترجمه (حداقل یکی)
# - ALERT_EMAIL
```

### ۶. نصب وابستگی‌ها و آماده‌سازی پایگاه‌داده

```bash
pnpm install

# اجرای مهاجرت‌ها
pnpm prisma migrate deploy

# دادهٔ اولیه (نقش‌ها، دسته‌ها، منابع و نمونه‌خبر)
pnpm seed
```

> **نکته:** برای اتصال احراز هویت Supabase به کاربران Seed، شناسه‌های Supabase (`auth.users.id`) را با `prisma/seed.ts` هماهنگ کنید یا پس از ثبت‌نام کاربر در برنامه، نقش او را با اسکریپت `src/lib/db/users.ts` به‌روزرسانی کنید.

### ۷. راه‌اندازی سرور برنامه و Worker صف

```bash
# اجرای سرور Next.js (Production)
pnpm build
pnpm start

# در ترمینال جداگانه برای صف
pnpm queue:worker
```

برای اجرای دائم می‌توانید از `pm2`, `systemd` یا Docker استفاده کنید. نمونهٔ `systemd` در بخش «اتومات‌سازی عملیات» آمده است.

### ۸. راه‌اندازی Reverse Proxy (اختیاری اما توصیه‌شده)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx

# فایل /etc/nginx/sites-available/vista.conf
sudo tee /etc/nginx/sites-available/vista.conf <<'NGINX'
server {
  listen 80;
  server_name news.vista-ai.ir; # دامنهٔ خود را قرار دهید

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
NGINX

sudo ln -s /etc/nginx/sites-available/vista.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d news.vista-ai.ir --email devcodebase.dec@gmail.com --agree-tos --redirect
```

### ۹. برنامه‌ریزی کران‌ها

Worker صف `pnpm queue:worker` وظایف زمان‌بندی‌شده را از طریق `pg-boss` اجرا می‌کند (اینجست هر ۳۰ دقیقه، بازسازی کش پس از انتشار). برای اطمینان از اجرا پس از ریبوت، فایل‌های `systemd` نمونه:

```ini
# /etc/systemd/system/vista-web.service
[Unit]
Description=Vista AI News Next.js Server
After=network.target

[Service]
WorkingDirectory=/opt/vista-ai-news
Environment=NODE_ENV=production
ExecStart=/usr/bin/env pnpm start
Restart=always
User=ubuntu

[Install]
WantedBy=multi-user.target
```

```ini
# /etc/systemd/system/vista-worker.service
[Unit]
Description=Vista AI News Queue Worker
After=network.target vista-web.service

[Service]
WorkingDirectory=/opt/vista-ai-news
Environment=NODE_ENV=production
ExecStart=/usr/bin/env pnpm queue:worker
Restart=always
User=ubuntu

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now vista-web vista-worker
```

## تنظیمات محیطی

فایل `.env.example` تمامی متغیرها را لیست کرده است. مهم‌ترین موارد:

| متغیر | توضیح |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | دامنهٔ عمومی برای لینک‌های سئو. |
| `DATABASE_URL` | اتصال Postgres (Supabase یا محلی). |
| `SUPABASE_URL`، `SUPABASE_SERVICE_ROLE_KEY` | دسترسی سرور به Auth و Storage. |
| `NEXT_PUBLIC_SUPABASE_URL`، `NEXT_PUBLIC_SUPABASE_ANON_KEY` | دسترسی کلاینت به Supabase Auth. |
| `QUEUE_DATABASE_URL`، `JOB_QUEUE_SCHEMA` | تنظیمات صف `pg-boss` (در صورت جدا بودن از دیتابیس اصلی). |
| `LT_URL` یا `OPENAI_API_KEY`/`GOOGLE_*` | ارائه‌دهندهٔ ترجمه. |
| `ALERT_EMAIL` | مقصد اعلان خطاها. |

## دستورهای روزمره

```bash
pnpm dev             # توسعه محلی با Hot Reload
pnpm lint            # بررسی استانداردهای کدنویسی
pnpm typecheck       # کنترل TypeScript
pnpm test            # اجرای همهٔ تست‌ها
pnpm ingest          # اجرای دستی پایپلاین اینجست
pnpm queue:worker    # راه‌اندازی Worker صف
```

## APIهای در دسترس

- `POST /api/ingest/trigger` – فقط ادمین؛ قرار دادن وظیفهٔ جمع‌آوری در صف.
- `POST /api/revalidate` – بازسازی مسیرها پس از انتشار (Protected).
- `GET /api/search?q=&lang=` – جست‌وجوی Full-Text.
- `GET /api/health` – بررسی وضعیت سرویس.
- `GET /rss.xml`، `GET /sitemap.xml`، `GET /robots.txt` – خروجی‌های سئو.

## تست و تضمین کیفیت

- `vitest` برای واحد (`tests/unit`) و یکپارچه (`tests/e2e`).
- پوشش اولیه روی ماژول طبقه‌بندی و ماژول ترجمه.
- Husky `pre-commit` برای اجرای lint-staged.
- GitHub Actions (در حال آماده‌سازی) برای lint/build/test در CI.

## قابلیت‌های پیاده‌سازی‌شده

1. **Frontend چندزبانه:** ناوبری، کارت‌های خبر، فهرست دسته/برچسب، صفحات درباره و تماس با داده‌های شرکت «شبکه هوشمند ابتکار ویستا» و اطلاعات تماس رسمی.
2. **جزئیات خبر با SEO کامل:** متاتگ‌ها، OpenGraph، JSON-LD نوع NewsArticle، لینک منبع و مسیرهای hreflang.
3. **پنل مدیریت Supabase:** ورود امن، بررسی خبرهای منتظر تأیید، ویرایشگر دو زبانه با آپلود تصویر (اتصال به Supabase Storage از طریق API آپلود).
4. **پایپلاین اینجست خودکار:** خواندن از Allowlist، نرمال‌سازی، جلوگیری از تکرار، طبقه‌بندی ساده، ترجمهٔ هوشمند، تعیین وضعیت انتشار بر اساس اعتماد منبع.
5. **صف شغلی مبتنی بر pg-boss:** صف‌بندی ingestion و revalidate، امکان افزودن کران‌های جدید (مثلاً ایمیل یا هشدار).
6. **تست‌ها و ابزار توسعه:** ESLint/Prettier، Vitest، TypeScript strict، Husky، lint-staged، commitlint.

## نقشهٔ راه ادامهٔ توسعه

1. **گسترش پنل مدیریت:**
   - داشبورد آمار بازدید و سلامت کران‌ها.
   - مدیریت منابع (CRUD کامل Allowlist/Blacklist) با رابط بصری.
2. **اتوماسیون بیشتر صف:**
   - افزودن صف برای ایمیل/وب‌هوک هشدار خطا.
   - پیاده‌سازی Job Retry و مانیتورینگ (Better Stack یا Supabase Logs).
3. **جست‌وجوی پیشرفته:**
   - تکمیل ایندکس‌های TSVector و پیشنهاد برچسب‌ها.
   - پشتیبانی از فیلترهای دسته، وضعیت و محدودهٔ زمانی.
4. **تست‌های E2E رابط کاربری:**
   - Playwright یا Cypress برای سناریوهای ورود، انتشار و سوییچ زبان.
5. **مدیریت رسانه:**
   - اتصال مستقیم آپلود به Supabase Storage با فشرده‌سازی `sharp` در Server Actions.
6. **استقرار خودکار:**
   - افزودن GitHub Actions برای lint/typecheck/test/build و دپلوی خودکار روی Vercel یا سرور Dockerized.

## منابع و پشتیبانی

- **Email:** [devcodebase.dec@gmail.com](mailto:devcodebase.dec@gmail.com)
- **مدیرعامل:** مسعود بخشی – ۰۹۱۲۴۷۳۳۲۳۴
- برای گزارش باگ یا درخواست قابلیت جدید، Issue در GitHub ایجاد کنید.

---

© شبکه هوشمند ابتکار ویستا – تمامی حقوق محفوظ است.

