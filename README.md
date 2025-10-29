# Vista AI News Magazine

مجلهٔ خبری دو‌زبانهٔ «ویستا AI» یک پلتفرم جامع برای گردآوری، ترجمه، و انتشار اخبار هوش مصنوعی است. کل پروژه با رویکرد **لوکال‌محور** پیاده‌سازی شده است؛ تمام سرویس‌ها (پایگاه‌داده، صف، ترجمه و ذخیره‌سازی رسانه) در همان سرور اجرا می‌شوند و تنها وابستگی خارجی Google OAuth برای ورود مدیران است.

## خلاصهٔ قابلیت‌ها

- رابط کاربری مجله‌ای واکنش‌گرا با پشتیبانی کامل RTL، تم تیره/روشن، قهرمان خبرهای داغ، دسته‌بندی‌ها، برچسب‌ها و جست‌وجوی تمام‌متنی.
- SEO پیشرفته: خروجی‌های RSS، Sitemap، robots.txt و JSON-LD برای هر خبر، به‌همراه hreflang برای مسیرهای فارسی/انگلیسی.
- پایپلاین جمع‌آوری خودکار: خواندن RSS از Allowlist، نرمال‌سازی، پاکسازی HTML، جلوگیری از تکرار، طبقه‌بندی کلیدواژه‌ای و ترجمهٔ خودکار به فارسی با کش در پایگاه‌داده.
- پنل مدیریت پیشرفته: ورود فقط با حساب‌های Gmail مجاز (تعریف شده در متغیرهای محیطی)، صف بازبینی، ویرایشگر TipTap دو‌زبانه، مدیریت وضعیت خبر، آپلود تصویر محلی با فشرده‌سازی WebP و هماهنگی کامل با صف انتشار.
- صف وظایف `pg-boss` بر بستر Postgres برای هماهنگی اینجست و بازسازی کش مسیرها؛ Worker اختصاصی با اجرای مستقل.
- تست‌های واحد و انتها-به-انتها (Vitest) برای ماژول‌های ترجمه و طبقه‌بندی، به‌همراه ESLint/Prettier/Husky.
- داشبورد تحلیلی بازدید و عملکرد با جمع‌آوری سبک‌وزن داده‌ها و جلوگیری از فشار بر پایگاه‌داده.
- مدیریت کامل Allowlist/Blacklist منابع خبری از داخل پنل به‌همراه کنترل اولویت و یادداشت داخلی.
- زمان‌بندی انتشار خبر با صف `pg-boss` و انتشار خودکار در لحظهٔ تعیین‌شده.
- اتصال SMTP برای ارسال خبرنامه و هشدار خطا با رابط کاربری مدیریتی.

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
- **worker**: اجرای Worker صف `pg-boss` و فراخوانی اینجست/بازسازی کش.
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
8. **برنامه‌ریزی Cron برای اینجست خودکار**
   Worker صف فقط مصرف‌کننده است؛ برای زمان‌بندی اینجست، یک Cron روی سرور تعریف کنید که هر ۳۰ دقیقه اندپوینت داخلی را با توکن فراخوانی کند:
   ```bash
   crontab -e
   # هر ۳۰ دقیقه
   */30 * * * * curl -s -X POST \
     -H "Authorization: Bearer $(grep INTERNAL_API_TOKEN /opt/vista-ai-news/.env | cut -d'=' -f2)" \
     http://127.0.0.1:3000/api/ingest/trigger >/dev/null
   ```
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
| `LT_URL` | آدرس LibreTranslate (در docker-compose: `http://libretranslate:5000/translate`). |
| `INTERNAL_API_URL` | آدرس سرویس Next.js برای فراخوانی‌های داخلی Worker (پیش‌فرض: `http://web:3000`). |
| `INTERNAL_API_TOKEN` | توکن مشترک برای Worker/Cron جهت دسترسی به اندپوینت‌های داخلی. |
| `MEDIA_UPLOAD_DIR` | مسیر ذخیره‌سازی رسانه (پیش‌فرض: `public/media`). |
| `ALERT_EMAIL` | مقصد اعلان خطاها (برای اتصال به ابزارهای مانیتورینگ آینده). |
| `SMTP_HOST` / `SMTP_PORT` | آدرس سرویس SMTP (می‌تواند Mailhog/Postal محلی باشد). |
| `SMTP_USER` / `SMTP_PASSWORD` | در صورت نیاز به احراز هویت SMTP مقداردهی شود؛ برای Mailhog خالی بماند. |
| `SMTP_FROM` | ایمیل فرستندهٔ خبرنامه و هشدارها (مانند `news@vista-ai.local`). |
| `NEWSLETTER_RECIPIENTS` | فهرست گیرندگان پیش‌فرض خبرنامه (جدا شده با کاما، اختیاری). |

