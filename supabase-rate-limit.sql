-- Rate Limiting Table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS rate_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL, -- Combined key: e.g., 'ip:127.0.0.1:add_city' or 'user:uuid:add_city'
  count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ DEFAULT NOW(),
  blocked_until TIMESTAMPTZ,
  metadata JSONB, -- Store extra info like User Agent, specific blocked IP, etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(key)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);

-- Enable RLS
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Policies
-- We only need the service role (backend) to write to this, effectively.
-- But if we use the authenticated client in API routes, we might need policies.
-- However, for security, rate limits are best managed by a Service Role client or 
-- strict policies that don't allow users to "unblock" themselves.
-- Since our API routes use `authenticatedClient` (which acts as the user), 
-- we either need to use a Service Role client for rate limiting specifically, 
-- OR allow users to INSERT/UPDATE their own keys but validation logic happens in code.
--
-- BETTER APPROACH: The API routes should use a SUPABASE_SERVICE_ROLE_KEY to manage rate limits 
-- so the user cannot manipulate them via Client Side libraries if they somehow got access.
--
-- However, to keep it simple with existing `authenticatedClient` usage in routes, we can allow:
-- Authenticated users can insert/update rows where the key contains their ID? 
-- IP based keys are harder to secure regarding RLS if potential attackers are anonymous.
--
-- THEREFORE: The best practice is that the Rate Limiting logic in the API Route 
-- should use a PRIVILEGED client (Service Role) to check and update limits.
-- This prevents the user from bypassing it.
--
-- So, we will not add permissive RLS policies for public/authenticated users. 
-- We will rely on the backend API route using the Service Key (if available) or 
-- we will add specific policies if we must use the anon key.
--
-- For now, let's create a policy that allows ALL operations for the service role (default)
-- and READ ONLY for others if needed (or nothing).
-- Actually, strict security means we probably shouldn't expose this table to the frontend at all.

-- Grant full access to service_role (which is default, but good to be explicit if needed)
-- (Supabase default is service_role bypasses RLS).

-- Clean up helper function
CREATE OR REPLACE FUNCTION update_rate_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_rate_limits_updated_at
  BEFORE UPDATE ON rate_limits
  FOR EACH ROW
  EXECUTE FUNCTION update_rate_limits_updated_at();
