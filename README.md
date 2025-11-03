# Vista AI News Magazine

مجلهٔ خبری دو‌زبانهٔ «ویستا AI» یک پلتفرم جامع برای گردآوری، ترجمه، و انتشار اخبار هوش مصنوعی است. کل پروژه با رویکرد **لوکال‌محور** پیاده‌سازی شده است؛ تمام سرویس‌ها (پایگاه‌داده، صف، ترجمه و ذخیره‌سازی رسانه) در همان سرور اجرا می‌شوند و تنها وابستگی خارجی Google OAuth برای ورود مدیران است.

## خلاصهٔ قابلیت‌ها

- رابط کاربری مجله‌ای واکنش‌گرا با پشتیبانی کامل RTL، تم تیره/روشن، قهرمان خبرهای داغ، دسته‌بندی‌ها، برچسب‌ها و جست‌وجوی تمام‌متنی.
- SEO پیشرفته: خروجی‌های RSS، Sitemap، robots.txt و JSON-LD برای هر خبر، به‌همراه hreflang برای مسیرهای فارسی/انگلیسی.
- پایپلاین جمع‌آوری خودکار: خواندن RSS از Allowlist، نرمال‌سازی، پاکسازی HTML، جلوگیری از تکرار، طبقه‌بندی کلیدواژه‌ای و ترجمهٔ خودکار به فارسی با کش در پایگاه‌داده.
- خلاصه‌سازی هوشمند فارسی/انگلیسی با الگوریتم استخراجی محلی برای تولید متادیتای کوتاه و بهینه برای SEO و کارت‌ها.
- پنل مدیریت پیشرفته: ورود فقط با حساب‌های Gmail مجاز (تعریف شده در متغیرهای محیطی)، صف بازبینی، ویرایشگر TipTap دو‌زبانه، مدیریت وضعیت خبر، آپلود تصویر محلی با فشرده‌سازی WebP و هماهنگی کامل با صف انتشار.
- صف وظایف `pg-boss` بر بستر Postgres برای هماهنگی اینجست و بازسازی کش مسیرها؛ Worker اختصاصی با اجرای مستقل.
- تست‌های واحد و انتها-به-انتها (Vitest) برای ماژول‌های ترجمه و طبقه‌بندی، به‌همراه ESLint/Prettier/Husky.
- داشبورد تحلیلی بازدید و عملکرد با جمع‌آوری سبک‌وزن داده‌ها و جلوگیری از فشار بر پایگاه‌داده.
- داشبورد مانیتورینگ لحظه‌ای برای وضعیت صف‌ها، کران‌ها، هشدارها و Core Web Vitals با بازآوری خودکار هر ۱۵ ثانیه.
- مدیریت کامل Allowlist/Blacklist منابع خبری از داخل پنل به‌همراه کنترل اولویت و یادداشت داخلی.
- زمان‌بندی انتشار خبر با صف `pg-boss` و انتشار خودکار در لحظهٔ تعیین‌شده.
- اتصال SMTP برای ارسال خبرنامه و هشدار خطا با رابط کاربری مدیریتی.
- تحلیل هوشمند ترندهای موضوعی با مدل هیبریدی (ONNX اختیاری) و نمایش فوری در داشبورد مدیریت.
- جمع‌آوری خودکار Core Web Vitals از سمت کاربر و گزارش میانگین و کیفیت هر شاخص در پنل.
- زیرساخت A/B تست برای قالب صفحهٔ خبر و خبرنامه با ثبت متریک‌های «بازدید»، «زمان مطالعه» و «ارسال».
- پشتیبانی اعلان فشاری (Web Push) پس از انتشار خبرهای زمان‌بندی‌شده با مدیریت کلیدهای VAPID محلی.
- هشدار پیامکی محلی برای خطاهای بحرانی پایپلاین یا ازدحام صف‌ها از طریق وب‌هوک داخلی.

## پشتهٔ فنی

