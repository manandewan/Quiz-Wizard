'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { teacherLogin } from '@/app/actions/auth';

export default function TeacherLoginPage() {
  const router = useRouter();
  const [teacherId, setTeacherId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!teacherId.trim() || !password) {
      setError('Please enter both Teacher ID and password.');
      setLoading(false);
      return;
    }

    try {
      const result = await teacherLogin(teacherId, password);
      if (result.success) {
        router.push('/admin');
      } else {
        setError(result.error || 'Invalid credentials.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col justify-center items-center px-4 py-16 relative overflow-hidden bg-slate-950">
      {/* Background glow effects */}
      <div className="absolute top-1/3 right-1/3 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 left-1/3 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            Teacher Administration
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Configure Aptitude Questions & Manage Portal
          </p>
        </div>

        <div className="glass-panel rounded-2xl p-8 shadow-2xl relative">
          <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
          
          <h2 className="text-lg font-semibold text-slate-200 mb-6 text-center">
            Sign In with Teacher Credentials
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6" id="teacher-login-form">
            {error && (
              <div 
                className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm animate-pulse-slow"
                id="admin-error-msg"
              >
                {error}
              </div>
            )}

            {/* Teacher ID Input */}
            <div className="space-y-1.5">
              <label htmlFor="teacherId" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Teacher ID
              </label>
              <input
                type="text"
                id="teacherId"
                name="teacherId"
                required
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                placeholder="e.g. imsludhiana"
                className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                disabled={loading}
              />
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="admin-submit-btn"
              disabled={loading}
              className="w-full py-3.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Authenticating...' : 'Sign In as Teacher'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
