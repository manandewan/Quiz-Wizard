const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection details
const connectionString = 'postgresql://postgres:imsludhiana%402026@db.ecqeseqnrqgyrqxlpgls.supabase.co:5432/postgres';

async function main() {
  console.log('Connecting to Supabase Database...');
  const client = new Client({
    connectionString: connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected successfully!');

    const schemaPath = path.join(__dirname, '../schema.sql');
    console.log(`Reading schema from ${schemaPath}...`);
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Applying database schema migrations...');
    await client.query(schemaSql);
    console.log('Schema migrations applied successfully!');

    // Verify tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log('Available tables in public schema:');
    res.rows.forEach(row => console.log(`- ${row.table_name}`));

  } catch (err) {
    console.error('Error executing schema migration:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

main();
