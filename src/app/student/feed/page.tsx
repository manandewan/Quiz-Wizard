import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import StudentFeed from './StudentFeed';

// Force dynamic page rendering on request
export const dynamic = 'force-dynamic';

export default async function StudentFeedPage() {
  // 1. Authenticate user on server side
  const student = await getCurrentUser();

  if (!student || student.role !== 'student') {
    redirect('/');
  }

  // 2. Fetch all questions (latest first)
  let questions: any[] = [];
  try {
    const { data, error: qError } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (qError) {
      console.error('Error fetching questions:', qError);
    } else {
      questions = data || [];
    }
  } catch (err) {
    console.error('Connection error fetching questions:', err);
  }

  // 3. Fetch attempts made by this student
  let attempts: any[] = [];
  try {
    const { data, error: aError } = await supabase
      .from('attempts')
      .select('id, question_id, is_correct, selected_option_index')
      .eq('student_id', student.id);

    if (aError) {
      console.error('Error fetching attempts:', aError);
    } else {
      attempts = data || [];
    }
  } catch (err) {
    console.error('Connection error fetching attempts:', err);
  }

  // 4. Fetch the student's actual current score
  let userRecord = null;
  try {
    const { data, error: uError } = await supabase
      .from('users')
      .select('total_score')
      .eq('id', student.id)
      .single();
    
    if (uError) {
      console.error('Error fetching student score:', uError);
    } else {
      userRecord = data;
    }
  } catch (err) {
    console.error('Connection error fetching student score:', err);
  }

  return (
    <StudentFeed
      initialQuestions={questions || []}
      initialAttempts={attempts || []}
      user={student}
      initialScore={userRecord?.total_score || 0}
    />
  );
}
