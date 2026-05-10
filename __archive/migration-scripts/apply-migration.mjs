/**
 * Apply Auto-Organization Migration
 * Executes the 008_auto_create_organization.sql migration
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf8');

const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#][^=]*)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

console.log('\n═══════════════════════════════════════════════');
console.log('   Apply Auto-Organization Migration');
console.log('═══════════════════════════════════════════════\n');

const migrationSQL = `
-- Function to create organization for new user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  org_name TEXT;
BEGIN
  org_name := SPLIT_PART(NEW.email, '@', 1) || '''s Organization';

  INSERT INTO public.organization (organization_name)
  VALUES (org_name)
  RETURNING organization_id INTO new_org_id;

  INSERT INTO public.user_organization_mapping (user_id, organization_id, role)
  VALUES (NEW.id, new_org_id, 'admin');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
`;

async function main() {
  try {
    console.log('Applying migration...\n');

    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If RPC doesn't exist, fall back to telling user to run manually
      console.log('⚠ Unable to apply migration via API.\n');
      console.log('Please run this SQL in Supabase Dashboard:\n');
      console.log(migrationSQL);
      console.log('\nOr use: supabase db push\n');
      return;
    }

    console.log('✅ Migration applied successfully!\n');
    console.log('Future user signups will automatically get organizations.\n');

  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nPlease apply migration manually:');
    console.log('File: supabase/migrations/008_auto_create_organization.sql\n');
  }
}

main();
