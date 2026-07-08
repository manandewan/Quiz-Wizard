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

    console.log('Creating decrement_user_score trigger function...');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.decrement_user_score()
      RETURNS trigger AS $$
      BEGIN
        IF OLD.is_correct = true THEN
          UPDATE public.users 
          SET total_score = GREATEST(0, total_score - 1) 
          WHERE id = OLD.user_id;
        END IF;
        RETURN OLD;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('Creating after delete trigger...');
    await client.query(`
      DROP TRIGGER IF EXISTS trg_decrement_user_score ON public.attempts;
      
      CREATE TRIGGER trg_decrement_user_score
      AFTER DELETE ON public.attempts
      FOR EACH ROW EXECUTE FUNCTION public.decrement_user_score();
    `);

    console.log('Database trigger configured successfully!');

  } catch (err) {
    console.error('Error configuring trigger:', err);
  } finally {
    await client.end();
  }
}

main();
