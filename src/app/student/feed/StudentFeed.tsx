'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { studentLogout } from '@/app/actions/auth';
import { attemptQuestion } from '@/app/actions/questions';
import { supabase } from '@/lib/supabase';

interface Question {
  id: string;
  created_at: string;
  category: string;
  text_content: string | null;
  image_url: string | null;
  options: string[];
  correct_option_index: number;
}

interface Attempt {
  id: string;
  question_id: string;
  is_correct: boolean;
  selected_option_index: number;
}

interface StudentFeedProps {
  initialQuestions: Question[];
  initialAttempts: Attempt[];
  user: { id: string; name: string; role: string };
  initialScore: number;
}

export default function StudentFeed({
  initialQuestions,
  initialAttempts,
  user,
  initialScore,
}: StudentFeedProps) {
  const router = useRouter();

  // Core Data States
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [attempts, setAttempts] = useState<Attempt[]>(initialAttempts);
  const [score, setScore] = useState(initialScore);

  // Filter States
  const [activeFeedTab, setActiveFeedTab] = useState<'Fresh' | 'History'>('Fresh');

  // Interactive Question State (to track current clicks/loading)
  const [attemptingId, setAttemptingId] = useState<string | null>(null);
  const [justAnswered, setJustAnswered] = useState<Record<string, { selected: number; correct: number }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // 1. Subscribe to real-time questions updates
  useEffect(() => {
    const channel = supabase
      .channel('public:questions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        (payload) => {
          console.log('Realtime change received:', payload);
          if (payload.eventType === 'INSERT') {
            const newQuestion = payload.new as Question;
            setQuestions((prev) => {
              if (prev.some(q => q.id === newQuestion.id)) return prev;
              return [newQuestion, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedQuestion = payload.new as Question;
            setQuestions((prev) =>
              prev.map((q) => (q.id === updatedQuestion.id ? updatedQuestion : q))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedQuestion = payload.old as { id: string };
            setQuestions((prev) => prev.filter((q) => q.id !== deletedQuestion.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Logout handler
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await studentLogout();
      if (result.success) {
        router.push('/');
      } else {
        alert(result.error || 'Failed to log out.');
        setIsLoggingOut(false);
      }
    } catch (err) {
      console.error('Logout error:', err);
      alert('An error occurred during logout.');
      setIsLoggingOut(false);
    }
  };

  // Option Click handler
  const handleSelectOption = async (questionId: string, optionIdx: number) => {
    if (isLoading) return; // Prevent double submits
    setIsLoading(true);
    setAttemptingId(questionId);

    try {
      const result = await attemptQuestion(questionId, optionIdx);

      if (result.success && result.correctOptionIndex !== undefined) {
        // Record result locally to update the display immediately
        setJustAnswered((prev) => ({
          ...prev,
          [questionId]: {
            selected: optionIdx,
            correct: result.correctOptionIndex!,
          },
        }));

        // Increment score locally if correct
        if (result.isCorrect) {
          setScore((prev) => prev + 1);
        }
      } else {
        alert(result.error || 'Failed to submit attempt.');
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      alert('An error occurred while submitting your answer. Please try again.');
    } finally {
      setIsLoading(false);
      setAttemptingId(null);
    }
  };

  // 2. Classify and filter questions based on selection
  const attemptedIds = new Set(attempts.map((a) => a.question_id));

  // Fresh questions (not attempted yet; remains visible in feed until refresh)
  const freshQuestions = questions.filter(
    (q) => !attemptedIds.has(q.id)
  );

  // History questions (attempted, OR just answered)
  const historyQuestions = questions.filter(
    (q) => attemptedIds.has(q.id) || justAnswered[q.id]
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <header className="glass-panel sticky top-0 z-50 px-4 py-3 md:px-6 md:py-4 flex flex-col md:flex-row gap-3 md:gap-0 md:items-center md:justify-between shadow-md">
        {/* Row 1: Logo & Badge + Mobile Score */}
        <div className="flex items-center justify-between md:justify-start md:gap-3">
          <div className="flex items-center gap-2.5">
            <Link href="/student/feed" className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
              Aptify
            </Link>
            <span className="px-2 py-0.5 rounded-full text-[10px] md:text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Student Portal
            </span>
          </div>

          {/* Score Indicator (Mobile Only) */}
          <div className="md:hidden px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center gap-2">
            <span className="text-[10px] text-indigo-300 font-semibold uppercase tracking-wider">Score</span>
            <span className="text-sm font-bold text-indigo-200" id="header-score-value-mobile">{score}</span>
          </div>
        </div>
        
        {/* Row 2: User welcome + Navigation */}
        <div className="flex items-center justify-between md:justify-end gap-4 md:gap-6">
          <div className="text-left md:text-right">
            <span className="text-[10px] md:text-xs text-slate-400 block leading-tight">Welcome back,</span>
            <p className="text-xs md:text-sm font-semibold text-slate-200 leading-tight">{user.name}</p>
          </div>

          {/* Score Indicator (Desktop Only) */}
          <div className="hidden md:flex px-4 py-1.5 rounded-full bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 items-center gap-2">
            <span className="text-xs text-indigo-300 font-semibold uppercase tracking-wider">Score</span>
            <span className="text-base font-bold text-indigo-200" id="header-score-value">{score}</span>
          </div>

          <nav className="flex items-center gap-2 md:gap-3">
            <Link
              href="/student/leaderboard"
              className="px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-[10px] md:text-xs font-semibold active:scale-[0.97] transition-all"
            >
              Leaderboard
            </Link>
            <button
              onClick={handleLogout}
              id="student-logout-btn"
              disabled={isLoggingOut}
              className="px-2.5 py-1.5 md:px-3.5 md:py-2 rounded-lg bg-slate-900/60 border border-slate-800 hover:bg-slate-800 hover:text-slate-100 text-slate-400 text-[10px] md:text-xs font-semibold active:scale-[0.97] transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {isLoggingOut ? 'Logging out...' : 'Log Out'}
            </button>
          </nav>
        </div>
      </header>

      {/* Feed Sub-tab Filter Navigation */}
      <div className="max-w-3xl w-full mx-auto px-6 mt-8 flex justify-center">
        <div className="flex gap-4 border-b border-slate-900 pb-3 w-full">
          <button
            onClick={() => setActiveFeedTab('Fresh')}
            id="feed-tab-fresh"
            className={`pb-2 text-sm font-semibold relative transition-colors ${
              activeFeedTab === 'Fresh' ? 'text-indigo-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Fresh Questions
            {freshQuestions.length > 0 && (
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/20">
                {freshQuestions.length}
              </span>
            )}
            {activeFeedTab === 'Fresh' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveFeedTab('History')}
            id="feed-tab-history"
            className={`pb-2 text-sm font-semibold relative transition-colors ${
              activeFeedTab === 'History' ? 'text-indigo-400 font-bold' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            Attempt History
            {activeFeedTab === 'History' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Main Feed Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 space-y-6">
        
        {/* FRESH QUESTIONS TAB */}
        {activeFeedTab === 'Fresh' && (
          <div className="space-y-6">
            {freshQuestions.length === 0 ? (
              <div className="glass-panel rounded-xl p-12 text-center border border-slate-900">
                <p className="text-slate-400 text-sm font-medium">
                  🎉 Fantastic job! You have answered all available questions.
                </p>
                <div className="mt-6">
                  <Link 
                    href="/student/leaderboard" 
                    className="px-4 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-bold shadow-md shadow-indigo-500/10"
                  >
                    View Global Leaderboard
                  </Link>
                </div>
              </div>
            ) : (
              freshQuestions.map((q) => {
                const answerState = justAnswered[q.id];

                return (
                  <article 
                    key={q.id} 
                    className="glass-card rounded-xl p-6 border border-slate-800 animate-fade-in relative overflow-hidden"
                  >
                    {/* Pulsing "New" indicator for questions added in this session */}
                    <div className="absolute top-0 right-0 w-24 h-24 pointer-events-none overflow-hidden">
                      <div className="bg-indigo-500/10 text-indigo-400 text-[10px] font-bold py-1 text-center rotate-45 translate-x-7 translate-y-3 border-b border-indigo-500/20 w-32 select-none uppercase tracking-wider animate-pulse-slow">
                        New
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      {q.category === 'Quants' ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          QA
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          VA/RC
                        </span>
                      )}
                      <span className="text-xs text-slate-500 font-medium">
                        Posted {new Date(q.created_at).toLocaleDateString(undefined, { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>

                    {/* Question Content */}
                    {q.text_content && (
                      <h3 className="text-slate-100 font-medium text-base leading-relaxed mb-5 whitespace-pre-wrap">
                        {q.text_content}
                      </h3>
                    )}

                    {/* Question Image if present */}
                    {q.image_url && (
                      <div className="mb-5 rounded-lg overflow-hidden border border-slate-800 bg-slate-950/80 max-h-60 flex justify-center">
                        <img 
                          src={q.image_url} 
                          alt="Question Graphic" 
                          className="object-contain max-h-60 w-full"
                        />
                      </div>
                    )}

                    {/* Option Choices */}
                    <div className="space-y-2.5">
                      {q.options.map((opt, idx) => {
                        const isSelected = answerState?.selected === idx;
                        const isCorrect = answerState?.correct === idx;
                        const hasBeenAnswered = answerState !== undefined;

                        let optionStyle = 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300';
                        if (hasBeenAnswered) {
                          if (isCorrect) {
                            optionStyle = 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400 font-semibold';
                          } else if (isSelected) {
                            optionStyle = 'bg-rose-500/10 border-rose-500/35 text-rose-400 font-semibold';
                          } else {
                            optionStyle = 'bg-slate-950/50 border-slate-900 text-slate-600 opacity-60';
                          }
                        }

                        return (
                          <button
                            key={idx}
                            onClick={() => handleSelectOption(q.id, idx)}
                            disabled={hasBeenAnswered || isLoading}
                            className={`w-full px-4 py-3.5 rounded-lg border text-left text-sm transition-all active:scale-[0.99] flex items-center justify-between group ${optionStyle} disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            <span className="truncate pr-4">
                              <span className="font-bold text-slate-400 group-hover:text-slate-200 mr-2.5">
                                {String.fromCharCode(65 + idx)}
                              </span>
                              {opt}
                            </span>

                            {hasBeenAnswered && isCorrect && (
                              <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-500/25 px-2 py-0.5 rounded">
                                Correct
                              </span>
                            )}
                            {hasBeenAnswered && isSelected && !isCorrect && (
                              <span className="text-[10px] font-bold uppercase text-rose-400 bg-rose-500/25 px-2 py-0.5 rounded">
                                Incorrect
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </article>
                );
              })
            )}
          </div>
        )}

        {/* HISTORY TAB */}
        {activeFeedTab === 'History' && (
          <div className="space-y-6">
            {historyQuestions.length === 0 ? (
              <div className="glass-panel rounded-xl p-12 text-center text-slate-500 border border-slate-900">
                You haven't attempted any questions yet.
              </div>
            ) : (
              historyQuestions.map((q) => {
                // Find attempt in either attempts array or session-answered record
                const dbAttempt = attempts.find((a) => a.question_id === q.id);
                const localAttempt = justAnswered[q.id];

                const selectedIdx = dbAttempt !== undefined ? dbAttempt.selected_option_index : localAttempt?.selected;
                const correctIdx = q.correct_option_index;
                const wasCorrect = dbAttempt !== undefined ? dbAttempt.is_correct : (selectedIdx === correctIdx);

                return (
                  <div 
                    key={q.id} 
                    className="glass-card rounded-xl p-5 border border-slate-800 opacity-90"
                  >
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2">
                        {q.category === 'Quants' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                            QA
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            VA/RC
                          </span>
                        )}
                        <span className="text-xs text-slate-500 font-medium">
                          Attempted Question
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        wasCorrect 
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {wasCorrect ? 'Correct' : 'Incorrect'}
                      </span>
                    </div>

                    {q.text_content && (
                      <p className="text-slate-200 font-medium text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                        {q.text_content}
                      </p>
                    )}

                    {q.image_url && (
                      <div className="mb-4 rounded-lg overflow-hidden border border-slate-800 bg-slate-950/80 max-h-48 flex justify-center">
                        <img 
                          src={q.image_url} 
                          alt="Question Graphic" 
                          className="object-contain max-h-48"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      {q.options.map((opt, idx) => {
                        const isSelected = selectedIdx === idx;
                        const isCorrect = correctIdx === idx;

                        let style = 'bg-slate-900/60 border-slate-800/80 text-slate-500';
                        if (isCorrect) {
                          style = 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 font-semibold';
                        } else if (isSelected) {
                          style = 'bg-rose-500/10 border-rose-500/25 text-rose-400 font-semibold';
                        }

                        return (
                          <div
                            key={idx}
                            className={`px-4 py-3 rounded-lg border text-xs flex items-center justify-between ${style}`}
                          >
                            <span>
                              <span className="font-bold mr-2 text-slate-400">
                                {String.fromCharCode(65 + idx)}
                              </span>
                              {opt}
                            </span>
                            {isCorrect && (
                              <span className="text-[9px] font-bold uppercase text-emerald-400">
                                Correct Answer
                              </span>
                            )}
                            {isSelected && !isCorrect && (
                              <span className="text-[9px] font-bold uppercase text-rose-400">
                                Your Selection
                              </span>
                            )}
                            {isSelected && isCorrect && (
                              <span className="text-[9px] font-bold uppercase text-emerald-400">
                                Correct Selection
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-900 space-y-1.5">
                      <p className={`text-sm font-semibold ${wasCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Your Answer: {selectedIdx !== undefined ? String.fromCharCode(65 + selectedIdx) : ''}. {selectedIdx !== undefined ? q.options[selectedIdx] : ''}
                      </p>
                      {!wasCorrect && (
                        <p className="text-sm font-semibold text-emerald-400">
                          Correct Answer: {String.fromCharCode(65 + correctIdx)}. {q.options[correctIdx]}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}
