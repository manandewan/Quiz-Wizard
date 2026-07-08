const { Client } = require('pg');

const connectionString = 'postgresql://postgres:imsludhiana%402026@db.ecqeseqnrqgyrqxlpgls.supabase.co:5432/postgres';

async function main() {
  console.log('Connecting to database to seed teacher user...');
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected!');

    // Generate a fixed UUID for the teacher so we can link auth.users and public.users
    const teacherId = 'd3b07384-d113-4e4e-9c76-2e8b61c94441';
    const email = 'teacher@testprep.com';
    const password = 'password123';

    console.log('Inserting teacher into auth.users...');
    
    // Check if user already exists in auth.users
    const checkAuth = await client.query('SELECT id FROM auth.users WHERE email = $1', [email]);
    
    if (checkAuth.rows.length === 0) {
      // We insert into auth.users. Supabase requires email, encrypted_password, email_confirmed_at, etc.
      // We use crypt() for password hashing.
      await client.query(`
        INSERT INTO auth.users (
          instance_id, id, aud, role, email, encrypted_password, 
          email_confirmed_at, recovery_sent_at, last_sign_in_at, 
          raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
          confirmation_token, email_change, email_change_token_new, recovery_token
        ) VALUES (
          '00000000-0000-0000-0000-000000000000',
          $1,
          'authenticated',
          'authenticated',
          $2,
          extensions.crypt($3, extensions.gen_salt('bf', 10)),
          now(),
          now(),
          now(),
          '{"provider":"email","providers":["email"]}',
          '{"role":"teacher"}',
          now(),
          now(),
          '',
          '',
          '',
          ''
        )
      `, [teacherId, email, password]);
      console.log('Teacher created in auth.users.');
    } else {
      console.log('Teacher already exists in auth.users.');
    }

    console.log('Inserting teacher into public.users...');
    await client.query(`
      INSERT INTO public.users (id, role, name, pin_hash, total_score)
      VALUES ($1, 'teacher', 'Teacher Admin', NULL, 0)
      ON CONFLICT (id) DO UPDATE SET name = 'Teacher Admin';
    `, [teacherId]);
    console.log('Teacher created/updated in public.users.');

    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Error seeding teacher user:', err);
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

main();
