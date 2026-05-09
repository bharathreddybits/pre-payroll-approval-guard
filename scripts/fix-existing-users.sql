-- Quick Fix: Create Organizations for Existing Users Without One
--
-- Run this in Supabase SQL Editor to create organizations for users who don't have one yet
-- This is a one-time fix for users created before the auto-organization trigger

DO $$
DECLARE
  user_record RECORD;
  new_org_id UUID;
  org_name TEXT;
  users_fixed INTEGER := 0;
BEGIN
  -- Loop through all users who don't have an organization
  FOR user_record IN
    SELECT u.id, u.email
    FROM auth.users u
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.user_organization_mapping uom
      WHERE uom.user_id = u.id
    )
  LOOP
    -- Generate organization name from email
    org_name := SPLIT_PART(user_record.email, '@', 1) || '''s Organization';

    -- Create organization
    INSERT INTO public.organization (organization_name)
    VALUES (org_name)
    RETURNING organization_id INTO new_org_id;

    -- Link user to organization as admin
    INSERT INTO public.user_organization_mapping (user_id, organization_id, role)
    VALUES (user_record.id, new_org_id, 'admin');

    users_fixed := users_fixed + 1;

    RAISE NOTICE 'Created organization for user: % (Org: %)', user_record.email, org_name;
  END LOOP;

  RAISE NOTICE 'Done! Fixed % user(s)', users_fixed;
END $$;
