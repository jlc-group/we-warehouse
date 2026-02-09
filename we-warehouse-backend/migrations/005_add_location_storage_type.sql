-- Migration 005: Add location_settings table for storage type configuration
-- This allows each location to be configured as "full carton only" or "allow all"

CREATE TABLE IF NOT EXISTS location_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location VARCHAR(50) NOT NULL UNIQUE,
  storage_type VARCHAR(20) DEFAULT 'allow_all' CHECK (storage_type IN ('full_carton_only', 'allow_all')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by location
CREATE INDEX IF NOT EXISTS idx_location_settings_location ON location_settings(location);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_location_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_location_settings_updated_at ON location_settings;
CREATE TRIGGER trigger_location_settings_updated_at
  BEFORE UPDATE ON location_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_location_settings_updated_at();

-- Comment
COMMENT ON TABLE location_settings IS 'Configuration for each warehouse location (storage type, etc.)';
COMMENT ON COLUMN location_settings.storage_type IS 'full_carton_only = only full cartons allowed, allow_all = any quantity';
