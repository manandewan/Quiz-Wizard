import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/actions/auth';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function LeaderboardPage() {
  // 1. Authenticate user (either student or teacher can see it)
  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }

  // 2. Fetch all student users ranked by score
  const { data: students, error } = await supabase
    .from('users')
    .select('id, name, total_score')
    .eq('role', 'student')
    .order('total_score', { ascending: false })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching leaderboard data:', error);
  }

  const list = students || [];

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Link 
            href={user.role === 'student' ? '/student/feed' : '/admin'} 
            className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent"
          >
            Aptify
          </Link>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Leaderboard
          </span>
        </div>

        <div>
          <Link
            href={user.role === 'student' ? '/student/feed' : '/admin'}
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold active:scale-[0.97] transition-all"
          >
            Back to Portal
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-6 space-y-6 z-10 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-500 bg-clip-text text-transparent">
            Top Performers
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Real-time rankings based on correctly answered questions
          </p>
        </div>

        {/* Leaderboard Table / Card */}
        <div className="glass-panel rounded-2xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-600" />
          
          <div className="p-6">
            {list.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                No student points logged yet. Be the first to attempt a question!
              </div>
            ) : (
              <div className="divide-y divide-slate-900">
                {list.map((student, index) => {
                  const rank = index + 1;
                  const isTop3 = rank <= 3;
                  const isSelf = student.id === user.id;

                  // Render badge style for top ranks
                  let rankBadge = (
                    <span className="text-sm font-bold text-slate-500 w-8 h-8 rounded-full flex items-center justify-center bg-slate-900 border border-slate-800/80">
                      {rank}
                    </span>
                  );
                  if (rank === 1) {
                    rankBadge = (
                      <span className="text-base font-bold text-yellow-300 w-8 h-8 rounded-full flex items-center justify-center bg-yellow-500/10 border border-yellow-500/30 shadow-md shadow-yellow-500/5 animate-pulse-slow">
                        🥇
                      </span>
                    );
                  } else if (rank === 2) {
                    rankBadge = (
                      <span className="text-base font-bold text-slate-200 w-8 h-8 rounded-full flex items-center justify-center bg-slate-200/10 border border-slate-200/30">
                        🥈
                      </span>
                    );
                  } else if (rank === 3) {
                    rankBadge = (
                      <span className="text-base font-bold text-amber-600 w-8 h-8 rounded-full flex items-center justify-center bg-amber-700/10 border border-amber-700/30">
                        🥉
                      </span>
                    );
                  }

                  return (
                    <div 
                      key={student.id} 
                      className={`flex items-center justify-between py-4 px-3 rounded-lg transition-colors ${
                        isSelf 
                          ? 'bg-indigo-500/5 border border-indigo-500/20 shadow-md' 
                          : 'hover:bg-slate-900/30'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {rankBadge}
                        <div>
                          <span className={`text-sm font-medium ${
                            isSelf ? 'text-indigo-400 font-bold' : 'text-slate-200'
                          }`}>
                            {student.name}
                          </span>
                          {isSelf && (
                            <span className="ml-2 text-[9px] font-bold uppercase text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded">
                              You
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-lg font-extrabold text-slate-100">{student.total_score}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                          Points
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
