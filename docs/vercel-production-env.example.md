# Vercel Production Environment Variables

Copy these variables into both Vercel projects:

- Web project root: `apps/web`
- Admin project root: `apps/admin`

Keep real secrets out of Git. Store working values locally in `.env.production.local`, which is ignored by `.gitignore`, then paste them into Vercel.

```dotenv
# Database: Supabase Session Pooler. Keep ?pgbouncer=true.
DATABASE_URL="postgresql://postgres.<project-ref>:<url-encoded-password>@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Redis: Upstash Redis.
REDIS_URL="redis://default:<password>@<host>.upstash.io:6379"

# CORS and site URLs.
CORS_ALLOWED_ORIGINS="https://zoumavillage.xyz,https://admin.zoumavillage.xyz"
NEXT_PUBLIC_SITE_URL="https://zoumavillage.xyz"
NEXT_PUBLIC_WEB_API_BASE="https://zoumavillage.xyz/api/v1"

# DeepSeek.
DEEPSEEK_API_KEY="<deepseek-api-key>"
DEEPSEEK_MODEL="deepseek-chat"

# QWeather.
QWEATHER_API_KEY="<qweather-api-key>"
QWEATHER_API_HOST="https://nu4wcvrj9f.re.qweatherapi.com"
QWEATHER_LOCATION_ID="101040100"

# AMap.
AMAP_KEY="<amap-key>"
NEXT_PUBLIC_AMAP_KEY="<same-as-amap-key>"

# Security. Generate each with: openssl rand -hex 32
JWT_SECRET="<64-char-hex>"
CRON_SECRET="<64-char-hex>"
ADMIN_API_TOKEN="<64-char-hex>"
WEB_API_BASE="https://zoumavillage.xyz/api/v1"
ADMIN_LOGIN_PASSWORD="<independent-admin-login-password>"
ADMIN_SESSION_SECRET="<independent-64-char-hex>"

# Optional services. Leave empty unless providers are configured.
SMS_API_KEY=""
SMS_TEMPLATE_ID=""
SENSOR_API_KEY=""

# Optional homepage video.
NEXT_PUBLIC_HOME_HERO_VIDEO_URL=""
```

Required production checks:

- `NEXT_PUBLIC_WEB_API_BASE` must end with `/api/v1`.
- `WEB_API_BASE` must end with `/api/v1` and is configured only on the Admin server.
- `ADMIN_LOGIN_PASSWORD`, `ADMIN_SESSION_SECRET`, and `ADMIN_API_TOKEN` must be independent server-only values.
- The built-in Admin login limiter has both per-client and process-global failure windows, but its bounded in-memory store is local to one warm serverless instance. Multi-instance production must inject a shared failure store or enforce an equivalent platform-level global login rule; ordinary `X-Forwarded-For` is intentionally ignored.
- `QWEATHER_API_HOST` must be `https://nu4wcvrj9f.re.qweatherapi.com`.
- `DATABASE_URL` must use the Supabase Session Pooler on port `6543` and include `?pgbouncer=true`.
- `CORS_ALLOWED_ORIGINS` must include both production origins.
