# We-Warehouse Backend API

Backend service for connecting to SQL Server external database (JHCSMILE) and providing REST API endpoints for sales data.

## Features

- 🔌 SQL Server connection with connection pooling
- 🔒 CORS security and Helmet protection
- 📝 TypeScript for type safety
- 🚀 Express.js REST API
- 📊 Sales orders and packing list endpoints

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```env
DB_SERVER=JHSERVER.DYNDNS.INFO\\SQLEXPRESS
DB_PORT=3306
DB_USER=readonly_user
DB_PASSWORD=vjkogmjkoyho
DB_DATABASE=JHCSMILE
PORT=3001
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
```

### 3. Run Development Server

```bash
npm run dev
```

### 4. Build for Production

```bash
npm run build
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Check database connection status

### Sales Orders
- `GET /api/sales` - Get all sales orders
  - Query params: `startDate`, `endDate`, `arcode`, `docstatus`, `limit`, `offset`
- `GET /api/sales/:docno` - Get single sales order with line items
- `GET /api/sales/:docno/items` - Get line items only
- `GET /api/sales/packing-list` - Generate packing list
  - Query params: `startDate`, `endDate`, `docstatus`

## Database Schema

### CSSALE (Sales Headers)
- Primary Key: `DOCNO`
- 150+ columns including customer info, amounts, dates, etc.

### CSSALESUB (Sales Line Items)
- Composite Key: `DOCNO + LINEID`
- Foreign Key: `DOCNO → CSSALE.DOCNO`
- 80+ columns including product details, quantities, prices

## Tech Stack

- Express.js 4.x
- TypeScript 5.x
- mssql 10.x (SQL Server driver)
- Helmet (security)
- CORS (cross-origin)
- dotenv (environment config)
