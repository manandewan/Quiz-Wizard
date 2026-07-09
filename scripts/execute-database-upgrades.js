const { Client } = require('pg');

// Correct host for Seoul, South Korea (ap-northeast-2)
const connectionString = 'postgresql://postgres.ecqeseqnrqgyrqxlpgls:imsludhiana%402026@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

async function main() {
  console.log('Connecting to database via ap-northeast-2 (Seoul) IPv4 regional pooler (port 6543)...');
  const client = new Client({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to Database successfully!');

    console.log('1. Fixing decrement_user_score trigger function (using student_id)...');
    await client.query(`
      CREATE OR REPLACE FUNCTION decrement_user_score()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.is_correct = TRUE THEN
          UPDATE public.users
          SET total_score = GREATEST(0, total_score - 1)
          WHERE id = OLD.student_id;
        END IF;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('Trigger function updated successfully.');

    console.log('2. Enabling Supabase realtime publication for attempts and users tables...');
    try {
      await client.query('ALTER PUBLICATION supabase_realtime ADD TABLE public.attempts;');
      console.log('Added public.attempts to realtime publication.');
    } catch (e) {
      console.log('Attempts already in realtime publication or could not add:', e.message);
    }

    try {
      await client.query('ALTER PUBLICATION supabase_realtime ADD TABLE public.users;');
      console.log('Added public.users to realtime publication.');
    } catch (e) {
      console.log('Users already in realtime publication or could not add:', e.message);
    }

    console.log('Database upgrade completed successfully!');

  } catch (err) {
    console.error('Error executing database upgrade:', err);
  } finally {
    await client.end();
  }
}

main();
