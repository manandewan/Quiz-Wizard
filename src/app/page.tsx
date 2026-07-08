'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { studentLogin } from '@/app/actions/auth';

export default function StudentLoginPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validation checks
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      setLoading(false);
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits.');
      setLoading(false);
      return;
    }

    try {
      const result = await studentLogin(fullName, pin);
      if (result.success) {
        router.push('/student/feed');
      } else {
        setError(result.error || 'Authentication failed.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col justify-center items-center px-4 py-16 relative overflow-hidden bg-slate-950">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md animate-fade-in z-10">
        {/* Title / Branding */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            IMS Ludhiana Present's QuizWizard
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Practice Aptitude Questions In Real Time
          </p>
        </div>

        {/* Login Box */}
        <div className="glass-panel rounded-2xl p-8 shadow-2xl relative">
          <div className="absolute -top-px left-10 right-10 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
          
          <h2 className="text-xl font-semibold text-slate-200 mb-6 text-center">
            Student Portal
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6" id="student-login-form">
            {error && (
              <div 
                className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm animate-pulse-slow"
                id="login-error-msg"
              >
                {error}
              </div>
            )}

            {/* Name Input */}
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Full Name
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Jane Doe"
                className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                disabled={loading}
              />
            </div>

            {/* PIN Input */}
            <div className="space-y-1.5">
              <label htmlFor="pin" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                4-Digit Secret PIN
              </label>
              <input
                type="password"
                id="pin"
                name="pin"
                required
                maxLength={4}
                pattern="\d{4}"
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 4) setPin(val);
                }}
                placeholder="••••"
                className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 tracking-widest text-center text-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                disabled={loading}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="login-submit-btn"
              disabled={loading}
              className="w-full py-3.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Entering Portal...' : 'Continue to Questions'}
            </button>
          </form>

          {/* Frictionless Login Notice */}
          <div className="text-center mt-6">
            <p className="text-xs text-slate-500 leading-relaxed">
              No registration needed. If you enter a new name, we will create your account instantly. Remember your name and PIN to log back in!
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
