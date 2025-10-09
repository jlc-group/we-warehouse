# Deployment Guide - Render.com

## วิธี Deploy Backend ไป Render.com

### ขั้นตอนที่ 1: Push Code ไป GitHub

```bash
cd /Users/chanack/Documents/GitHub/we-warehouse
git add .
git commit -m "🚀 Prepare backend for Render deployment"
git push
```

### ขั้นตอนที่ 2: สร้าง Web Service บน Render

1. ไปที่ https://render.com และ Login
2. คลิก **"New +"** → เลือก **"Web Service"**
3. เลือก repository: `we-warehouse`
4. ตั้งค่าดังนี้:
   - **Name**: `we-warehouse-backend`
   - **Region**: Singapore (ใกล้ที่สุด)
   - **Root Directory**: `we-warehouse-backend`
   - **Runtime**: Node
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### ขั้นตอนที่ 3: ตั้งค่า Environment Variables

เพิ่ม Environment Variables ต่อไปนี้:

```
NODE_ENV=production
PORT=3001
DB_SERVER=JHSERVER.DYNDNS.INFO\SQLEXPRESS
DB_PORT=3306
DB_USER=readonly_user
DB_PASSWORD=vjkogmjkoyho
DB_DATABASE=JHCSMILE
ALLOWED_ORIGINS=https://we-warehouse.pages.dev,https://we-warehouse-api-proxy.software-dept.workers.dev
```

### ขั้นตอนที่ 4: Deploy

1. คลิก **"Create Web Service"**
2. รอประมาณ 2-5 นาที
3. จะได้ URL เช่น: `https://we-warehouse-backend.onrender.com`

### ขั้นตอนที่ 5: ทดสอบ Backend

```bash
curl https://we-warehouse-backend.onrender.com/health
```

ผลลัพธ์ที่ถูกต้อง:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-09T...",
  "database": {
    "status": "connected",
    "database": "JHCSMILE"
  }
}
```

### ขั้นตอนที่ 6: อัปเดต Cloudflare Worker

แก้ไขไฟล์ `cloudflare-workers/api-proxy.js`:

```javascript
const BACKEND_URL = 'https://we-warehouse-backend.onrender.com';
```

Deploy Worker:
```bash
cd cloudflare-workers
wrangler deploy
```

### ขั้นตอนที่ 7: ตั้งค่า Environment Variable บน Cloudflare Pages

1. ไปที่ Cloudflare Dashboard → Pages → we-warehouse
2. Settings → Environment Variables
3. เพิ่ม:
   ```
   VITE_SALES_API_URL = https://we-warehouse-api-proxy.software-dept.workers.dev/api
   ```
4. Retry Deployment หรือ Deploy ใหม่

---

## หมายเหตุสำคัญ

### Free Tier Limitations (Render.com)
- ⏰ **Spin down after 15 minutes** - Service จะ sleep ถ้าไม่มีการใช้งาน
- 🐌 **Cold start ~30 seconds** - ครั้งแรกจะช้า
- 🎯 **750 hours/month** - เพียงพอสำหรับ 1 service ทำงานตลอดเดือน
- 💾 **512MB RAM** - เพียงพอสำหรับ Node.js API

### การแก้ปัญหา Cold Start
เพิ่ม Cron Job/UptimeRobot เพื่อ ping ทุก 5-10 นาที:
```
https://we-warehouse-backend.onrender.com/health
```

### Alternative: Railway
- ✅ ไม่มี cold start (Free tier)
- ✅ $5 credit ฟรี/เดือน
- ❌ ต้องการ credit card

---

## API Endpoints ที่พร้อมใช้งาน

หลัง deploy แล้ว API endpoints เหล่านี้จะพร้อมใช้:

- `GET /health` - Health check
- `GET /api/sales` - ดึงข้อมูลใบสั่งขาย
- `GET /api/sales/:docno` - ดึงใบสั่งขายแบบละเอียด
- `GET /api/sales/:docno/items` - ดึงรายการสินค้าในใบสั่งขาย
- `GET /api/packing-list` - ดึงรายการแพ็คสินค้า
- `GET /api/customers/:arcode/sales` - ดึงประวัติการสั่งซื้อของลูกค้า