| لایه | فناوری |
| --- | --- |
| UI/SSR | Next.js 14 (App Router)، React Server Components، TailwindCSS + shadcn/ui + lucide-react |
| بین‌المللی‌سازی | `next-intl` با فارسی/انگلیسی، پشتیبانی کامل RTL و قالب‌بندی تاریخ |
| احراز هویت | NextAuth (Google OAuth) + Prisma Adapter، کنترل نقش‌ها از طریق Allowlist ایمیل |
| پایگاه‌داده | Postgres (محلی، Docker)، Prisma ORM |
| صف و کران | `pg-boss` با داده مشترک در Postgres |
| ترجمه | LibreTranslate (کانتینر محلی) با امکان سوییچ به ارائه‌دهندگان خارجی (OpenAI/Google) |
| ذخیره‌سازی رسانه | فایل‌های محلی در مسیر `public/media` با فشرده‌سازی `sharp` |
| تست و کیفیت | Vitest، ESLint، Prettier، Husky + lint-staged |

## معماری لوکال‌محور (Docker Compose)

```
[Internet]
  └─> Reverse Proxy (اختیاری)
        └─> web (Next.js SSR + API + Admin)
              ├─> worker (pg-boss queue)
              ├─> postgres (پایگاه‌داده)
              └─> libretranslate (fa↔en)
```

- **web**: اجرای برنامه Next.js، APIهای عمومی و مدیریتی، سرو محتوا و فایل‌های رسانه‌ای.
- **worker**: اجرای Worker صف `pg-boss`، زمان‌بندی خودکار اینجست/انتشار/مانیتورینگ با Cron داخلی و ثبت ضربان سلامت.
- **postgres**: دیتابیس اصلی پروژه و صف (اسکیما مشترک).
- **libretranslate**: سرویس ترجمهٔ خودکار داخلی.

## حداقل سیستم مورد نیاز

- CPU دو هسته‌ای (معادل vCPU2) با پشتیبانی از Docker.
- 4 گیگابایت RAM (حداقل 2 گیگابایت برای محیط توسعه) برای اجرای هم‌زمان وب‌سرور، Worker و پایگاه‌داده.
- 15 گیگابایت فضای دیسک آزاد برای Docker images، پایگاه‌داده و ذخیرهٔ رسانه‌ها.
- سیستم‌عامل Ubuntu 22.04 LTS یا هر توزیع سازگار با Docker Engine 24+.

## شروع سریع با Docker Compose

1. **دریافت کد و تنظیم محیط**
   ```bash
   git clone https://github.com/<YOUR_ORG>/vista-ai-news.git
   cd vista-ai-news
   cp .env.example .env
   ```
2. **ایجاد اطلاعات Google OAuth**
   - در Google Cloud Console یک OAuth Client از نوع *Web application* بسازید.
   - Redirect URL را روی `http://localhost:3000/api/auth/callback/google` (یا دامنهٔ خود) تنظیم کنید.
   - مقادیر `GOOGLE_CLIENT_ID` و `GOOGLE_CLIENT_SECRET` را در `.env` قرار دهید.
3. **تعریف ایمیل‌های مجاز**
   - متغیر `ADMIN_EMAILS` را با حداکثر سه ایمیل Gmail که مجاز به ورود هستند پر کنید. ایمیل‌های تعریف‌شده نقش **مدیر کل** خواهند داشت.
   - در صورت نیاز می‌توانید `EDITOR_EMAILS` و `CONTRIBUTOR_EMAILS` را نیز مقداردهی کنید.
4. **تنظیم سایر متغیرها**
   - `INTERNAL_API_TOKEN` را یک رشتهٔ تصادفی حداقل ۱۶ کاراکتری قرار دهید (برای احراز هویت Worker).
   - اگر از مقادیر پیش‌فرض docker-compose استفاده می‌کنید، `DATABASE_URL` را تغییر ندهید.
   - آدرس عمومی سایت (`NEXT_PUBLIC_SITE_URL`) و ایمیل هشدار (`ALERT_EMAIL`) را ست کنید.
5. **راه‌اندازی سرویس‌ها**
   ```bash
   docker compose up -d --build
   ```
6. **بررسی وضعیت**
   ```bash
   docker compose logs -f web
   docker compose logs -f worker
   ```
   پس از بالا آمدن سرویس‌ها برنامه روی `http://localhost:3000` در دسترس است.
