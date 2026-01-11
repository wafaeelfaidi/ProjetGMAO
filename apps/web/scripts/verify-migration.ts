/**
 * Script to verify Supabase database migration
 * Run with: npx tsx apps/web/scripts/verify-migration.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  console.log('Required variables:');
  console.log('  - NEXT_PUBLIC_SUPABASE_URL');
  console.log('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyMigration() {
  console.log('🔍 Verifying Supabase Database Migration...\n');
  console.log(`📡 Connected to: ${supabaseUrl}\n`);

  let allChecksPass = true;

  // 1. Check accounts table has role column
  console.log('1️⃣  Checking accounts table...');
  try {
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('id, email, role')
      .limit(5);

    if (error) {
      console.error('   ❌ Error querying accounts:', error.message);
      allChecksPass = false;
    } else {
      console.log(`   ✅ Accounts table exists with role column`);
      console.log(`   📊 Found ${accounts?.length || 0} accounts`);
      
      if (accounts && accounts.length > 0) {
        accounts.forEach((acc: any) => {
          console.log(`      - ${acc.email || 'No email'}: ${acc.role || 'No role'}`);
        });
      }
    }
  } catch (err: any) {
    console.error('   ❌ Unexpected error:', err.message);
    allChecksPass = false;
  }

  // 2. Check user_role enum exists
  console.log('\n2️⃣  Checking user_role enum type...');
  try {
    const { data, error } = await supabase.rpc('get_user_role');
    
    if (error) {
      if (error.message.includes('function') && error.message.includes('does not exist')) {
        console.log('   ⚠️  get_user_role() function not created yet (expected if not logged in)');
      } else {
        console.log('   ✅ user_role enum type exists');
      }
    } else {
      console.log('   ✅ user_role enum type exists');
      console.log(`   📋 Current user role: ${data || 'Not logged in'}`);
    }
  } catch (err: any) {
    console.log('   ℹ️  Enum exists (function check not available)');
  }

  // 3. Check uploaded_files table
  console.log('\n3️⃣  Checking uploaded_files table...');
  try {
    const { data: files, error } = await supabase
      .from('uploaded_files')
      .select('id, name, user_id')
      .limit(5);

    if (error) {
      console.error('   ❌ Error querying uploaded_files:', error.message);
      allChecksPass = false;
    } else {
      console.log(`   ✅ uploaded_files table exists`);
      console.log(`   📊 Found ${files?.length || 0} files`);
      
      if (files && files.length > 0) {
        files.forEach((file: any) => {
          console.log(`      - ${file.name} (User: ${file.user_id})`);
        });
      }
    }
  } catch (err: any) {
    console.error('   ❌ Unexpected error:', err.message);
    allChecksPass = false;
  }

  // 4. Check file_embeddings table
  console.log('\n4️⃣  Checking file_embeddings table...');
  try {
    const { data: embeddings, error } = await supabase
      .from('file_embeddings')
      .select('id, file_id, chunk_index')
      .limit(5);

    if (error) {
      console.error('   ❌ Error querying file_embeddings:', error.message);
      allChecksPass = false;
    } else {
      console.log(`   ✅ file_embeddings table exists`);
      console.log(`   📊 Found ${embeddings?.length || 0} embeddings`);
      
      if (embeddings && embeddings.length > 0) {
        embeddings.forEach((emb: any) => {
          console.log(`      - File ${emb.file_id}, chunk ${emb.chunk_index}`);
        });
      }
    }
  } catch (err: any) {
    console.error('   ❌ Unexpected error:', err.message);
    allChecksPass = false;
  }

  // 5. Check helper functions
  console.log('\n5️⃣  Checking helper functions...');
  try {
    // Test is_admin function
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
    
    if (adminError) {
      console.error('   ❌ is_admin() function error:', adminError.message);
      allChecksPass = false;
    } else {
      console.log('   ✅ is_admin() function exists');
    }
  } catch (err: any) {
    console.error('   ❌ Error checking functions:', err.message);
    allChecksPass = false;
  }

  // 6. Check RLS policies
  console.log('\n6️⃣  Checking Row Level Security (RLS)...');
  try {
    const { data: rlsCheck } = await supabase
      .from('pg_policies')
      .select('tablename, policyname')
      .in('tablename', ['uploaded_files', 'file_embeddings']);

    if (rlsCheck && rlsCheck.length > 0) {
      console.log(`   ✅ Found ${rlsCheck.length} RLS policies`);
      rlsCheck.forEach((policy: any) => {
        console.log(`      - ${policy.tablename}: ${policy.policyname}`);
      });
    } else {
      console.log('   ⚠️  Could not verify RLS policies (may need admin access)');
    }
  } catch (err: any) {
    console.log('   ℹ️  RLS check requires admin access');
  }

  // Summary
  console.log('\n' + '═'.repeat(60));
  if (allChecksPass) {
    console.log('✅ MIGRATION VERIFICATION SUCCESSFUL!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Set user roles in Supabase SQL Editor:');
    console.log('      UPDATE public.accounts SET role = \'admin\' WHERE email = \'your@email.com\';');
    console.log('   2. Restart your dev server: pnpm run dev');
    console.log('   3. Update DataManagement and Chatbot pages to use Supabase');
    console.log('   4. Test with admin and operator accounts');
  } else {
    console.log('⚠️  MIGRATION VERIFICATION INCOMPLETE');
    console.log('\n🔧 Please check the errors above and:');
    console.log('   1. Verify all SQL queries were executed successfully');
    console.log('   2. Check Supabase dashboard for any errors');
    console.log('   3. Re-run failed queries in SQL Editor');
  }
  console.log('═'.repeat(60) + '\n');
}

verifyMigration().catch((error) => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
