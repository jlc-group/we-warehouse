# Bill Clearing System Migration Guide

## 📋 Overview
This guide explains how to apply the bill clearing system migration to your Supabase database.

## ⚠️ Pre-Migration Status
- ✅ Fallback system is active - application works without migration
- ⚠️ Found uppercase statuses that need conversion: DRAFT, CONFIRMED, PROCESSING, SHIPPED, DELIVERED
- ❌ Bill clearing columns not yet added to customer_orders table

## 🚀 How to Apply Migration

### Option 1: Supabase Dashboard (Recommended)
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Navigate to SQL Editor
3. Copy and paste the entire contents of `supabase/migrations/20250925000000_create_bill_clearing_system.sql`
4. Run the SQL script

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed and configured
cd supabase
supabase db push
```

## 📊 What the Migration Does

### 1. Add New Columns to customer_orders
- `cleared_at` - When bill was cleared
- `cleared_by` - Who cleared the bill
- `cleared_notes` - Notes about clearing
- `cleared_amount` - Amount that was cleared
- `payment_status` - pending, partial, paid, overdue, refunded
- `approval_required` - Whether approval is needed
- `approved_for_clearing_by` - Who approved for clearing
- `approved_for_clearing_at` - When approved

### 2. Update Order Status System
- Converts existing uppercase statuses to lowercase (DRAFT → draft)
- Adds new constraint allowing both formats for compatibility
- Adds new statuses: ready_to_ship, cleared, cancelled, refunded

### 3. Create New Tables
- `order_status_history` - Track all status changes
- `bill_clearing_permissions` - User permissions for bill clearing
- `clearing_batches` - Batch processing for multiple bills
- `clearing_batch_items` - Items within clearing batches

### 4. Create Database Views
- `clearable_orders_view` - Orders ready for clearing
- `order_status_history_view` - Status history with user names
- `clearing_batches_view` - Batch summary with statistics

### 5. Create Stored Procedures
- `clear_bill()` - Clear a single bill with validation
- `create_clearing_batch()` - Create batch for multiple bills
- `check_bill_clearing_permission()` - Validate user permissions

## ✅ After Migration

1. **Automatic Features Activation**
   - FallbackBanner will disappear automatically
   - Full bill clearing functionality will be available
   - Permission system will be active

2. **Test the System**
   - Go to "เคลียร์บิล" tab - should show real data
   - Go to "ตรวจสอบสถานะ" tab - should show order history
   - No more fallback mode messages

3. **Grant Permissions**
   - Use the permission management in "ตรวจสอบสถานะ" tab
   - Grant appropriate permissions to users:
     - `bill_clearer` - Can clear bills
     - `bill_checker` - Can check status
     - `bill_approver` - Can approve bills
     - `bill_manager` - Full access

## 🔧 Troubleshooting

### If Migration Fails
1. **Constraint Violation Error**
   - Migration automatically handles status conversion
   - If error persists, check for custom status values

2. **Permission Error**
   - Ensure you have database admin privileges
   - Contact Supabase support if needed

3. **Column Already Exists**
   - Migration uses `IF NOT EXISTS` - should be safe to re-run
   - Check for partial previous migrations

### Rollback (if needed)
```sql
-- Only if you need to rollback (not recommended)
ALTER TABLE public.customer_orders
DROP COLUMN IF EXISTS cleared_at,
DROP COLUMN IF EXISTS cleared_by,
-- ... (other columns)
```

## 📞 Support
If you encounter issues:
1. Check the browser console for errors
2. Verify database permissions
3. Contact your database administrator
4. The fallback system will continue working until migration succeeds

## 🎯 Expected Results
- ✅ All existing functionality preserved
- ✅ New bill clearing features available
- ✅ Status tracking and permissions working
- ✅ No data loss or downtime
- ✅ Improved user experience with full features