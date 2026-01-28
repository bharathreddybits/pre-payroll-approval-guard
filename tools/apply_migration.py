#!/usr/bin/env python3
"""
Apply Supabase migration using psycopg2
"""

import os
import sys
from pathlib import Path

try:
    import psycopg2
    from psycopg2 import sql
except ImportError:
    print("❌ psycopg2 not installed")
    print("   Run: pip install psycopg2-binary")
    sys.exit(1)

def main():
    # Connection details
    db_host = "db.uzfohswazhvaphbpwtdv.supabase.co"
    db_port = "5432"
    db_name = "postgres"
    db_user = "postgres"
    db_password = "GodSpeed4$"

    print(f"Connecting to {db_host}...")

    try:
        # Connect to database
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            database=db_name,
            user=db_user,
            password=db_password,
            sslmode='require',
            connect_timeout=30
        )

        print("✅ Connected successfully\n")

        # Read migration file
        migration_path = Path(__file__).parent.parent / "supabase" / "migrations" / "002_refined_schema.sql"
        with open(migration_path, 'r', encoding='utf-8') as f:
            migration_sql = f.read()

        print("Applying migration...\n")

        # Execute migration
        cursor = conn.cursor()
        cursor.execute(migration_sql)
        conn.commit()

        print("✅ Migration applied successfully\n")

        # Verify tables
        cursor.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name IN ('organization', 'review_session', 'payroll_delta', 'material_judgement', 'approval')
            ORDER BY table_name
        """)

        tables = cursor.fetchall()

        print("Tables created:")
        for table in tables:
            print(f"  ✅ {table[0]}")

        if len(tables) == 5:
            print("\n✅ All required tables exist\n")
        else:
            print(f"\n⚠️  Expected 5 tables, found {len(tables)}\n")

        cursor.close()
        conn.close()

    except psycopg2.OperationalError as e:
        print(f"❌ Connection failed: {e}")
        print("\nPossible issues:")
        print("  1. Database is paused (activate it in Supabase dashboard)")
        print("  2. Incorrect connection details")
        print("  3. Firewall blocking connection")
        print("  4. SSL/TLS configuration issue")
        sys.exit(1)

    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
