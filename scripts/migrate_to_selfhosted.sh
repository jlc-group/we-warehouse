#!/bin/bash

# Database Migration Script for Self-Hosted PostgreSQL
# Target: 192.168.0.41:5432/wewarehouse_db

export PGPASSWORD='nDP90d@cSZ@95LNu'
DB_HOST="192.168.0.41"
DB_PORT="5432"
DB_USER="wewarehouse_user"
DB_NAME="wewarehouse_db"

MIGRATIONS_DIR="./supabase/migrations"

echo "🚀 Starting database migration to $DB_HOST:$DB_PORT/$DB_NAME"
echo "=============================================="

# Get sorted list of migration files
migration_files=$(ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | sort)

if [ -z "$migration_files" ]; then
    echo "❌ No migration files found in $MIGRATIONS_DIR"
    exit 1
fi

# Create migrations tracking table
echo "📋 Creating migrations tracking table..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
"

# Count files
total_files=$(echo "$migration_files" | wc -l | tr -d ' ')
current=0
success=0
failed=0

for file in $migration_files; do
    current=$((current + 1))
    filename=$(basename "$file")
    
    # Skip .bak files
    if [[ "$filename" == *.bak ]]; then
        echo "⏭️  [$current/$total_files] Skipping backup file: $filename"
        continue
    fi
    
    # Check if already applied
    already_applied=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM schema_migrations WHERE version = '$filename'")
    
    if [ "$already_applied" = "1" ]; then
        echo "✅ [$current/$total_files] Already applied: $filename"
        continue
    fi
    
    echo "🔄 [$current/$total_files] Applying: $filename"
    
    # Run migration
    if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$file" 2>&1 | head -20; then
        # Record migration as applied
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "INSERT INTO schema_migrations (version) VALUES ('$filename') ON CONFLICT DO NOTHING;"
        echo "✅ Applied: $filename"
        success=$((success + 1))
    else
        echo "❌ Failed: $filename"
        failed=$((failed + 1))
        # Continue with next migration instead of stopping
    fi
    echo ""
done

echo "=============================================="
echo "📊 Migration Summary:"
echo "   Total files: $total_files"
echo "   Successful: $success"
echo "   Failed: $failed"
echo ""

# Show tables created
echo "📋 Tables in database:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "\dt"
