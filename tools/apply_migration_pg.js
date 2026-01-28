// Apply migration using node-postgres
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  // Use dynamic import for ES module
  const { default: postgres } = await import('postgres');

  const connectionString = 'postgresql://postgres:GodSpeed4$@db.uzfohswazhvaphbpwtdv.supabase.co:5432/postgres';

  console.log('Connecting to Supabase database...\n');

  const sql = postgres(connectionString, {
    ssl: 'require'
  });

  try {
    // Read migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '002_refined_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('Applying migration...\n');

    // Execute the entire migration
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration applied successfully\n');

    // Verify tables exist
    console.log('Verifying schema...\n');

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('organization', 'review_session', 'payroll_delta', 'material_judgement', 'approval')
      ORDER BY table_name
    `;

    console.log('Tables found:');
    tables.forEach(t => console.log(`  ✅ ${t.table_name}`));

    if (tables.length === 5) {
      console.log('\n✅ All required tables exist\n');
    } else {
      console.log(`\n⚠️  Expected 5 tables, found ${tables.length}\n`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

applyMigration();
