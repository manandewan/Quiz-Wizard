const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');

// Load env variables
const supabaseUrl = 'https://ecqeseqnrqgyrqxlpgls.supabase.co';
const supabaseAnonKey = 'sb_publishable_iEwDV7E6rknzzSktkxrRtg_GLdAexpu';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testTeacherLogin() {
  console.log('Testing Database lookup for Teacher role...');
  
  try {
    // Perform same query as teacherLogin
    const { data: user, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'teacher')
      .maybeSingle();

    if (dbError) {
      console.error('Database query failed:', dbError);
      return;
    }

    console.log('Teacher User query succeeded! Result:', user);

    if (!user) {
      console.log('Teacher user does not exist in DB. We would create a default one.');
      // Test insertion
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: 'd3b07384-d113-4e4e-9c76-2e8b61c94441',
          name: 'Teacher Admin',
          role: 'teacher',
          total_score: 0,
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Insert test failed:', insertError);
      } else {
        console.log('Insert test succeeded!', newUser);
      }
    } else {
      console.log('Teacher user exists, login check passed.');
    }

  } catch (err) {
    console.error('Unexpected script error:', err);
  }
}

testTeacherLogin();