7. **ورود به پنل مدیریت**
   - با یکی از ایمیل‌های تعریف‌شده در `ADMIN_EMAILS` وارد مسیر `/login` شوید.
   - گزینهٔ ثبت‌نام غیرفعال است؛ تنها ایمیل‌های Allowlist اجازهٔ ورود دارند.

> **نکته:** پس از اولین اجرا، مهاجرت‌ها و دادهٔ اولیه به‌صورت خودکار در کانتینر `web` اجرا می‌شود (`pnpm prisma migrate deploy` و `pnpm prisma db seed`).

## راه‌اندازی سرور Ubuntu 22.04 از صفر (گام‌به‌گام)

1. **پیش‌نیازها**
   ```bash
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y curl git ufw
   ```
2. **نصب Docker و Docker Compose**
   ```bash
   curl -fsSL https://get.docker.com | sh
   sudo usermod -aG docker $USER && newgrp docker
   ```
3. **کلون و تنظیم مخزن**
   ```bash
   sudo mkdir -p /opt/vista-ai-news && sudo chown $USER:$USER /opt/vista-ai-news
   cd /opt/vista-ai-news
   git clone https://github.com/<YOUR_ORG>/vista-ai-news.git .
   cp .env.example .env
   ```
4. **تکمیل `.env`** (گام‌به‌گام)
   1. مقادیر Google OAuth (`GOOGLE_CLIENT_ID` و `GOOGLE_CLIENT_SECRET`) و آدرس‌های مجاز (`ADMIN_EMAILS`، در صورت نیاز `EDITOR_EMAILS`/`CONTRIBUTOR_EMAILS`) را وارد کنید.
   2. برای ارتباط Worker و وب‌سرور، یک رشتهٔ تصادفی قدرتمند در `INTERNAL_API_TOKEN` قرار دهید و `INTERNAL_API_URL` را در حالت Docker برابر `http://web:3000` بگذارید.
   3. اگر روی دامنهٔ واقعی مستقر می‌شوید، `NEXTAUTH_URL` و `NEXT_PUBLIC_SITE_URL` را برابر آدرس HTTPS خود تنظیم کنید.
   4. ایمیل هشدار (`ALERT_EMAIL`) و تنظیمات SMTP (`SMTP_HOST`، `SMTP_PORT`، `SMTP_FROM` و در صورت نیاز `SMTP_USER`/`SMTP_PASSWORD`) را برای ارسال خطا و خبرنامه مقداردهی نمایید. در حالت توسعه می‌توانید از Mailhog یا Postal محلی استفاده کنید.
   5. در صورت تمایل، گیرندگان پیش‌فرض خبرنامه را در `NEWSLETTER_RECIPIENTS` (لیست comma-separated) قرار دهید تا بدون وارد کردن دستی نیز ارسال انجام شود.
   6. مسیر مدل طبقه‌بندی پیشرفته را در `TREND_MODEL_PATH` تنظیم کنید (یک فایل ONNX محلی). در صورت خالی بودن، سیستم با موتور هیبریدی مبتنی بر کلیدواژه کار می‌کند.
   7. برای اعلان فشاری، کلیدهای VAPID را با دستور زیر تولید و در متغیرهای `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY`، `WEB_PUSH_VAPID_PUBLIC_KEY` و `WEB_PUSH_VAPID_PRIVATE_KEY` قرار دهید:
      ```bash
      npx web-push generate-vapid-keys
      ```
      فیلد `WEB_PUSH_CONTACT_EMAIL` را نیز با ایمیل تماس (فرمت mailto) مقداردهی کنید.
   8. بازه‌های اجرای خودکار Worker را با متغیرهای `INGEST_CRON`، `PUBLISH_CRON` و `MONITOR_CRON` کنترل کنید (پیش‌فرض‌ها به‌ترتیب ۵ دقیقه، ۱ دقیقه و ۱ دقیقه). در صورت نیاز آستانهٔ هشدار صف را از طریق `QUEUE_BACKLOG_ALERT_THRESHOLD` و `QUEUE_FAILURE_ALERT_THRESHOLD` تغییر دهید.
   9. برای هشدار پیامکی داخلی، آدرس وب‌هوک سازمانی را در `SMS_WEBHOOK_URL` قرار داده و در صورت نیاز توکن (`SMS_WEBHOOK_TOKEN`) و گیرندگان (`SMS_RECIPIENTS`) را مقداردهی کنید.
