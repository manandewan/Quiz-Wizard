import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import TeacherDashboard from './TeacherDashboard';

// Ensure this route is server-rendered dynamically on request
export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  // 1. Authenticate user on server
  const user = await getCurrentUser();

  if (!user || user.role !== 'teacher') {
    const cookieStore = await cookies();
    cookieStore.delete('teacher-session');
    redirect('/admin/login');
  }

  // 2. Fetch initial questions list from database
  const { data: questions, error: qError } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false });

  if (qError) {
    console.error('Error fetching questions for dashboard:', qError);
  }

  // 3. Fetch initial attempts from database
  const { data: attempts, error: aError } = await supabase
    .from('attempts')
    .select('*')
    .order('created_at', { ascending: false });

  if (aError) {
    console.error('Error fetching attempts for dashboard:', aError);
  }

  // 4. Fetch all student users
  const { data: students, error: sError } = await supabase
    .from('users')
    .select('*')
    .eq('role', 'student')
    .order('created_at', { ascending: false });

  if (sError) {
    console.error('Error fetching students for dashboard:', sError);
  }

  return (
    <TeacherDashboard
      initialQuestions={questions || []}
      initialAttempts={attempts || []}
      initialStudents={students || []}
      user={user as any}
    />
  );
}
