const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ecqeseqnrqgyrqxlpgls.supabase.co';
const supabaseAnonKey = 'sb_publishable_iEwDV7E6rknzzSktkxrRtg_GLdAexpu';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('1. Querying public.questions...');
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false });

  if (qError) {
    console.error('Questions error:', qError);
  } else {
    console.log(`Success: fetched ${questions.length} questions.`);
  }

  console.log('2. Querying public.attempts...');
  const { data: attempts, error: aError } = await supabase
    .from('attempts')
    .select('*')
    .order('created_at', { ascending: false });

  if (aError) {
    console.error('Attempts error:', aError);
  } else {
    console.log(`Success: fetched ${attempts.length} attempts.`);
  }

  console.log('3. Querying public.users (students)...');
  const { data: students, error: sError } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'student')
    .order('created_at', { ascending: false });

  if (sError) {
    console.error('Users error:', sError);
  } else {
    console.log(`Success: fetched ${students.length} students.`);
  }
}

main();