5. **اجرای سرویس‌ها**
   ```bash
   docker compose up -d --build
   ```
6. **راه‌اندازی Reverse Proxy (اختیاری)**
   ```bash
   sudo apt install -y nginx certbot python3-certbot-nginx
   sudo tee /etc/nginx/sites-available/vista.conf <<'NGINX'
   server {
     listen 80;
     server_name news.vista-ai.ir; # دامنهٔ خود را جایگزین کنید

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
7. **فعال‌سازی فایروال**
   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw enable
   ```
8. **تنظیم بازه‌های اجرای خودکار**
   Worker به‌صورت پیش‌فرض هر ۵ دقیقه پایپلاین جمع‌آوری، هر دقیقه انتشار زمان‌بندی‌شده و مانیتورینگ صف‌ها را اجرا می‌کند. برای تغییر بازه‌ها تنها کافی است مقادیر `INGEST_CRON`، `PUBLISH_CRON` یا `MONITOR_CRON` را در `.env` ویرایش کنید و سپس `docker compose up -d` را مجدداً اجرا نمایید؛ نیازی به Cron سیستم‌عامل نیست.

## عیب‌یابی نصب وابستگی‌ها (`pnpm install`)

در محیط‌های محدود (نظیر سرورهایی با فایروال خروجی یا این پلتفرم آزمایش)، اجرای `pnpm install` ممکن است با خطای زیر متوقف شود:

```
ERR_PNPM_FETCH_403 GET <registry-url>: Forbidden - 403
```

این خطا به‌خاطر مسدود بودن دسترسی به رجیستری npm رخ می‌دهد (هیچ هدر احراز هویت لازم نیست؛ پاسخ ۴۰۳ نشان می‌دهد که اتصال از طرف شبکهٔ شما منع شده است). برای رفع مشکل:

1. پیش از نصب، دسترسی رجیستری را با دستور زیر بررسی کنید:
   ```bash
   pnpm run check:registry
   ```
   این اسکریپت آدرس فعلی رجیستری را (از `PNPM_REGISTRY` یا `NPM_CONFIG_REGISTRY`) می‌خواند و در صورت عدم دسترسی، راهنمایی لازم را چاپ می‌کند.
2. در صورت نیاز یک رجیستری قابل دسترس معرفی کنید. نمونه:
   ```bash
   export PNPM_REGISTRY=https://registry.npmjs.org/
   pnpm install
   ```
   یا اگر پشت پروکسی داخلی هستید، متغیرهای `HTTPS_PROXY`/`HTTP_PROXY` را تنظیم کنید.
3. در محیط‌هایی که کلاً دسترسی اینترنت خروجی ندارند، لازم است یک آینهٔ داخلی (Verdaccio یا Nexus) راه‌اندازی کرده و مقدار `PNPM_REGISTRY` را به آدرس آن تنظیم نمایید. پس از فعال شدن آینه، اجرای `pnpm run check:registry` باید موفق شود و سپس `pnpm install` بدون خطا انجام خواهد شد.

> در این مخزن به‌صورت پیش‌فرض رجیستری جهانی npm استفاده می‌شود. در صورتی که همچنان خطای ۴۰۳ دریافت می‌کنید، مشکل از محدودیت شبکهٔ میزبان است و باید دسترسی خروجی (یا آینهٔ محلی) فراهم شود؛ کد پروژه نیازی به توکن یا حساب کاربری خاصی ندارد.
9. **پشتیبان‌گیری روزانه از دیتابیس**
   ```bash
   sudo mkdir -p /opt/backups/vista
   crontab -e
   # افزودن خط زیر
   15 3 * * * docker exec vista_postgres pg_dump -U vista vista_ai_news | gzip > /opt/backups/vista/db-$(date +\%F).sql.gz
   ```

## متغیرهای محیطی کلیدی

