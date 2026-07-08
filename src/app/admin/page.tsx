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
  const { data: questions, error } = await supabase
    .from('questions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching questions for dashboard:', error);
  }

  return (
    <TeacherDashboard
      initialQuestions={questions || []}
      user={user as any}
    />
  );
}
