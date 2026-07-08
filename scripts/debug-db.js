const { Client } = require('pg');

const connectionString = 'postgresql://postgres:imsludhiana%402026@db.ecqeseqnrqgyrqxlpgls.supabase.co:5432/postgres';

async function main() {
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Database.');

    // 1. Check all users in public.users
    console.log('\n--- public.users contents ---');
    const usersRes = await client.query('SELECT * FROM public.users');
    console.log(usersRes.rows);

    // 2. Check auth.users contents
    console.log('\n--- auth.users contents ---');
    const authUsersRes = await client.query('SELECT id, email, created_at FROM auth.users');
    console.log(authUsersRes.rows);

    // 3. Test insert to public.users to see if there is an RLS/schema error
    console.log('\n--- Testing insert to public.users ---');
    try {
      const testInsert = await client.query(`
        INSERT INTO public.users (name, role, pin_hash, total_score)
        VALUES ('test_student_debug', 'student', 'test_hash', 0)
        RETURNING *
      `);
      console.log('Insert Succeeded:', testInsert.rows[0]);

      // Clean up test insert
      await client.query("DELETE FROM public.users WHERE name = 'test_student_debug'");
      console.log('Test insert cleaned up.');
    } catch (err) {
      console.error('Insert Failed with error:', err);
    }

  } catch (err) {
    console.error('Debug script error:', err);
  } finally {
    await client.end();
  }
}

main();
