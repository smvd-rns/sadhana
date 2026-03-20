-- Enable RLS on donations table in secondary DB
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;

-- 1. Allow everyone to INSERT (Public Donation Page)
CREATE POLICY "Enable public insert" 
ON donations FOR INSERT 
WITH CHECK (true);

-- 2. Allow SELECT for system-level access / Admins
-- (Using service_role for API routes is the cleanest way for secondary DBs)
-- However, we can add a basic policy for service_role access
CREATE POLICY "Enable all for service_role" 
ON donations FOR ALL 
USING (auth.role() = 'service_role');

-- NOTE: Since this is a secondary DB, user-level visibility (viewing your own tagged donations)
-- is best handled in a secure API route that uses the service_role key 
-- and filters by tag_user_id = current_user_id.