| متغیر | توضیح |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | دامنهٔ عمومی جهت لینک‌ها و JSON-LD. |
| `NEXTAUTH_URL` | پایهٔ URL برای جریان OAuth (در حالت تولید باید HTTPS باشد). |
| `NEXTAUTH_SECRET` | کلید رمزنگاری جلسات NextAuth (حداقل ۳۲ کاراکتر). |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | مقادیر OAuth گوگل. |
| `ADMIN_EMAILS` | فهرست ایمیل‌های مجاز با نقش مدیر (جدا شده با کاما). |
| `EDITOR_EMAILS` / `CONTRIBUTOR_EMAILS` | ایمیل‌های مجاز با نقش‌های پایین‌تر (اختیاری). |
| `DATABASE_URL` | اتصال Postgres (برای docker-compose مقدار پیش‌فرض مناسب است). |
| `QUEUE_DATABASE_URL` | در صورت استفاده از دیتابیس مجزا برای صف؛ در غیر این صورت خالی بگذارید. |
| `JOB_QUEUE_SCHEMA` | اسکیما‌ی `pg-boss` (پیش‌فرض: `pgboss`). |
| `INGEST_CRON` / `PUBLISH_CRON` / `MONITOR_CRON` | عبارت‌های Cron برای اجرای خودکار اینجست، انتشار زمان‌بندی‌شده و مانیتورینگ (پیش‌فرض‌ها به ترتیب `*/5 * * * *`، `*/1 * * * *`، `*/1 * * * *`). |
| `QUEUE_BACKLOG_ALERT_THRESHOLD` / `QUEUE_FAILURE_ALERT_THRESHOLD` | آستانهٔ تعداد کارهای در انتظار/شکست‌خورده که منجر به هشدار ایمیل و پیامک می‌شود. |
| `LT_URL` | آدرس LibreTranslate (در docker-compose: `http://libretranslate:5000/translate`). |
| `INTERNAL_API_URL` | آدرس سرویس Next.js برای فراخوانی‌های داخلی Worker (پیش‌فرض: `http://web:3000`). |
| `INTERNAL_API_TOKEN` | توکن مشترک برای Worker/Cron جهت دسترسی به اندپوینت‌های داخلی. |
| `MEDIA_UPLOAD_DIR` | مسیر ذخیره‌سازی رسانه (پیش‌فرض: `public/media`). |
| `TREND_MODEL_PATH` | مسیر فایل ONNX برای مدل دسته‌بندی پیشرفتهٔ ترندها (اختیاری). |
| `ALERT_EMAIL` | مقصد اعلان خطاها (برای اتصال به ابزارهای مانیتورینگ آینده). |
| `SMS_WEBHOOK_URL` | آدرس سرویس پیامک داخلی جهت ارسال هشدارها (POST با محتوای JSON). |
| `SMS_WEBHOOK_TOKEN` | توکن اختیاری برای احراز هویت سرویس پیامک (Bearer). |
| `SMS_RECIPIENTS` | فهرست شماره‌های مقصد پیامک (جدا شده با کاما، اعداد محلی). |
| `SMTP_HOST` / `SMTP_PORT` | آدرس سرویس SMTP (می‌تواند Mailhog/Postal محلی باشد). |
| `SMTP_USER` / `SMTP_PASSWORD` | در صورت نیاز به احراز هویت SMTP مقداردهی شود؛ برای Mailhog خالی بماند. |
| `SMTP_FROM` | ایمیل فرستندهٔ خبرنامه و هشدارها (مانند `news@vista-ai.local`). |
| `NEWSLETTER_RECIPIENTS` | فهرست گیرندگان پیش‌فرض خبرنامه (جدا شده با کاما، اختیاری). |
| `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` / `WEB_PUSH_VAPID_PUBLIC_KEY` / `WEB_PUSH_VAPID_PRIVATE_KEY` | کلیدهای VAPID برای اعلان فشاری (عمومی برای کلاینت و زوج کلید خصوصی برای سرور). |
| `WEB_PUSH_CONTACT_EMAIL` | ایمیل تماس برای VAPID (به‌صورت `mailto:example@domain.com`). |

## گردش‌کارهای مهم

