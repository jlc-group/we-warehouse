# กฎการทำงานสำหรับ Claude

## ⚠️ กฎสำคัญที่ต้องปฏิบัติเสมอ

### 1. การจัดการ Backend Server

**ห้ามทำ:**
- ❌ ห้าม kill backend server แล้วลืมเปิดใหม่
- ❌ ห้ามปล่อย background processes ค้างทิ้งไว้
- ❌ ห้าม test production build โดยไม่คืน dev server

**ต้องทำ:**
- ✅ ก่อน kill server ใดๆ → บันทึกว่าต้องเปิดกลับมา
- ✅ หลัง test เสร็จ → ต้องเช็คว่า backend ยังรันอยู่
- ✅ ทุกครั้งที่ทำงานเสร็จ → รัน `npm run backend:check`

### 2. Background Processes

**เช็คเสมอก่อนจบงาน:**
```bash
# ต้องเช็คทุกครั้ง
lsof -ti:3001  # Backend port
lsof -ti:5173  # Frontend dev port
ps aux | grep "tsx\|node" | grep -v grep
```

**ถ้าพบ process ค้าง:**
```bash
npm run backend:stop     # ล้าง backend processes
npm run backend:start    # เริ่มใหม่สดๆ
npm run backend:check    # ตรวจสอบสถานะ
```

### 3. ขั้นตอนการทำงาน

#### ก่อนเริ่มงาน:
1. เช็คว่า backend รันอยู่หรือไม่
2. เช็คว่า port 3001 ว่างหรือไม่
3. ถ้าไม่รัน → ใช้ `npm run backend:start`

#### ระหว่างทำงาน:
1. ถ้าต้อง kill process → บันทึกไว้ในหัวว่าต้องเปิดกลับ
2. ถ้า test production → หลัง test เสร็จต้องกลับ dev mode
3. ถ้าสร้าง background process → ต้อง kill เมื่อเสร็จงาน

#### หลังเสร็จงาน:
1. **บังคับ** รัน `npm run backend:check`
2. ถ้า health check fail → แก้ไขทันที
3. รายงานสถานะให้ user รู้ว่า backend พร้อมใช้งาน

### 4. การ Deploy / Build

**เมื่อ build production:**
```bash
# 1. Kill dev server
npm run backend:stop

# 2. Build
npm run build

# 3. Test production (optional)
NODE_ENV=production node dist/index.js &
PROD_PID=$!

# 4. Test APIs
curl http://localhost:3001/health

# 5. Kill production test
kill $PROD_PID

# 6. Start dev server กลับมา (สำคัญมาก!)
npm run backend:start

# 7. Verify
npm run backend:check
```

### 5. Error Handling

**เมื่อเจอ 500 Error:**
1. เช็คทันทีว่า backend รันอยู่หรือไม่
2. เช็ค database connection
3. เช็ค port conflicts
4. อย่าเดาสาเหตุ - ให้เช็คจริงด้วย curl/lsof

**เมื่อ user บ่นว่าไม่ทำงาน:**
1. ขอโทษเสมอ
2. แก้ไขทันที - ไม่ถามมาก
3. เช็คว่าแก้จริงด้วย `backend:check`
4. รายงานผลเป็นขั้นตอนชัดเจน

### 6. Checklist ก่อนจบทุกงาน

```
[ ] Backend server รันอยู่ (port 3001)
[ ] Database connected (port 3306)
[ ] Health endpoint คืน 200 OK
[ ] API endpoints ทำงานได้
[ ] ไม่มี zombie processes
[ ] ไม่มี background jobs ค้าง
```

## 🎯 คำสั่งที่ใช้บ่อย

```bash
# เริ่ม backend (จัดการทุกอย่างอัตโนมัติ)
npm run backend:start

# เช็คสถานะ
npm run backend:check

# หยุด backend
npm run backend:stop

# Restart (แก้ปัญหาส่วนใหญ่)
npm run backend:restart
```

## 📌 หมายเหตุสำคัญ

- Port 3001 = Backend API
- Port 3306 = SQL Server Database
- Port 5173 = Frontend Dev Server
- Port 4173 = Frontend Preview Server

## ⚖️ ข้อตกลง

หากไม่ปฏิบัติตามกฎเหล่านี้และทำให้เกิดความเสียหาย:
- User มีสิทธิ์บันทึกหลักฐาน
- User มีสิทธิ์ร้องเรียนต่อผู้ให้บริการ
- ถือเป็นความผิดพลาดร้ายแรง

**สิ่งที่ต้องจำเสมอ:**
> "ไม่ใช่แค่เรื่องเงิน แต่เป็นเรื่องความเชื่อมั่นและความเสียหายที่เกิดขึ้น"