## گردش‌کارهای مهم

### ۱. ورود مدیران
- مسیر `/login` تنها دکمهٔ «ورود با Google» دارد.
- NextAuth تنها ایمیل‌های تعریف‌شده در Allowlist را می‌پذیرد و نقش کاربر را مطابق لیست تنظیم می‌کند.
- نشست‌ها مبتنی بر JWT هستند و از پایگاه‌داده برای نگهداری اطلاعات کاربران استفاده می‌شود.

### 2. پایپلاین جمع‌آوری خبر
1. Cron با توکن داخلی اندپوینت `/api/ingest/trigger` را فراخوانی می‌کند.
2. Worker صف `pg-boss` وظیفهٔ `vista.ingest` را اجرا کرده و نتایج را در Postgres ذخیره می‌کند.
3. برای خبرهای منتشر‌شده، وظیفهٔ `vista.revalidate` در صف قرار می‌گیرد تا اندپوینت داخلی `/api/internal/revalidate` مسیرهای مربوطه را invalidate کند.

### 3. آپلود رسانه
- پنل مدیریت امکان بارگذاری تصویر کاور را دارد؛ فایل روی سرور فشرده و در مسیر `public/media` ذخیره می‌شود.
- پاسخ API مسیر عمومی فایل را بازمی‌گرداند که مستقیماً از طریق Next.js سرو می‌شود.

### 4. ترجمهٔ خودکار
- LibreTranslate به‌صورت محلی اجرا می‌شود؛ در صورت تمایل می‌توانید `OPENAI_API_KEY` یا سرویس Google را مقداردهی کنید.
- ترجمه‌ها در جدول `TranslationCache` ذخیره می‌شوند تا از درخواست‌های تکراری جلوگیری گردد.

### 5. تحلیل بازدید
- هر نمایش صفحه با API `/api/analytics/pageview` ثبت و در جدول تجمیعی `ArticleAnalytics` ذخیره می‌شود؛ تنها آمار تجمیعی نگهداری شده و هیچ دادهٔ خام کاربر ذخیره نمی‌شود تا پایگاه‌داده سبک باقی بماند.
- داشبورد `/admin/analytics` میانگین زمان مطالعه، نرخ تکمیل و بازدیدهای یکتا را نمایش می‌دهد.

### 6. زمان‌بندی انتشار
- در ویرایشگر محتوا می‌توانید وضعیت خبر را روی `SCHEDULED` گذاشته و زمان دقیق انتشار را تعیین کنید.
- پس از ثبت، Worker صف با job `vista.publish` خبر را در لحظهٔ مشخص‌شده منتشر کرده و مسیر مربوطه را بازسازی می‌کند.

### 7. خبرنامه و هشدار ایمیلی
- صفحهٔ `/admin/newsletter` امکان انتخاب اخبار و ارسال ایمیل را با استفاده از SMTP محلی یا خارجی فراهم می‌کند.
- هشدار خطاهای ingestion به‌صورت خودکار با `sendAlertEmail` به نشانی تنظیم‌شده در `ALERT_EMAIL` ارسال می‌شود.

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

- افزودن ماژول تحلیل ترندهای موضوعی با کمک مدل‌های دسته‌بندی پیشرفته.
- یکپارچه‌سازی گزارش Core Web Vitals به‌صورت خودکار در داشبورد مدیریت.
- راه‌اندازی A/B تست برای قالب‌های صفحهٔ خبر و خبرنامه.
- پشتیبانی از Push Notification (وب) پس از انتشار خبرهای زمان‌بندی‌شده.

---

برای سؤالات یا گزارش اشکال می‌توانید با تیم توسعه از طریق **devcodebase.dec@gmail.com** در ارتباط باشید.
