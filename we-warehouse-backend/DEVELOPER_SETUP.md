# Developer Setup Guide

คู่มือสำหรับ Developer ที่ต้องการพัฒนา We-Warehouse บนเครื่องตัวเอง

## 📋 Prerequisites

| รายการ | Version |
|--------|---------|
| Node.js | 18+ |
| npm | 9+ |
| cloudflared | latest |

---

## 🚀 Quick Start

### 1. Clone และติดตั้ง dependencies

```bash
git clone https://github.com/your-org/we-warehouse.git
cd we-warehouse

# Frontend
npm install

# Backend
cd we-warehouse-backend
npm install
```

### 2. ติดตั้ง cloudflared

**Windows:**
```bash
winget install Cloudflare.cloudflared
```

**Mac:**
```bash
brew install cloudflared
```

### 3. รัน cloudflared proxy (ทุกครั้งก่อน dev)

```bash
cloudflared access tcp --hostname postgres-db.wejlc.com --url localhost:15432
```

> ⚠️ คำสั่งนี้ต้องรันค้างไว้ใน terminal แยก

### 4. สร้าง .env

Copy `.env.example` เป็น `.env` แล้วแก้ port:

```env
# PostgreSQL ผ่าน Cloudflare Tunnel
LOCAL_PG_HOST=localhost
LOCAL_PG_PORT=15432  # << เปลี่ยนจาก 5432 เป็น 15432
```

### 5. รัน Development Server

```bash
# Terminal 1: cloudflared (ต้องรันค้างไว้)
cloudflared access tcp --hostname postgres-db.wejlc.com --url localhost:15432

# Terminal 2: Backend
cd we-warehouse-backend
npm run dev

# Terminal 3: Frontend
npm run dev
```

---

## 🔌 Database Connections

| Database | Host | Port | ใช้ได้จาก |
|----------|------|------|----------|
| SQL Server (JHCSMILE) | JHSERVER.DYNDNS.INFO | 3306 | ทุกที่ |
| PostgreSQL (wewarehouse_local) | localhost | 15432 (via tunnel) | ทุกที่ (ต้องรัน cloudflared) |

---

## ❓ Troubleshooting

### "Connection refused" on PostgreSQL

1. เช็คว่า cloudflared รันอยู่หรือไม่
2. เช็คว่า port ใน .env ตรงกับ cloudflared (15432)
3. ถาม admin ว่า tunnel ของ server หลักรันอยู่ไหม

### cloudflared ไม่ทำงาน

```bash
# เช็ค version
cloudflared --version

# ลอง restart
cloudflared access tcp --hostname postgres-db.wejlc.com --url localhost:15432
```

---

## 📞 Contact

- **PostgreSQL Tunnel Admin:** ต้องเปิด tunnel `postgres-db` ที่เครื่อง server หลัก (192.168.0.60)
- **Tunnel Commands:** ดูใน `scripts/start-tunnels.bat`
