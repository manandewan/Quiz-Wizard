import { redirect } from 'next/navigation';
import { getCurrentTeacher } from '@/app/actions/auth';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import TeacherDashboard from './TeacherDashboard';

// Ensure this route is server-rendered dynamically on request
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // 1. Authenticate user on server
  const user = await getCurrentTeacher();

  if (!user || user.role !== 'teacher') {
    redirect('/admin/login');
  }

  // 2. Fetch initial questions list from database
  let questions: any[] = [];
  try {
    const { data, error: qError } = await supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (qError) {
      console.error('Error fetching questions for dashboard:', qError);
    } else {
      questions = data || [];
    }
  } catch (err) {
    console.error('Connection error fetching questions for dashboard:', err);
  }

  // 3. Fetch initial attempts from database
  let attempts: any[] = [];
  try {
    const { data, error: aError } = await supabase
      .from('attempts')
      .select('*')
      .order('created_at', { ascending: false });

    if (aError) {
      console.error('Error fetching attempts for dashboard:', aError);
    } else {
      attempts = data || [];
    }
  } catch (err) {
    console.error('Connection error fetching attempts for dashboard:', err);
  }

  // 4. Fetch all student users
  let students: any[] = [];
  try {
    const { data, error: sError } = await supabase
      .from('users')
      .select('*')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (sError) {
      console.error('Error fetching students for dashboard:', sError);
    } else {
      students = data || [];
    }
  } catch (err) {
    console.error('Connection error fetching students for dashboard:', err);
  }

  return (
    <div className="teacher-theme min-h-screen bg-slate-950">
      <TeacherDashboard
        initialQuestions={questions || []}
        initialAttempts={attempts || []}
        initialStudents={students || []}
        user={user as any}
      />
    </div>
  );
}
