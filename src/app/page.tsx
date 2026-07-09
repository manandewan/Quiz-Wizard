'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { studentLogin } from '@/app/actions/auth';

export default function StudentLoginPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedName = fullName.trim();
    setFullName(trimmedName);

    // Validation checks
    if (!trimmedName) {
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
      const result = await studentLogin(trimmedName, pin);
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
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Aptify
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
                onChange={(e) => setFullName(e.target.value.toLowerCase())}
                placeholder="e.g. jane doe"
                className="w-full px-4 py-3 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300 lowercase"
                disabled={loading}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
              />
            </div>

            {/* PIN Input */}
            <div className="space-y-1.5">
              <label htmlFor="pin" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                4-Digit Secret PIN
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  id="pin"
                  name="pin"
                  required
                  maxLength={4}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={pin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    if (val.length <= 4) setPin(val);
                  }}
                  placeholder="••••"
                  className="w-full pl-12 pr-12 py-3 rounded-lg bg-slate-900/80 border border-slate-800 text-slate-100 placeholder-slate-500 tracking-widest text-center text-lg focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all duration-300"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none select-none"
                  aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                >
                  {showPin ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 0 1-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="login-submit-btn"
              disabled={loading}
              className="w-full py-3.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 active:scale-[0.98] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none"
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