### ۱. ورود مدیران
- مسیر `/login` تنها دکمهٔ «ورود با Google» دارد.
- NextAuth تنها ایمیل‌های تعریف‌شده در Allowlist را می‌پذیرد و نقش کاربر را مطابق لیست تنظیم می‌کند.
- نشست‌ها مبتنی بر JWT هستند و از پایگاه‌داده برای نگهداری اطلاعات کاربران استفاده می‌شود.

### 2. پایپلاین جمع‌آوری خبر
1. Worker براساس `INGEST_CRON` به‌صورت خودکار job `vista.ingest` را زمان‌بندی می‌کند (در صورت نیاز می‌توانید اندپوینت `/api/ingest/trigger` را به‌صورت دستی نیز فراخوانی کنید).
2. Worker صف `pg-boss` وظیفهٔ `vista.ingest` را اجرا کرده و نتایج را در Postgres ذخیره می‌کند.
3. برای خبرهای منتشر‌شده، وظیفهٔ `vista.revalidate` در صف قرار می‌گیرد تا اندپوینت داخلی `/api/internal/revalidate` مسیرهای مربوطه را invalidate کند.

### 3. آپلود رسانه
- پنل مدیریت امکان بارگذاری تصویر کاور را دارد؛ فایل روی سرور فشرده و در مسیر `public/media` ذخیره می‌شود.
- پاسخ API مسیر عمومی فایل را بازمی‌گرداند که مستقیماً از طریق Next.js سرو می‌شود.

### 4. ترجمهٔ خودکار
- LibreTranslate به‌صورت محلی اجرا می‌شود؛ در صورت تمایل می‌توانید `OPENAI_API_KEY` یا سرویس Google را مقداردهی کنید.
- ترجمه‌ها در جدول `TranslationCache` ذخیره می‌شوند تا از درخواست‌های تکراری جلوگیری گردد.

### 5. تحلیل بازدید و Core Web Vitals
- هر نمایش صفحه با API `/api/analytics/pageview` ثبت و در جدول تجمیعی `ArticleAnalytics` ذخیره می‌شود؛ تنها آمار تجمیعی نگهداری شده و هیچ دادهٔ خام کاربر ذخیره نمی‌شود تا پایگاه‌داده سبک باقی بماند.
- گزارش Core Web Vitals از طریق `reportWebVitals` جمع‌آوری شده و در جدول `CoreWebVital` نگهداری می‌شود؛ داشبورد مدیریتی کیفیت هر شاخص (LCP, FID, CLS و ...) را نمایش می‌دهد.
- داشبورد `/admin/analytics` علاوه‌بر کارت‌های بازدید، میانگین زمان مطالعه، نرخ تکمیل و تازه‌ترین مقادیر Core Web Vitals را نشان می‌دهد.

### 6. تحلیل ترندهای موضوعی
- هر خبر پس از اینجست با ماژول هیبریدی (ONNX اختیاری + قواعد کلیدواژه‌ای) تحلیل موضوعی می‌شود و نتایج در `ArticleTopic` ذخیره می‌گردد.
- Worker صف به‌صورت دوره‌ای job `vista.trend-refresh` را اجرا کرده و پنجرهٔ ۱۲ ساعتهٔ آخر را خلاصه می‌کند؛ خروجی در `TrendSnapshot` نگهداری شده و در داشبورد نمایش داده می‌شود.
- برای استفاده از مدل سفارشی، فایل ONNX خود را در مسیر `TREND_MODEL_PATH` قرار دهید؛ در صورت عدم وجود، موتور هیبریدی فعال است.

### 7. زمان‌بندی انتشار
- در ویرایشگر محتوا می‌توانید وضعیت خبر را روی `SCHEDULED` گذاشته و زمان دقیق انتشار را تعیین کنید.
- پس از ثبت، Worker صف با job `vista.publish` خبر را در لحظهٔ مشخص‌شده منتشر کرده و مسیر مربوطه را بازسازی می‌کند.

