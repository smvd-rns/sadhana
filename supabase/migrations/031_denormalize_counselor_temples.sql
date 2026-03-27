-- Create migration: 031_denormalize_counselor_temples
-- Fix missing columns and add synchronization triggers for counselors table

-- 1. Ensure essential columns exist in counselors table
-- Some columns might be missing depending on previous migration states
ALTER TABLE public.counselors 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS current_temple TEXT,
ADD COLUMN IF NOT EXISTS parent_temple TEXT;

-- 2. Initial data sync: copy existing temple info from users to counselors based on email matching 
-- (since user_id might not have been populated yet)
UPDATE public.counselors c
SET 
  user_id = u.id,
  current_temple = CASE 
    WHEN u.current_temple = 'Other' THEN (u.hierarchy->>'otherTemple')
    ELSE COALESCE(u.current_temple, u.hierarchy->'currentTemple'->>'name', u.hierarchy->>'currentTemple')
  END,
  parent_temple = CASE 
    WHEN u.parent_temple = 'Other' THEN (u.hierarchy->>'otherParentTemple')
    ELSE COALESCE(u.parent_temple, u.hierarchy->'parentTemple'->>'name', u.hierarchy->>'parentTemple')
  END
FROM public.users u
WHERE (c.email = u.email OR c.user_id = u.id) AND (c.current_temple IS NULL OR c.current_temple = 'Other');

-- 3. Create or replace trigger function to sync temple info FROM users TO counselors (on update)
CREATE OR REPLACE FUNCTION public.sync_counselor_temple_info_on_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the counselors table when a user's temple info changes
  -- Handle 'Other' fallback
  UPDATE public.counselors
  SET 
    current_temple = CASE 
      WHEN NEW.current_temple = 'Other' THEN (NEW.hierarchy->>'otherTemple')
      ELSE NEW.current_temple
    END,
    parent_temple = CASE 
      WHEN NEW.parent_temple = 'Other' THEN (NEW.hierarchy->>'otherParentTemple')
      ELSE NEW.parent_temple
    END
  WHERE user_id = NEW.id OR email = NEW.email;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger on users table
DROP TRIGGER IF EXISTS tr_sync_counselor_temple_info_on_user_update ON public.users;
CREATE TRIGGER tr_sync_counselor_temple_info_on_user_update
AFTER UPDATE OF current_temple, parent_temple ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.sync_counselor_temple_info_on_user_update();

-- 5. Create trigger function to fetch temple info ON counselor INSERT
CREATE OR REPLACE FUNCTION public.fetch_counselor_temple_info_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Try to link by email if user_id is missing
  IF NEW.user_id IS NULL AND NEW.email IS NOT NULL THEN
    SELECT id INTO NEW.user_id FROM public.users WHERE email = NEW.email;
  END IF;

  -- Fetch temple info if we have a user link
  IF NEW.user_id IS NOT NULL THEN
    SELECT 
      CASE 
        WHEN current_temple = 'Other' THEN (hierarchy->>'otherTemple')
        ELSE current_temple
      END,
      CASE 
        WHEN parent_temple = 'Other' THEN (hierarchy->>'otherParentTemple')
        ELSE parent_temple
      END
    INTO NEW.current_temple, NEW.parent_temple
    FROM public.users
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create trigger on counselors table
DROP TRIGGER IF EXISTS tr_fetch_counselor_temple_info_on_insert ON public.counselors;
CREATE TRIGGER tr_fetch_counselor_temple_info_on_insert
BEFORE INSERT ON public.counselors
FOR EACH ROW
EXECUTE FUNCTION public.fetch_counselor_temple_info_on_insert();

-- 7. Add comments for documentation
COMMENT ON COLUMN public.counselors.user_id IS 'Link to the users table for stable identification';
COMMENT ON COLUMN public.counselors.is_verified IS 'Whether the counselor is verified and active';
COMMENT ON COLUMN public.counselors.current_temple IS 'Denormalized current temple from users table for faster filtering';
COMMENT ON COLUMN public.counselors.parent_temple IS 'Denormalized parent temple from users table for faster filtering';
