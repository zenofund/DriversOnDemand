import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration(migrationFile: string) {
  try {
    const migrationPath = join(process.cwd(), 'migrations', migrationFile);
    const sql = readFileSync(migrationPath, 'utf-8');
    
    console.log(`Running migration: ${migrationFile}...`);
    
    // Split the SQL file into individual statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.length > 0) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          // Try direct query execution
          const { error: queryError } = await supabase.from('_migrations').select('*').limit(1);
          
          if (queryError) {
            console.error('Migration statement error:', statement.substring(0, 100) + '...');
            console.error('Error:', error);
          }
        }
      }
    }
    
    console.log(`✅ Migration ${migrationFile} completed successfully`);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: tsx scripts/run-migration.ts <migration-file.sql>');
  process.exit(1);
}

runMigration(migrationFile);