### 8. خبرنامه و آزمایش‌های A/B
- صفحهٔ `/admin/newsletter` امکان انتخاب اخبار و ارسال ایمیل را با استفاده از SMTP محلی یا خارجی فراهم می‌کند.
- در صورت فعال بودن آزمایش `newsletter-template`، گیرندگان به‌صورت خودکار بین قالب‌های «مینیمال» و «روایی» تقسیم شده و متریک `newsletter.sent` در جدول `ExperimentMetric` ثبت می‌شود.
- هشدار خطاهای ingestion به‌صورت خودکار با `sendAlertEmail` به نشانی تنظیم‌شده در `ALERT_EMAIL` و در صورت پیکربندی پیامک، از طریق `SMS_WEBHOOK_URL` ارسال می‌شود.

### 9. اعلان فشاری (Web Push)
- کاربر پس از اجازهٔ Notification، سرویس‌ورکر `sw.js` ثبت و اشتراک او در جدول `PushSubscription` ذخیره می‌شود.
- انتشار خودکار خبرهای زمان‌بندی‌شده (`vista.publish`) با استفاده از `web-push` به تمام مشترکان اعلان ارسال می‌کند.
- برای غیرفعال‌سازی، کافی است کلیدهای VAPID را خالی بگذارید یا API `/api/notifications/subscribe` را مسدود کنید.

### 10. مانیتورینگ و هشدار
- صفحهٔ `/admin/monitoring` وضعیت صف‌ها، کران‌ها و هشدارها را به‌صورت لحظه‌ای نمایش می‌دهد و هر ۱۵ ثانیه به‌روزرسانی می‌شود.
- Worker نتایج هر اجرا را در جدول‌های `CronHeartbeat` و `QueueSnapshot` ذخیره می‌کند و تاریخچهٔ هشدارها در `AlertEvent` نگهداری می‌شود.
- در صورت عبور از آستانه‌های `QUEUE_BACKLOG_ALERT_THRESHOLD` یا `QUEUE_FAILURE_ALERT_THRESHOLD`، یا خطای ingestion/انتشار، همزمان با ایمیل، پیامک داخلی از طریق `SMS_WEBHOOK_URL` برای گیرندگان `SMS_RECIPIENTS` ارسال می‌شود.

## توسعه و تست محلی (بدون Docker)

```bash
pnpm install
pnpm prisma migrate dev
pnpm prisma db seed
pnpm dev      # اجرای برنامه روی http://localhost:3000
pnpm queue:worker # اجرای Worker صف در ترمینال جداگانه
```

## تست‌ها و ابزارهای کیفیت

| دستور | توضیح |
| --- | --- |
| `pnpm lint` | اجرای ESLint روی کل پروژه. |
| `pnpm typecheck` | بررسی TypeScript بدون خروجی فایل. |
| `pnpm test` | اجرای مجموعهٔ کامل Vitest (واحد + e2e سبک). |
| `pnpm test:unit` | فقط تست‌های واحد. |
| `pnpm test:e2e` | تست‌های انتها-به-انتها برای ماژول ترجمه. |

## عملیات دستی

| عملیات | دستور |
| --- | --- |
| اجرای دستی اینجست | `pnpm ingest` (یا `curl` به `/api/ingest/trigger`). |
| بازسازی کش خبر مشخص | `curl -X POST -H "Authorization: Bearer $INTERNAL_API_TOKEN" -d '{"slug":"example"}' http://127.0.0.1:3000/api/revalidate` |
| مشاهدهٔ وضعیت صف | `docker exec -it vista_web pnpm queue:status` *(خروجی جدول وضعیت وظایف pg-boss)* |

## نقشهٔ راه پیشنهادی

- افزودن ماژول خلاصه‌سازی هوشمند برای تولید خلاصهٔ کوتاه فارسی/انگلیسی هر خبر.
- پیاده‌سازی داشبورد مانیتورینگ لحظه‌ای برای صف‌ها و وضعیت کران‌ها با آستانه‌های هشدار.
- ادغام سرویس پیامک داخلی برای اطلاع‌رسانی خطاهای بحرانی یا اخبار ویژه.
- امکان برون‌سپاری ترجمه به موتورهای سفارشی دیگر از طریق رابط پلاگینی.

---

برای سؤالات یا گزارش اشکال می‌توانید با تیم توسعه از طریق **devcodebase.dec@gmail.com** در ارتباط باشید.
