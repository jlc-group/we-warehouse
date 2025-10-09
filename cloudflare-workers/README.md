# Cloudflare Workers API Proxy

## วัตถุประสงค์
Proxy HTTP backend APIs ผ่าน HTTPS เพื่อแก้ปัญหา Mixed Content Error

## วิธี Deploy

### 1. ติดตั้ง Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Login เข้า Cloudflare

```bash
wrangler login
```

จะเปิดเบราว์เซอร์ให้ Login เข้า Cloudflare account

### 3. Deploy Worker

```bash
cd cloudflare-workers
wrangler deploy
```

### 4. จะได้ URL

```
https://we-warehouse-api-proxy.YOUR-SUBDOMAIN.workers.dev
```

## วิธีใช้งาน

หลัง deploy แล้ว อัปเดต `.env.production`:

```env
# เปลี่ยนจาก
VITE_SALES_API_URL=https://your-backend.railway.app
VITE_JLC_API_BASE=https://your-backend.railway.app/jhdb

# เป็น
VITE_SALES_API_URL=https://we-warehouse-api-proxy.YOUR-SUBDOMAIN.workers.dev/api/sales
VITE_JLC_API_BASE=https://we-warehouse-api-proxy.YOUR-SUBDOMAIN.workers.dev/jhdb
```

## API Routes

Worker จะ proxy requests:

- `https://*.workers.dev/api/sales/*` → `http://localhost:3001/api/sales/*`
- `https://*.workers.dev/jhdb/*` → `http://jhserver.dyndns.info:82/jhdb/*`

## ตรวจสอบ

```bash
# Test health
curl https://we-warehouse-api-proxy.YOUR-SUBDOMAIN.workers.dev/api/sales/health

# Test JLC API
curl "https://we-warehouse-api-proxy.YOUR-SUBDOMAIN.workers.dev/jhdb/purchase-orders?date=2025-10-09"
```

## Troubleshooting

### ❌ ติดตั้ง wrangler ไม่ได้

```bash
# ใช้ npx แทน
npx wrangler login
npx wrangler deploy
```

### ❌ Error: Cannot find route

แก้ไข `wrangler.toml`:

```toml
routes = [
  { pattern = "your-domain.pages.dev/api/*" },
  { pattern = "your-domain.pages.dev/jhdb/*" }
]
```

### ❌ Backend ไม่ตอบ

ตรวจสอบว่า:
1. Backend server รันอยู่ (`http://localhost:3001`)
2. JHSERVER accessible (`http://jhserver.dyndns.info:82`)
3. Cloudflare Worker สามารถเข้าถึง backend ได้

**หมายเหตุ:** Workers ฟรีจำกัด 100,000 requests/วัน
