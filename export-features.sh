#!/bin/bash

# =====================================================
# Export Features Script - 4 ฟีเจอร์หลัก
# =====================================================
# สคริปต์นี้จะ copy ไฟล์ทั้งหมดที่เกี่ยวข้องกับ:
# 💰 การเงิน (Finance Dashboard)
# 📋 Stock Card (บัตรสต็อก)
# 🔄 ใบโอนย้าย (Transfer Documents)
# 📦 รายการแพค (Packing List)
#
# วิธีใช้:
#   ./export-features.sh [target-directory]
#
# ตัวอย่าง:
#   ./export-features.sh ~/Desktop/exported-features
#   ./export-features.sh /path/to/new-project
# =====================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if target directory is provided
if [ -z "$1" ]; then
  echo -e "${RED}❌ Error: Target directory not specified${NC}"
  echo ""
  echo "Usage: $0 [target-directory]"
  echo ""
  echo "Example:"
  echo "  $0 ~/Desktop/exported-features"
  echo "  $0 /path/to/new-project"
  exit 1
fi

TARGET_DIR="$1"
SOURCE_DIR="$(pwd)"

echo ""
echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}🚀 Export Features - We-Warehouse${NC}"
echo -e "${CYAN}================================================${NC}"
echo ""
echo -e "${BLUE}📂 Source Directory:${NC} $SOURCE_DIR"
echo -e "${BLUE}📂 Target Directory:${NC} $TARGET_DIR"
echo ""

# Create target directory
if [ -d "$TARGET_DIR" ]; then
  echo -e "${YELLOW}⚠️  Target directory already exists${NC}"
  read -p "Do you want to overwrite? (y/N): " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}❌ Export cancelled${NC}"
    exit 1
  fi
  echo -e "${YELLOW}🗑️  Cleaning target directory...${NC}"
  rm -rf "$TARGET_DIR"
fi

echo -e "${GREEN}📁 Creating target directory structure...${NC}"
mkdir -p "$TARGET_DIR"

# Counter
TOTAL_FILES=0

# =====================================================
# BACKEND FILES
# =====================================================

echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}🏢 BACKEND FILES${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Create backend directory structure
mkdir -p "$TARGET_DIR/we-warehouse-backend/src/config"
mkdir -p "$TARGET_DIR/we-warehouse-backend/src/controllers"
mkdir -p "$TARGET_DIR/we-warehouse-backend/src/middleware"
mkdir -p "$TARGET_DIR/we-warehouse-backend/src/routes"
mkdir -p "$TARGET_DIR/we-warehouse-backend/src/services"
mkdir -p "$TARGET_DIR/we-warehouse-backend/src/types"

# Backend Core Files
echo ""
echo -e "${BLUE}🔧 Core/Shared Files${NC}"

BACKEND_CORE=(
  "we-warehouse-backend/src/index.ts"
  "we-warehouse-backend/src/config/database.ts"
  "we-warehouse-backend/src/middleware/cors.ts"
  "we-warehouse-backend/src/middleware/errorHandler.ts"
  "we-warehouse-backend/src/services/sqlServerService.ts"
  "we-warehouse-backend/src/types/sales.types.ts"
  "we-warehouse-backend/src/types/stock.types.ts"
  "we-warehouse-backend/package.json"
  "we-warehouse-backend/tsconfig.json"
  "we-warehouse-backend/.gitignore"
)

for file in "${BACKEND_CORE[@]}"; do
  if [ -f "$SOURCE_DIR/$file" ]; then
    cp "$SOURCE_DIR/$file" "$TARGET_DIR/$file"
    echo -e "  ${GREEN}✓${NC} $file"
    ((TOTAL_FILES++))
  else
    echo -e "  ${RED}✗${NC} $file (not found)"
  fi
done

# Backend Routes & Controllers
echo ""
echo -e "${BLUE}📡 Routes & Controllers${NC}"

BACKEND_API=(
  "we-warehouse-backend/src/routes/salesRoutes.ts"
  "we-warehouse-backend/src/routes/stockRoutes.ts"
  "we-warehouse-backend/src/controllers/salesController.ts"
  "we-warehouse-backend/src/controllers/stockController.ts"
)

for file in "${BACKEND_API[@]}"; do
  if [ -f "$SOURCE_DIR/$file" ]; then
    cp "$SOURCE_DIR/$file" "$TARGET_DIR/$file"
    echo -e "  ${GREEN}✓${NC} $file"
    ((TOTAL_FILES++))
  else
    echo -e "  ${RED}✗${NC} $file (not found)"
  fi
done

# Create .env.example
echo ""
echo -e "${BLUE}⚙️  Creating .env.example${NC}"
cat > "$TARGET_DIR/we-warehouse-backend/.env.example" <<'EOF'
# SQL Server Configuration
DB_SERVER=your-server.example.com\SQLEXPRESS
DB_PORT=3306
DB_USER=your_username
DB_PASSWORD=your_password
DB_DATABASE=JHCSMILE

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
EOF
echo -e "  ${GREEN}✓${NC} we-warehouse-backend/.env.example"
((TOTAL_FILES++))

# Create backend README
echo -e "${BLUE}📄 Creating backend README.md${NC}"
cat > "$TARGET_DIR/we-warehouse-backend/README.md" <<'EOF'
# We-Warehouse Backend API

Express + TypeScript backend สำหรับเชื่อมต่อ SQL Server (JHCSMILE Database)

## Features

- 💰 Finance Dashboard API
- 📋 Stock Card API
- 🔄 Transfer Documents API
- 📦 Packing List API

## Installation

```bash
npm install
```

## Configuration

1. Copy `.env.example` to `.env`
2. Update database credentials

## Development

```bash
npm run dev
```

## Build

```bash
npm run build
npm start
```

## API Endpoints

See `FILE_EXPORT_LIST.md` for full API documentation
EOF
echo -e "  ${GREEN}✓${NC} we-warehouse-backend/README.md"
((TOTAL_FILES++))

# =====================================================
# FRONTEND FILES
# =====================================================

echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}💻 FRONTEND FILES${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Create frontend directory structure
mkdir -p "$TARGET_DIR/src/components"
mkdir -p "$TARGET_DIR/src/components/picking"
mkdir -p "$TARGET_DIR/src/hooks"
mkdir -p "$TARGET_DIR/src/utils"

# Frontend Components
echo ""
echo -e "${BLUE}🎨 Components${NC}"

FRONTEND_COMPONENTS=(
  "src/components/FinanceDashboard.tsx"
  "src/components/StockCardTabNew.tsx"
  "src/components/TransferTab.tsx"
  "src/components/PackingListTab.tsx"
  "src/components/picking/PickingPlanModal.tsx"
)

for file in "${FRONTEND_COMPONENTS[@]}"; do
  if [ -f "$SOURCE_DIR/$file" ]; then
    cp "$SOURCE_DIR/$file" "$TARGET_DIR/$file"
    echo -e "  ${GREEN}✓${NC} $file"
    ((TOTAL_FILES++))
  else
    echo -e "  ${RED}✗${NC} $file (not found)"
  fi
done

# Frontend Hooks
echo ""
echo -e "${BLUE}🪝 Hooks${NC}"

FRONTEND_HOOKS=(
  "src/hooks/useSalesData.ts"
  "src/hooks/useSalesOrders.ts"
)

for file in "${FRONTEND_HOOKS[@]}"; do
  if [ -f "$SOURCE_DIR/$file" ]; then
    cp "$SOURCE_DIR/$file" "$TARGET_DIR/$file"
    echo -e "  ${GREEN}✓${NC} $file"
    ((TOTAL_FILES++))
  else
    echo -e "  ${RED}✗${NC} $file (not found)"
  fi
done

# Frontend Utils
echo ""
echo -e "${BLUE}🔧 Utils${NC}"

FRONTEND_UTILS=(
  "src/utils/pickingAlgorithm.ts"
)

for file in "${FRONTEND_UTILS[@]}"; do
  if [ -f "$SOURCE_DIR/$file" ]; then
    cp "$SOURCE_DIR/$file" "$TARGET_DIR/$file"
    echo -e "  ${GREEN}✓${NC} $file"
    ((TOTAL_FILES++))
  else
    echo -e "  ${RED}✗${NC} $file (not found)"
  fi
done

# =====================================================
# DOCUMENTATION FILES
# =====================================================

echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}📚 DOCUMENTATION${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

DOC_FILES=(
  "FILE_EXPORT_LIST.md"
  "FEATURES_SETUP_GUIDE.md"
)

for file in "${DOC_FILES[@]}"; do
  if [ -f "$SOURCE_DIR/$file" ]; then
    cp "$SOURCE_DIR/$file" "$TARGET_DIR/$file"
    echo -e "  ${GREEN}✓${NC} $file"
    ((TOTAL_FILES++))
  else
    echo -e "  ${YELLOW}⚠${NC}  $file (not found, will be created later)"
  fi
done

# =====================================================
# SUMMARY
# =====================================================

echo ""
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}✅ EXPORT SUMMARY${NC}"
echo -e "${PURPLE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${GREEN}📊 Total Files Exported: $TOTAL_FILES${NC}"
echo ""
echo -e "${CYAN}📂 Exported Structure:${NC}"
echo ""

# Show directory tree (if tree command is available)
if command -v tree &> /dev/null; then
  tree -L 3 "$TARGET_DIR"
else
  # Fallback to ls if tree is not available
  echo "$TARGET_DIR"
  ls -R "$TARGET_DIR" | grep ":$" | sed -e 's/:$//' -e 's/[^-][^\/]*\//  /g' -e 's/^/  /'
fi

echo ""
echo -e "${GREEN}✅ Export completed successfully!${NC}"
echo ""
echo -e "${YELLOW}📝 Next Steps:${NC}"
echo -e "  1. cd $TARGET_DIR"
echo -e "  2. Read ${CYAN}FEATURES_SETUP_GUIDE.md${NC} for setup instructions"
echo -e "  3. Configure ${CYAN}.env${NC} files"
echo -e "  4. Install dependencies (npm install)"
echo ""
echo -e "${CYAN}================================================${NC}"
echo ""
