'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { teacherLogout } from '@/app/actions/auth';
import { createQuestion, deleteQuestion } from '@/app/actions/questions';
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
  user_id: string;
  question_id: string;
  selected_option_index: number;
  is_correct: boolean;
  created_at: string;
}

interface Student {
  id: string;
  name: string;
  total_score: number;
  created_at: string;
}

interface TeacherDashboardProps {
  initialQuestions: Question[];
  initialAttempts: Attempt[];
  initialStudents: Student[];
  user: { id: string; name: string; email: string };
}

export default function TeacherDashboard({
  initialQuestions,
  initialAttempts,
  initialStudents,
  user
}: TeacherDashboardProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core list states
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [attempts, setAttempts] = useState<Attempt[]>(initialAttempts);
  const [students, setStudents] = useState<Student[]>(initialStudents);

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'questions' | 'analytics'>('questions');

  // Interactive Analytics state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [sortBy, setSortBy] = useState<'date' | 'attempts' | 'accuracy'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedQuestionForMetrics, setSelectedQuestionForMetrics] = useState<Question | null>(null);

  // MCQ Creator Form states
  const [category, setCategory] = useState('Quants');
  const [textContent, setTextContent] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // UI state feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Real-time updates subscription for Questions, Attempts, and Student Users
  useEffect(() => {
    const channel = supabase
      .channel('teacher-dashboard-realtime-channel')
      // Questions Table Sync
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        (payload) => {
          console.log('Realtime question change:', payload);
          if (payload.eventType === 'INSERT') {
            const newQ = payload.new as Question;
            setQuestions((prev) => {
              if (prev.some((q) => q.id === newQ.id)) return prev;
              return [newQ, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedQ = payload.new as Question;
            setQuestions((prev) =>
              prev.map((q) => (q.id === updatedQ.id ? updatedQ : q))
            );
          } else if (payload.eventType === 'DELETE') {
            const deletedQ = payload.old as { id: string };
            setQuestions((prev) => prev.filter((q) => q.id !== deletedQ.id));
          }
        }
      )
      // Attempts Table Sync
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attempts' },
        (payload) => {
          console.log('Realtime attempt logged:', payload);
          const newAttempt = payload.new as Attempt;
          setAttempts((prev) => {
            if (prev.some((a) => a.id === newAttempt.id)) return prev;
            return [newAttempt, ...prev];
          });
        }
      )
      // Users (Students) Table Sync
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        (payload) => {
          console.log('Realtime user registration update:', payload);
          if (payload.eventType === 'INSERT') {
            const newUser = payload.new as Student;
            if (newUser.name && (newUser as any).role === 'student') {
              setStudents((prev) => {
                if (prev.some((s) => s.id === newUser.id)) return prev;
                return [newUser, ...prev];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedUser = payload.new as Student;
            if ((updatedUser as any).role === 'student') {
              setStudents((prev) =>
                prev.map((s) => (s.id === updatedUser.id ? updatedUser : s))
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      const result = await teacherLogout();
      if (result.success) {
        router.push('/admin/login');
      } else {
        setError(result.error || 'Failed to log out.');
        setIsLoggingOut(false);
      }
    } catch (err) {
      console.error('Logout error:', err);
      setError('An unexpected error occurred during logout.');
      setIsLoggingOut(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const options = [optionA, optionB, optionC, optionD];

    // Validation
    if (!textContent.trim() && !imageFile) {
      setError('Please enter question text or select an image.');
      setIsSubmitting(false);
      return;
    }
    if (options.some((opt) => !opt.trim())) {
      setError('All 4 options must be filled out.');
      setIsSubmitting(false);
      return;
    }

    // Image safety & type checks
    if (imageFile) {
      if (imageFile.size > 5 * 1024 * 1024) {
        const errorMsg = 'Image file size must be less than or equal to 5MB.';
        setError(errorMsg);
        alert(errorMsg);
        setIsSubmitting(false);
        return;
      }
      if (!imageFile.type.startsWith('image/')) {
        const errorMsg = 'Selected file must be of an image type.';
        setError(errorMsg);
        alert(errorMsg);
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const result = await createQuestion(
        category,
        textContent,
        options,
        correctOptionIndex,
        imageFile
      );

      if (result.success) {
        setSuccessMsg('Question published successfully!');

        // Reset form inputs
        setTextContent('');
        setOptionA('');
        setOptionB('');
        setOptionC('');
        setOptionD('');
        setCorrectOptionIndex(0);
        setImageFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';

        if (result.question) {
          const newQuestion = result.question as Question;
          setQuestions((prev) => {
            if (prev.some((q) => q.id === newQuestion.id)) return prev;
            return [newQuestion, ...prev];
          });
        }
        router.refresh();
      } else {
        setError(result.error || 'Failed to create question.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    setDeletingId(questionId);
    setError(null);
    setSuccessMsg(null);
    try {
      const result = await deleteQuestion(questionId);
      if (result.success) {
        setSuccessMsg('Question deleted successfully!');
        setQuestions((prev) => prev.filter((q) => q.id !== questionId));
        setAttempts((prev) => prev.filter((a) => a.question_id !== questionId));
        router.refresh();
      } else {
        setError(result.error || 'Failed to delete question.');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    } finally {
      setDeletingId(null);
    }
  };


  // --- Calculations for Analytics ---
  const stats = useMemo(() => {
    const totalSts = students.length;
    const totalQs = questions.length;
    const totalAtts = attempts.length;
    const correctAtts = attempts.filter((a) => a.is_correct).length;
    const accuracy = totalAtts === 0 ? 0 : Math.round((correctAtts / totalAtts) * 100);

    return { totalSts, totalQs, totalAtts, accuracy };
  }, [questions, attempts, students]);

  // Compile detailed analytics for each question
  const questionAnalytics = useMemo(() => {
    return questions.map((q) => {
      const qAttempts = attempts.filter((a) => a.question_id === q.id);
      const totalAttemptsCount = qAttempts.length;
      const correctAttemptsCount = qAttempts.filter((a) => a.is_correct).length;
      const accuracyRate = totalAttemptsCount === 0 ? 0 : Math.round((correctAttemptsCount / totalAttemptsCount) * 100);

      // Identify most popular selection index
      let popularIndex = -1;
      let maxCount = -1;
      const optionsCount = [0, 0, 0, 0];
      qAttempts.forEach((a) => {
        if (a.selected_option_index >= 0 && a.selected_option_index <= 3) {
          optionsCount[a.selected_option_index]++;
        }
      });
      optionsCount.forEach((cnt, idx) => {
        if (cnt > maxCount) {
          maxCount = cnt;
          popularIndex = idx;
        }
      });

      return {
        ...q,
        totalAttempts: totalAttemptsCount,
        accuracy: accuracyRate,
        popularChoice: maxCount > 0 ? String.fromCharCode(65 + popularIndex) : 'N/A',
        optionDistribution: optionsCount
      };
    });
  }, [questions, attempts]);

  // Filter and sort questions list for table
  const filteredAndSortedQuestions = useMemo(() => {
    let result = [...questionAnalytics];

    // Search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (q) =>
          (q.text_content && q.text_content.toLowerCase().includes(term)) ||
          q.options.some((opt) => opt.toLowerCase().includes(term))
      );
    }

    // Category filter
    if (categoryFilter !== 'All') {
      result = result.filter((q) => q.category === categoryFilter);
    }

    // Sorting logic
    result.sort((a, b) => {
      let valA: any = a.created_at;
      let valB: any = b.created_at;

      if (sortBy === 'attempts') {
        valA = a.totalAttempts;
        valB = b.totalAttempts;
      } else if (sortBy === 'accuracy') {
        valA = a.accuracy;
        valB = b.accuracy;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [questionAnalytics, searchTerm, categoryFilter, sortBy, sortOrder]);

  // Question details metrics
  const selectedQuestionMetricsDetails = useMemo(() => {
    if (!selectedQuestionForMetrics) return null;
    const q = selectedQuestionForMetrics;
    const qAttempts = attempts.filter((a) => a.question_id === q.id);
    const totalAtts = qAttempts.length;

    const distribution = [0, 0, 0, 0].map((_, idx) => {
      const count = qAttempts.filter((a) => a.selected_option_index === idx).length;
      const pct = totalAtts === 0 ? 0 : Math.round((count / totalAtts) * 100);
      return { count, pct };
    });

    return {
      total: totalAtts,
      correct: qAttempts.filter((a) => a.is_correct).length,
      distribution
    };
  }, [selectedQuestionForMetrics, attempts]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navigation */}
      <header className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Aptify
          </span>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Teacher Portal
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-slate-200">{user.name}</p>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
          <button
            onClick={handleLogout}
            id="admin-logout-btn"
            disabled={isLoggingOut}
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold active:scale-[0.97] transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {isLoggingOut ? 'Logging out...' : 'Log Out'}
          </button>
        </div>
      </header>

      {/* Tab Switcher Controls */}
      <div className="max-w-7xl w-full mx-auto px-6 pt-6 flex gap-3 z-10">
        <button
          onClick={() => setActiveTab('questions')}
          className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border active:scale-[0.98] transition-all flex items-center gap-2 ${
            activeTab === 'questions'
              ? 'bg-purple-600/15 text-purple-400 border-purple-500/30'
              : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Manage Questions
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-5 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider border active:scale-[0.98] transition-all flex items-center gap-2 ${
            activeTab === 'analytics'
              ? 'bg-purple-600/15 text-purple-400 border-purple-500/30'
              : 'bg-slate-900/60 text-slate-400 border-slate-800/80 hover:bg-slate-800 hover:text-slate-200'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Analytics Dashboard
        </button>
      </div>

      {/* Dynamic Main Body */}
      {activeTab === 'questions' ? (
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 z-10">
          {/* Left Column: MCQ Creator Form */}
          <section className="lg:col-span-5 space-y-6">
            <div className="glass-panel rounded-xl p-6 shadow-xl relative">
              <div className="absolute -top-px left-8 right-8 h-px bg-gradient-to-r from-transparent via-purple-500 to-transparent" />
              
              <h2 className="text-lg font-bold text-slate-200 mb-6">
                Create New Multiple Choice Question
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5" id="mcq-creation-form">
                {error && (
                  <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm animate-pulse-slow">
                    {error}
                  </div>
                )}
                {successMsg && (
                  <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
                    {successMsg}
                  </div>
                )}

                {/* Category Dropdown */}
                <div className="space-y-1.5">
                  <label htmlFor="category" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Category
                  </label>
                  <select
                    id="category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors disabled:opacity-50"
                  >
                    <option value="Quants">Quants (Quantitative Aptitude)</option>
                    <option value="VA/RC">VA/RC (Verbal Ability & Reading Comprehension)</option>
                  </select>
                </div>

                {/* Question Text */}
                <div className="space-y-1.5">
                  <label htmlFor="questionText" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Question Content
                  </label>
                  <textarea
                    id="questionText"
                    rows={4}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Type the question details here..."
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors resize-none disabled:opacity-50"
                  />
                </div>

                {/* Optional Image Upload */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Optional Image Attachment
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="file"
                      id="imageUpload"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      disabled={isSubmitting}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isSubmitting}
                      className="px-4 py-2.5 rounded-lg bg-slate-900 hover:bg-slate-855 border border-slate-800 text-slate-300 text-xs font-semibold active:scale-[0.97] transition-all disabled:opacity-50 disabled:pointer-events-none"
                    >
                      Select File
                    </button>
                    <span className="text-xs text-slate-400 truncate max-w-[200px]">
                      {imageFile ? imageFile.name : 'No image selected'}
                    </span>
                  </div>
                </div>

                {/* Options Inputs */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    Answer Options
                  </label>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold">A</span>
                    <input
                      type="text"
                      required
                      value={optionA}
                      onChange={(e) => setOptionA(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Enter option A content"
                      className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm transition-colors disabled:opacity-50"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold">B</span>
                    <input
                      type="text"
                      required
                      value={optionB}
                      onChange={(e) => setOptionB(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Enter option B content"
                      className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm transition-colors disabled:opacity-50"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold">C</span>
                    <input
                      type="text"
                      required
                      value={optionC}
                      onChange={(e) => setOptionC(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Enter option C content"
                      className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm transition-colors disabled:opacity-50"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xs font-bold">D</span>
                    <input
                      type="text"
                      required
                      value={optionD}
                      onChange={(e) => setOptionD(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Enter option D content"
                      className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-sm transition-colors disabled:opacity-50"
                    />
                  </div>
                </div>

                {/* Correct Answer Selection */}
                <div className="space-y-1.5">
                  <label htmlFor="correctAnswer" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Correct Answer
                  </label>
                  <select
                    id="correctAnswer"
                    value={correctOptionIndex}
                    onChange={(e) => setCorrectOptionIndex(parseInt(e.target.value))}
                    disabled={isSubmitting}
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors disabled:opacity-50"
                  >
                    <option value={0}>Option A is Correct</option>
                    <option value={1}>Option B is Correct</option>
                    <option value={2}>Option C is Correct</option>
                    <option value={3}>Option D is Correct</option>
                  </select>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold text-sm shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Question'}
                </button>
              </form>
            </div>
          </section>

          {/* Right Column: Published Questions Feed */}
          <section className="lg:col-span-7 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                Published Questions
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400">
                  {questions.length}
                </span>
              </h2>
            </div>

            <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
              {questions.length === 0 ? (
                <div className="glass-panel rounded-xl p-12 text-center text-slate-500">
                  <p className="text-sm font-medium">No questions published yet.</p>
                  <p className="text-xs text-slate-600 mt-1">Use the form on the left to create your first question.</p>
                </div>
              ) : (
                questions.map((q) => (
                  <div key={q.id} className="glass-panel rounded-xl p-5 border border-slate-800/80 shadow-md relative group">
                    <div className="flex items-center justify-between mb-3.5">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {q.category === 'Quants' ? 'Quants' : 'Verbal'}
                        </span>
                        <button
                          onClick={() => handleDeleteQuestion(q.id)}
                          disabled={deletingId !== null}
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                        >
                          {deletingId === q.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-500 font-mono">
                        {new Date(q.created_at).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>

                    {/* Text Content */}
                    {q.text_content && (
                      <p className="text-slate-100 font-medium text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                        {q.text_content}
                      </p>
                    )}

                    {/* Question Image if present */}
                    {q.image_url && (
                      <div className="mb-4 rounded-lg overflow-hidden border border-slate-800/80 bg-slate-950 max-h-48 flex justify-center">
                        <img 
                          src={q.image_url} 
                          alt="Question Graphic" 
                          className="object-contain max-h-48 w-full"
                        />
                      </div>
                    )}

                    {/* Options List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                      {q.options.map((opt, idx) => {
                        const isCorrect = q.correct_option_index === idx;
                        return (
                          <div 
                            key={idx}
                            className={`px-3 py-2 rounded-lg text-xs flex items-center justify-between border ${
                              isCorrect 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-semibold' 
                                : 'bg-slate-900/60 text-slate-400 border-slate-800'
                            }`}
                          >
                            <span className="truncate pr-2">{String.fromCharCode(65 + idx)}. {opt}</span>
                            {isCorrect && (
                              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">
                                Correct
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </main>
      ) : (
        /* --- Analytics Dashboard View --- */
        <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6 z-10">
          
          {/* Quick Stats Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Registered Students */}
            <div className="glass-panel rounded-xl p-5 border border-slate-800/60 shadow-lg relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Students</p>
                <h3 className="text-2xl font-black text-slate-100 mt-0.5">{stats.totalSts}</h3>
              </div>
            </div>

            {/* Published Questions */}
            <div className="glass-panel rounded-xl p-5 border border-slate-800/60 shadow-lg relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Published Questions</p>
                <h3 className="text-2xl font-black text-slate-100 mt-0.5">{stats.totalQs}</h3>
              </div>
            </div>

            {/* Total Attempts */}
            <div className="glass-panel rounded-xl p-5 border border-slate-800/60 shadow-lg relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Attempts</p>
                <h3 className="text-2xl font-black text-slate-100 mt-0.5">{stats.totalAtts}</h3>
              </div>
            </div>

            {/* Global Accuracy */}
            <div className="glass-panel rounded-xl p-5 border border-slate-800/60 shadow-lg relative flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Global Accuracy Rate</p>
                <h3 className="text-2xl font-black text-slate-100 mt-0.5">{stats.accuracy}%</h3>
              </div>
            </div>
          </section>

          {/* Table Toolbar */}
          <section className="glass-panel rounded-xl p-4 border border-slate-800/60 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Box */}
            <div className="flex-1 relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500 pointer-events-none">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search questions or choices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-900 border border-slate-850 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm transition-colors"
              />
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Category:</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="All">All Categories</option>
                  <option value="Quants">Quants</option>
                  <option value="VA/RC">Verbal</option>
                </select>
              </div>

              {/* Sort By Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="date">Date Published</option>
                  <option value="attempts">Attempts Count</option>
                  <option value="accuracy">Accuracy Rate</option>
                </select>
                <button
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="p-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs active:scale-95 transition-all"
                  title="Toggle Sort Order"
                >
                  {sortOrder === 'asc' ? '▲' : '▼'}
                </button>
              </div>
            </div>
          </section>

          {/* Question Analytics Table List */}
          <section className="glass-panel rounded-xl overflow-hidden border border-slate-800/80 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-850 bg-slate-900/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Question Details</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4 text-center">Total Attempts</th>
                    <th className="px-6 py-4">Correct Rate</th>
                    <th className="px-6 py-4 text-center">Popular Choice</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-sm text-slate-300">
                  {filteredAndSortedQuestions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 font-medium">
                        No questions matched the selected criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedQuestions.map((q) => {
                      // Determine progress bar color based on accuracy rate
                      let barColor = 'bg-rose-500';
                      let textColor = 'text-rose-400';
                      if (q.accuracy >= 70) {
                        barColor = 'bg-emerald-500';
                        textColor = 'text-emerald-400';
                      } else if (q.accuracy >= 40) {
                        barColor = 'bg-amber-500';
                        textColor = 'text-amber-400';
                      }

                      return (
                        <tr key={q.id} className="hover:bg-slate-900/20 transition-colors">
                          {/* Question Details Preview */}
                          <td className="px-6 py-4 max-w-sm">
                            <div className="flex items-center gap-3">
                              {q.image_url && (
                                <div className="w-10 h-10 rounded border border-slate-800 bg-slate-950 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                  <img src={q.image_url} alt="thumbnail" className="object-cover w-full h-full" />
                                </div>
                              )}
                              <p className="line-clamp-2 text-slate-200 font-medium leading-relaxed">
                                {q.text_content || <span className="text-slate-500 italic text-xs">Graphic Only Question</span>}
                              </p>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                              {q.category === 'Quants' ? 'Quants' : 'Verbal'}
                            </span>
                          </td>

                          {/* Total Attempts */}
                          <td className="px-6 py-4 whitespace-nowrap text-center text-slate-100 font-semibold font-mono">
                            {q.totalAttempts}
                          </td>

                          {/* Correct Rate Percentage & Visual Progress Bar */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-mono font-bold ${textColor}`}>
                                {q.accuracy}%
                              </span>
                              <div className="w-24 h-1.5 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                                <div 
                                  className={`h-full rounded-full ${barColor}`} 
                                  style={{ width: `${q.accuracy}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Popular Choice Option */}
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-xs font-black text-slate-300 font-mono">
                              {q.popularChoice}
                            </span>
                          </td>

                          {/* Detailed Actions */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setSelectedQuestionForMetrics(q)}
                                className="px-3 py-1.5 rounded bg-purple-500/10 hover:bg-purple-500/25 border border-purple-500/20 text-purple-400 text-xs font-bold active:scale-95 transition-all"
                              >
                                Metrics
                              </button>
                              <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                disabled={deletingId !== null}
                                className="px-3 py-1.5 rounded bg-rose-500/10 hover:bg-rose-500/25 border border-rose-500/20 text-rose-400 text-xs font-bold active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
                              >
                                {deletingId === q.id ? 'Deleting...' : 'Delete'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      )}

      {/* --- Detailed Metrics Modal --- */}
      {selectedQuestionForMetrics && selectedQuestionMetricsDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="glass-panel rounded-xl p-6 max-w-lg w-full shadow-2xl relative border border-slate-800 animate-slide-up flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-850 mb-5">
              <h3 className="text-base font-bold text-slate-200">Question Metrics Breakdown</h3>
              <button
                onClick={() => setSelectedQuestionForMetrics(null)}
                className="w-7 h-7 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center text-sm font-semibold active:scale-90 transition-all"
              >
                ✕
              </button>
            </div>

            {/* Question Details Preview inside modal */}
            <div className="bg-slate-950/40 rounded-lg p-3 border border-slate-900 mb-5 max-h-36 overflow-y-auto custom-scrollbar">
              <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2 inline-block">
                {selectedQuestionForMetrics.category === 'Quants' ? 'Quants' : 'Verbal'}
              </span>
              {selectedQuestionForMetrics.text_content && (
                <p className="text-xs text-slate-300 font-medium leading-relaxed whitespace-pre-wrap">
                  {selectedQuestionForMetrics.text_content}
                </p>
              )}
              {selectedQuestionForMetrics.image_url && (
                <div className="mt-2 rounded overflow-hidden border border-slate-900 max-h-24 flex justify-center bg-slate-950">
                  <img src={selectedQuestionForMetrics.image_url} alt="preview" className="object-contain max-h-24" />
                </div>
              )}
            </div>

            {/* Detailed Attempt Stats Summary */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-850/80 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Total Attempts</p>
                <h4 className="text-lg font-bold text-slate-200 font-mono mt-0.5">{selectedQuestionMetricsDetails.total}</h4>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-850/80 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Correct</p>
                <h4 className="text-lg font-bold text-emerald-400 font-mono mt-0.5">{selectedQuestionMetricsDetails.correct}</h4>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-2.5 border border-slate-850/80 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-semibold">Incorrect</p>
                <h4 className="text-lg font-bold text-rose-400 font-mono mt-0.5">
                  {selectedQuestionMetricsDetails.total - selectedQuestionMetricsDetails.correct}
                </h4>
              </div>
            </div>

            {/* Option Selections Breakdown Bars */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">Selections Distribution</h4>
              
              {selectedQuestionForMetrics.options.map((opt, idx) => {
                const isCorrect = selectedQuestionForMetrics.correct_option_index === idx;
                const metrics = selectedQuestionMetricsDetails.distribution[idx];
                
                // Determine layout highlight
                const highlightBorder = isCorrect ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-slate-850 bg-slate-900/20';
                const pillColor = isCorrect ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-slate-800 text-slate-400';
                
                return (
                  <div key={idx} className={`p-3 rounded-xl border ${highlightBorder} space-y-2`}>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <div className="flex items-center gap-2 max-w-[70%]">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${pillColor}`}>
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="truncate text-slate-200">{opt}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {metrics.count} votes ({metrics.pct}%)
                      </span>
                    </div>

                    {/* Progress Bar representation */}
                    <div className="w-full h-2.5 rounded-full bg-slate-950/80 border border-slate-900 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isCorrect ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-gradient-to-r from-purple-500/40 to-pink-500/40'
                        }`}
                        style={{ width: `${metrics.pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Close Action Footer */}
            <div className="mt-6 pt-4 border-t border-slate-850 flex justify-end">
              <button
                onClick={() => setSelectedQuestionForMetrics(null)}
                className="px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-bold active:scale-95 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
