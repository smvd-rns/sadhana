-- Create platform_settings table for dynamic configuration
CREATE TABLE IF NOT EXISTS platform_settings (
    id TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    pending_value JSONB, 
    approval_token TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- 1. Admins Policy
DROP POLICY IF EXISTS "Super Admins can manage platform settings" ON platform_settings;
CREATE POLICY "Super Admins can manage platform settings" 
ON platform_settings 
FOR ALL 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role @> ARRAY[8]
    )
);

-- 2. Public Read Policy
DROP POLICY IF EXISTS "Anyone can read platform settings" ON platform_settings;
CREATE POLICY "Anyone can read platform settings" 
ON platform_settings 
FOR SELECT 
TO anon, authenticated
USING (true);

-- Seed initial value with proper JSON formatting (no extra quotes)
-- In SQL, '"razorpay"' stores a JSON string
INSERT INTO platform_settings (id, value) 
VALUES ('active_payment_gateway', '"razorpay"')
ON CONFLICT (id) DO NOTHING;
