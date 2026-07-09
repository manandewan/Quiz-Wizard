const { Client } = require('pg');
const dns = require('dns');

const regions = [
  'ap-south-1',     // Mumbai
  'ap-southeast-1', // Singapore
  'us-east-1',      // N. Virginia
  'us-east-2',      // Ohio
  'us-west-1',      // N. California
  'eu-west-1',      // Ireland
  'eu-central-1'    // Frankfurt
];

async function testRegion(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  console.log(`Testing region ${region} (${host})...`);
  
  // Resolve DNS first to check if host exists
  try {
    const addresses = await new Promise((resolve, reject) => {
      dns.resolve4(host, (err, addrs) => err ? reject(err) : resolve(addrs));
    });
    console.log(`  DNS Succeeded: ${addresses.join(', ')}`);
  } catch (err) {
    console.log(`  DNS Failed: ${err.message}`);
    return false;
  }

  const connectionString = `postgresql://postgres.ecqeseqnrqgyrqxlpgls:imsludhiana%402026@${host}:6543/postgres`;
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000
  });

  try {
    await client.connect();
    console.log(`  SUCCESS! Connected to database in ${region}!`);
    await client.end();
    return true;
  } catch (err) {
    console.log(`  Connection Failed: ${err.message}`);
    return false;
  }
}

async function main() {
  for (const region of regions) {
    const success = await testRegion(region);
    if (success) {
      console.log(`\nFound matching database pooler host: aws-0-${region}.pooler.supabase.com`);
      break;
    }
  }
}

main();
