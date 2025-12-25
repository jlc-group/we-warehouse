# คู่มือ Deploy Backend (we-warehouse-backend)

## ปัญหา: Mixed Content Error

เมื่อ deploy frontend บน Cloudflare Pages (HTTPS) แล้วเรียก backend API ที่เป็น HTTP จะโดนบล็อกโดย browser

## วิธีแก้: Deploy Backend บน Platform ที่มี HTTPS

### ตัวเลือก 1: Railway.app (แนะนำ - ฟรี $5/เดือน)

**ขั้นตอน:**

1. **สร้างบัญชี:** https://railway.app
2. **New Project** → **Deploy from GitHub**
3. **เลือก repo:** `jlc-group/we-warehouse`
4. **Root Directory:** `we-warehouse-backend`
5. **ตั้งค่า Environment Variables:**
   ```
   DB_SERVER=JHSERVER.DYNDNS.INFO\SQLEXPRESS
   DB_PORT=3306
   DB_USER=readonly_user
   DB_PASSWORD=vjkogmjkoyho
   DB_DATABASE=JHCSMILE
   PORT=3001
   NODE_ENV=production
   ALLOWED_ORIGINS=https://we-warehouse.pages.dev
   ```
6. **Deploy Settings:**
   - Build Command: `npm run build`
   - Start Command: `npm start`
   - Port: `3001`

7. **จะได้ URL:** `https://your-app.up.railway.app`

---

### ตัวเลือก 2: Render.com (ฟรี)

**ขั้นตอน:**

1. **สร้างบัญชี:** https://render.com
2. **New Web Service** → **Connect GitHub**
3. **เลือก repo:** `jlc-group/we-warehouse`
4. **Root Directory:** `we-warehouse-backend`
5. **ตั้งค่า:**
   ```
   Name: we-warehouse-backend
   Environment: Node
   Build Command: npm install && npm run build
   Start Command: npm start
   ```
6. **Environment Variables:** (เหมือนข้างบน)
7. **จะได้ URL:** `https://your-app.onrender.com`

**ข้อจำกัด Render ฟรี:**
- Service จะ sleep หลัง 15 นาทีไม่มีใคร access
- ครั้งแรกที่เรียกจะช้า (cold start ~30 วินาที)

---

### ตัวเลือก 3: Fly.io (ฟรี 3 apps)

**ขั้นตอน:**

1. **ติดตั้ง flyctl:** `brew install flyctl` (Mac) หรือ download จาก https://fly.io
2. **Login:** `flyctl auth login`
3. **สร้าง app:**
   ```bash
   cd we-warehouse-backend
   flyctl launch --name we-warehouse-api
   ```
4. **ตั้งค่า secrets:**
   ```bash
   flyctl secrets set DB_SERVER="JHSERVER.DYNDNS.INFO\\SQLEXPRESS"
   flyctl secrets set DB_PORT=3306
   flyctl secrets set DB_USER=readonly_user
   flyctl secrets set DB_PASSWORD=vjkogmjkoyho
   flyctl secrets set DB_DATABASE=JHCSMILE
   flyctl secrets set ALLOWED_ORIGINS=https://we-warehouse.pages.dev
   ```
5. **Deploy:** `flyctl deploy`
6. **จะได้ URL:** `https://we-warehouse-api.fly.dev`

---

## หลัง Deploy Backend แล้ว

### 1. อัปเดต Frontend `.env`

```env
# Production backend URL
VITE_SALES_API_URL=https://your-backend-url.com
```

### 2. อัปเดต `vite.config.ts`

```typescript
server: {
  proxy: {
    '/api': {
      target: import.meta.env.VITE_SALES_API_URL || 'http://localhost:3001',
      changeOrigin: true,
      secure: true, // เปลี่ยนเป็น true สำหรับ HTTPS
    }
  }
}
```

### 3. Re-build และ Deploy Frontend

```bash
npm run build
# Cloudflare Pages จะ auto-deploy เมื่อ push git
```

---

## ตรวจสอบว่า Backend ทำงาน

```bash
# Test health endpoint
curl https://your-backend-url.com/health

# Test API
curl "https://your-backend-url.com/api/sales/packing-list?tax_date=2025-10-09"
```

---

## Troubleshooting

### ❌ Error: Database connection failed

**สาเหตุ:** Server ที่ deploy ไม่สามารถเข้าถึง `JHSERVER.DYNDNS.INFO:3306`

**วิธีแก้:**
1. เช็คว่า JHSERVER เปิด port 3306 สำหรับ external connections
2. เช็คว่า IP ของ deploy platform ไม่ถูก firewall บล็อก
3. อาจต้องใช้ VPN หรือ SSH tunnel

### ❌ Error: CORS

**วิธีแก้:** ตรวจสอบ `ALLOWED_ORIGINS` ใน environment variables

```bash
# Railway/Render
ALLOWED_ORIGINS=https://we-warehouse.pages.dev,https://we-warehouse.pages.dev

# Fly.io
flyctl secrets set ALLOWED_ORIGINS=https://we-warehouse.pages.dev
```

---

## ทางเลือกอื่น: ใช้ Cloudflare Tunnel (Advanced)

ถ้าต้องการรัน backend ในเครื่องตัวเองแต่มี HTTPS:

```bash
# 1. ติดตั้ง cloudflared
brew install cloudflared

# 2. สร้าง tunnel
cloudflared tunnel create we-warehouse-backend

# 3. Config
cloudflared tunnel route dns we-warehouse-backend backend.yourdomain.com

# 4. Run
cloudflared tunnel --url http://localhost:3001 run we-warehouse-backend
```

จะได้ `https://backend.yourdomain.com` ที่เชื่อมกับ `localhost:3001`
