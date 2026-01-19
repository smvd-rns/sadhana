-- SECURE THE DATABASE (LOCKDOWN)
-- Run this SQL in your Supabase SQL Editor.

-- This migration revokes public access to the data tables.
-- PRE-REQUISITE: You must have deployed the "API Upgrades" first (which I have already done).
-- If you run this without upgrading the API, your forms will break.

-- 1. CITIES TABLE
-- Remove existing permissive policies
DROP POLICY IF EXISTS "Anyone can read cities" ON cities;
DROP POLICY IF EXISTS "Authenticated users can insert cities" ON cities;

-- Create restrictive policies
-- Nobody can Select/Insert/Update/Delete directly via Browser/Client
-- Access is ONLY allowed via the "Service Role Key" (Server-Side API) which bypasses RLS.
-- Therefore, we simply don't add ANY policies for these actions, or we add a "false" policy to be explicit.

CREATE POLICY "No direct access to cities" ON cities
  FOR ALL USING (false);

-- 2. CENTERS TABLE
-- Remove existing permissive policies
DROP POLICY IF EXISTS "Anyone can read centers" ON centers;
DROP POLICY IF EXISTS "Authenticated users can insert centers" ON centers;

CREATE POLICY "No direct access to centers" ON centers
  FOR ALL USING (false);

-- 3. COUNSELORS TABLE
-- Remove existing permissive policies
DROP POLICY IF EXISTS "Anyone can read counselors" ON counselors;
DROP POLICY IF EXISTS "Authenticated users can insert counselors" ON counselors;

CREATE POLICY "No direct access to counselors" ON counselors
  FOR ALL USING (false);

-- NOTE: The "Service Role Key" (used by our API routes) automatically bypasses these RLS policies.
-- So our Server API will still work, but hackers in the browser will get "Permission Denied".
