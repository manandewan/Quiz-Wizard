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

    console.log('Checking RLS status on tables...');
    const statusRes = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename IN ('users', 'questions', 'attempts')
    `);
    statusRes.rows.forEach(row => {
      console.log(`Table ${row.tablename}: RLS is ${row.rowsecurity ? 'ENABLED' : 'DISABLED'}`);
    });

    console.log('Disabling RLS on tables...');
    await client.query(`
      ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.questions DISABLE ROW LEVEL SECURITY;
      ALTER TABLE public.attempts DISABLE ROW LEVEL SECURITY;
    `);
    console.log('RLS disabled successfully!');

    // Re-check
    const statusRes2 = await client.query(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' AND tablename IN ('users', 'questions', 'attempts')
    `);
    statusRes2.rows.forEach(row => {
      console.log(`Table ${row.tablename}: RLS is ${row.rowsecurity ? 'ENABLED' : 'DISABLED'}`);
    });

  } catch (err) {
    console.error('Error disabling RLS:', err);
  } finally {
    await client.end();
  }
}

main();
