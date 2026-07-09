import { NextResponse } from 'next/server';
import { Client } from 'pg';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Use the raw IPv6 address of the database directly in brackets to bypass DNS resolution blocks on Vercel
  const connectionString = 'postgresql://postgres:imsludhiana%402026@[2406:da12:1f1:f802:f106:b3c3:dec1:1215]:5432/postgres';
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  const logs: string[] = [];

  try {
    logs.push('Connecting to database directly via raw IPv6 address...');
    await client.connect();
    logs.push('Connected to Database successfully!');

    logs.push('1. Fixing decrement_user_score trigger function...');
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
    logs.push('Trigger function updated successfully.');

    logs.push('2. Enabling Supabase realtime publication for attempts and users tables...');
    try {
      await client.query('ALTER PUBLICATION supabase_realtime ADD TABLE public.attempts;');
      logs.push('Added public.attempts to realtime publication.');
    } catch (e: any) {
      logs.push(`Attempts realtime status: ${e.message}`);
    }

    try {
      await client.query('ALTER PUBLICATION supabase_realtime ADD TABLE public.users;');
      logs.push('Added public.users to realtime publication.');
    } catch (e: any) {
      logs.push(`Users realtime status: ${e.message}`);
    }

    logs.push('Database upgrades applied successfully!');
    return NextResponse.json({ success: true, logs });

  } catch (err: any) {
    logs.push(`Error executing database upgrade: ${err.message}`);
    return NextResponse.json({ success: false, error: err.message, logs }, { status: 500 });
  } finally {
    await client.end();
  }
}
