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

    console.log('Altering questions table: dropping NOT NULL constraint on text_content...');
    await client.query(`
      ALTER TABLE public.questions ALTER COLUMN text_content DROP NOT NULL;
    `);
    console.log('Database constraint dropped successfully!');

  } catch (err) {
    console.error('Error altering table:', err);
  } finally {
    await client.end();
  }
}

main();
