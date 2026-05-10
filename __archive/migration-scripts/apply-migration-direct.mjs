/**
 * Apply Auto-Organization Migration - Direct PostgreSQL Connection
 * Uses direct database connection to execute migration SQL
 */

import pg from 'pg';
const { Client } = pg;
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

// Get connection string from environment
const connectionString = env.SUPABASE_DB_URL || env.DATABASE_URL;

if (!connectionString) {
  console.error('\n❌ Missing database connection string');
  console.error('Please add SUPABASE_DB_URL or DATABASE_URL to your .env file\n');
  console.error('Get it from: Supabase Dashboard → Project Settings → Database → Connection String (URI)\n');
  process.exit(1);
}

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

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.organization TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.user_organization_mapping TO postgres, anon, authenticated, service_role;
`;

console.log('\n═══════════════════════════════════════════════');
console.log('   Apply Auto-Organization Migration (Direct)');
console.log('═══════════════════════════════════════════════\n');

async function main() {
  const client = new Client({
    connectionString: connectionString,
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('✓ Connected\n');

    console.log('Applying migration...');
    await client.query(migrationSQL);
    console.log('✓ Migration applied\n');

    console.log('═══════════════════════════════════════════════');
    console.log('✅ Success! Auto-organization trigger is active');
    console.log('═══════════════════════════════════════════════\n');
    console.log('Future user signups will automatically get organizations.\n');

  } catch (error) {
    console.error('\n❌ Error applying migration:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
