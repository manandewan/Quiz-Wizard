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

    console.log('1. Wiping public.attempts...');
    await client.query('TRUNCATE TABLE public.attempts CASCADE;');

    console.log('2. Wiping public.questions...');
    await client.query('TRUNCATE TABLE public.questions CASCADE;');

    console.log('3. Deleting all users...');
    await client.query('DELETE FROM public.users;');

    console.log('4. Re-seeding default Teacher user...');
    await client.query(`
      INSERT INTO public.users (id, name, role, total_score)
      VALUES (
        'd3b07384-d113-4e4e-9c76-2e8b61c94441',
        'Teacher Admin',
        'teacher',
        0
      );
    `);

    console.log('Database reset completed successfully with clean slate!');

  } catch (err) {
    console.error('Error resetting database:', err);
  } finally {
    await client.end();
  }
}

main();
