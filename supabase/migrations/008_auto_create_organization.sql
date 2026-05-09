-- Auto-create Organization for New Users
-- Creates an organization and links it to the user when they sign up

-- Function to create organization for new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
BEGIN
  -- Generate organization name from email
  org_name := SPLIT_PART(NEW.email, '@', 1) || '''s Organization';

  -- Create organization
  INSERT INTO public.organization (organization_name)
  VALUES (org_name)
  RETURNING organization_id INTO new_org_id;

  -- Link user to organization
  INSERT INTO public.user_organization_mapping (user_id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'admin');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.organization TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.user_organization_mapping TO postgres, anon, authenticated, service_role;

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates an organization and links it to new users on signup';
