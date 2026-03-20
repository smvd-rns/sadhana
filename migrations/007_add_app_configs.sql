-- Create app_configs table for dynamic application settings
CREATE TABLE IF NOT EXISTS public.app_configs (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_configs ENABLE ROW LEVEL SECURITY;

-- Policies for app_configs
-- Following the project's pattern for the secondary (Sadhana) DB, we use 
-- inclusive policies. Access control is enforced at the application layer.

DROP POLICY IF EXISTS "Public can view app configs" ON public.app_configs;
DROP POLICY IF EXISTS "Anyone can read app configs" ON public.app_configs;
CREATE POLICY "Anyone can read app configs" ON public.app_configs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Super admins can update app configs" ON public.app_configs;
DROP POLICY IF EXISTS "Enable update for all" ON public.app_configs;
CREATE POLICY "Enable update for all" ON public.app_configs FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Super admins can insert app configs" ON public.app_configs;
DROP POLICY IF EXISTS "Enable insert for all" ON public.app_configs;
CREATE POLICY "Enable insert for all" ON public.app_configs FOR INSERT WITH CHECK (true);

-- Initial config for data center upload roles
INSERT INTO public.app_configs (key, value)
VALUES ('data_center_upload_roles', '[2, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 21]')
ON CONFLICT (key) DO NOTHING;
