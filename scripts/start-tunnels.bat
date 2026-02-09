@echo off
echo ========================================
echo Starting We-Warehouse Tunnels
echo ========================================

echo.
echo Starting Backend API Tunnel (warehouse-api.wejlc.com)...
start "Backend Tunnel" cmd /c "cloudflared tunnel --config C:\Users\ADMIN\.cloudflared\config-we-warehouse.yml run we-warehouse-backend"

echo.
echo Starting PostgreSQL Tunnel (postgres-db.wejlc.com)...
start "PostgreSQL Tunnel" cmd /c "cloudflared tunnel --config C:\Users\ADMIN\.cloudflared\config-postgres.yml run postgres-db"

echo.
echo ========================================
echo Tunnels started in separate windows!
echo ========================================
echo.
echo Backend API: https://warehouse-api.wejlc.com
echo PostgreSQL:  postgres-db.wejlc.com (port 5432)
echo.
pause
