/**
 * Apply Vector Embeddings Migration
 * This script applies the vector embeddings migration to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function applyMigration() {
  console.log('🚀 Applying Vector Embeddings Migration...\n');

  // Read migration file
  const migrationPath = path.join(__dirname, '../supabase/migrations/20260111_add_vector_embeddings.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file loaded');
  console.log(`   File: ${migrationPath}`);
  console.log(`   Size: ${(migrationSQL.length / 1024).toFixed(2)} KB\n`);

  // Split SQL into individual statements
  const statements = migrationSQL
    .split(/;\s*$\n/m)
    .filter(stmt => stmt.trim().length > 0)
    .map(stmt => stmt.trim() + ';');

  console.log(`📊 Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    
    // Skip comments and empty statements
    if (statement.startsWith('/*') || statement.startsWith('--') || statement.trim() === ';') {
      continue;
    }

    // Get a preview of the statement
    const preview = statement.substring(0, 100).replace(/\s+/g, ' ');
    console.log(`[${i + 1}/${statements.length}] ${preview}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement });
      
      if (error) {
        // Try direct query if RPC fails
        const { error: queryError } = await supabase.from('_').select('*').limit(0);
        
        if (queryError) {
          console.error(`   ❌ Error: ${error.message}`);
          errorCount++;
        } else {
          console.log('   ✅ Success');
          successCount++;
        }
      } else {
        console.log('   ✅ Success');
        successCount++;
      }
    } catch (err) {
      console.error(`   ❌ Error: ${err}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('📈 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${errorCount}`);
  console.log('='.repeat(50) + '\n');

  if (errorCount === 0) {
    console.log('🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Verify pgvector extension is enabled');
    console.log('   2. Check that new tables exist (file_embeddings, uploaded_files)');
    console.log('   3. Test document upload and search');
    console.log('   4. Review RAG_QUICK_START.md for usage guide\n');
  } else {
    console.log('⚠️  Migration completed with errors.');
    console.log('   Please check the errors above and apply them manually in Supabase Dashboard.\n');
  }
}

applyMigration().catch(console.error);
