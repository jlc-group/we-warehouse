# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run lint` - Run ESLint for code linting
- `npm run preview` - Preview production build locally

## Architecture Overview

This is a React-based warehouse inventory management system built with modern web technologies:

### Core Technologies
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom theming
- **Backend**: Supabase (PostgreSQL database with real-time subscriptions)
- **Data Fetching**: TanStack Query (React Query) v5
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form with Zod validation

### Database Schema (Supabase)
Key tables include:
- `inventory_items` - Core inventory data with location, multi-level unit quantities, product info
- `inventory_movements` - Audit trail for all inventory changes
- `products` - Product master data with SKU codes (`sku_code` field, not `sku`)
- Additional tables for bookings, events, profiles, and analytics

**Important Database Notes:**
- Products table uses `sku_code` field for SKU lookups, not `sku`
- Inventory items support multi-level unit system (ลัง/กล่อง/ชิ้น) with conversion rates
- Use specific field selection in queries instead of `select('*')` to avoid TypeScript type complexity

### Application Structure

**Main Components:**
- `src/pages/Index.tsx` - Main dashboard with tabbed interface
- `src/components/ShelfGrid.tsx` - Visual warehouse layout grid
- `src/components/InventoryTable.tsx` - Tabular view of inventory
- `src/components/InventorySearch.tsx` - Search and filtering functionality
- `src/components/InventoryModal.tsx` - Add/edit inventory items (full version)
- `src/components/InventoryModalSimple.tsx` - Simplified add/edit with multi-level units
- `src/components/InventoryAnalytics.tsx` - Data visualization and reports
- `src/components/MovementLogs.tsx` - Inventory movement history
- `src/components/location/` - Location management components (QR integration)

**Key Hooks & Contexts:**
- `src/hooks/useInventory.ts` - Main inventory data management with CRUD operations and real-time updates via Supabase subscriptions
- `src/contexts/ProductsContext.tsx` - Product data management and context
- `src/contexts/InventoryContext.tsx` - Global inventory state management

**Core Utilities:**
- `src/utils/unitCalculations.ts` - Multi-level unit conversion and calculation utilities
- `src/utils/locationUtils.ts` - Location formatting and QR code utilities
- `src/data/sampleInventory.ts` - Product type definitions and sample data

**Service Layer:**
- `src/services/` - Dedicated service classes for all database operations
- `src/services/conversionRateService.ts` - Unit conversion rate management
- `src/services/locationQRService.ts` - QR code generation and management
- `src/services/warehouseLocationService.ts` - Warehouse location operations
- `src/services/databaseService.ts` - Database analysis and debugging utilities
- `src/services/tableManagementService.ts` - Table structure management

**Database Integration:**
- `src/integrations/supabase/client.ts` - Supabase client configuration
- `src/integrations/supabase/types.ts` - Auto-generated TypeScript types from database schema

### Key Features
- No authentication required (uses random UUIDs for user_id)
- Real-time inventory updates via Supabase subscriptions
- Multi-view interface: grid layout, search, table, analytics, movement logs
- **Multi-level unit system**: Support for ลัง (carton) → กล่อง (box) → ชิ้น (pieces) with conversion rates
- **Location management**: QR code integration for warehouse locations
- **Product type categorization**: FG (Finished Goods) and PK (Packaging) products
- Thai language UI text with English technical terms
- Responsive design with mobile support
- Toast notifications for user feedback

### Development Patterns
- Uses shadcn/ui component conventions with `@/components/ui/` path mapping (`@/*` resolves to `./src/*`)
- TypeScript configuration uses relaxed settings (strict mode disabled, allows any types, allows JS)
- Database types imported from `src/integrations/supabase/types`
- Error handling via toast notifications using Sonner
- Real-time data synchronization patterns via Supabase subscriptions
- **Service Layer Architecture**: All database operations use dedicated service classes in `src/services/`
- **API Endpoints over SQL**: System uses API endpoints instead of direct SQL/RPC calls for consistency
- **Multi-level unit calculations**: Use utilities from `src/utils/unitCalculations.ts` for consistent unit conversion
- **Location format standardization**: Use `src/utils/locationUtils.ts` for location parsing and QR generation
- **Product type management**: Use `PRODUCT_TYPES` constants from `src/data/sampleInventory.ts`

### Configuration Files
- `vite.config.ts` - Vite configuration with React SWC plugin
- `tailwind.config.ts` - Tailwind CSS configuration
- `eslint.config.js` - ESLint configuration
- `postcss.config.js` - PostCSS configuration

## Development Notes

This project uses Lovable.dev for deployment and development, but can be run locally with standard Node.js/npm setup. The codebase follows modern React patterns with TypeScript and utilizes Supabase for backend services including real-time subscriptions.

### Important Notes
- No testing framework is configured - there are no test commands or test files in the project
- TypeScript configuration uses relaxed settings (no strict null checks, allows any types, allows JS)
- Always prefer editing existing files over creating new ones
- Never create documentation files (*.md) unless explicitly requested

### Common Issues & Solutions
- **Database connection issues**: Check that JSX syntax is valid first - syntax errors prevent compilation
- **TypeScript type errors**: Use specific field selection in Supabase queries instead of `select('*')`
- **Column name errors**: Products table uses `sku_code` field, not `sku`
- **Unit conversion errors**: Always use utilities from `src/utils/unitCalculations.ts` for consistency
- **Location format issues**: Use `src/utils/locationUtils.ts` for standardized location handling
- **Service layer errors**: Always use service classes from `src/services/` instead of direct Supabase calls
- **SQL/RPC usage**: Avoid direct SQL or RPC calls - use the appropriate service layer instead