# การกำหนด Port ของระบบ We-Platform

**อัปเดตล่าสุด:** 16 มี.ค. 2569

## ตาราง Port มาตรฐาน (ไม่ชนกัน)

| บริการ | Port | หมายเหตุ |
|--------|------|----------|
| **We-Warehouse Backend** | 3015 (DEV) / 3005 (PROD) | ตาม PM2 |
| **We-Warehouse Frontend** | 5178 | Vite dev server |
| **We-Purchase Backend** | 8100 | FastAPI |
| **We-Purchase Frontend** | 3100 | Vite dev server |
| **PostgreSQL** | 5432 | ฐานข้อมูล |
| **Ollama (AI)** | 11434 | ถ้าใช้ |

## การเชื่อมต่อระหว่างบริการ

| จาก | ไป | URL ที่ใช้ |
|-----|-----|------------|
| We-Warehouse Frontend | We-Warehouse Backend | http://localhost:3015 (DEV) |
| We-Purchase Frontend | We-Purchase Backend | http://localhost:8100/api |
| We-Purchase Frontend | We-Warehouse Backend (PK Stock) | http://localhost:3015/api (DEV) |

## ไฟล์ที่ต้องตั้งค่า

- `we-warehouse-backend/.env` → `PORT=3015`
- `we-warehouse/vite.config.ts` → proxy target `3015`
- `we-warehouse/.env.example` → `VITE_SALES_API_URL` = `http://localhost:3015/api`
- `we-purchase/frontend/.env` → `VITE_WAREHOUSE_API_URL=http://localhost:3015/api`
