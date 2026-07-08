'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { teacherLogout } from '@/app/actions/auth';
import { createQuestion } from '@/app/actions/questions';
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

interface TeacherDashboardProps {
  initialQuestions: Question[];
  user: { id: string; name: string; email: string };
}

export default function TeacherDashboard({ initialQuestions, user }: TeacherDashboardProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Questions state
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);

  // Form states
  const [category, setCategory] = useState('Quants');
  const [textContent, setTextContent] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel('teacher-dashboard-questions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'questions' },
        (payload) => {
          console.log('Realtime change received in dashboard:', payload);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    const result = await teacherLogout();
    if (result.success) {
      router.push('/admin/login');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const options = [optionA, optionB, optionC, optionD];

    // Validation
    if (!textContent.trim() && !imageFile) {
      setError('Please enter question text or select an image.');
      setLoading(false);
      return;
    }
    if (options.some(opt => !opt.trim())) {
      setError('All 4 options must be filled out.');
      setLoading(false);
      return;
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
        
        // Reset form
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Top Navigation */}
      <header className="glass-panel sticky top-0 z-50 px-6 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
            Aptify Admin
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
            className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-semibold active:scale-[0.97] transition-all"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
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
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value="Quants">Quants (Quantitative Aptitude)</option>
                  <option value="VA/RC">VA/RC (Verbal Ability & Reading Comp)</option>
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
                  placeholder="Type the question details here..."
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors resize-none"
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
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-800 transition-colors"
                  >
                    Select File
                  </button>
                  <span className="text-xs text-slate-400 truncate max-w-[200px]">
                    {imageFile ? imageFile.name : 'No image selected'}
                  </span>
                </div>
              </div>

              {/* 4 Options */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Answer Options
                </label>
                
                <div className="space-y-2">
                  <div className="flex gap-2 items-center">
                    <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center bg-slate-800 text-slate-400">A</span>
                    <input
                      type="text"
                      placeholder="Enter option A content"
                      value={optionA}
                      onChange={(e) => setOptionA(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center bg-slate-800 text-slate-400">B</span>
                    <input
                      type="text"
                      placeholder="Enter option B content"
                      value={optionB}
                      onChange={(e) => setOptionB(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center bg-slate-800 text-slate-400">C</span>
                    <input
                      type="text"
                      placeholder="Enter option C content"
                      value={optionC}
                      onChange={(e) => setOptionC(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                      required
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center bg-slate-800 text-slate-400">D</span>
                    <input
                      type="text"
                      placeholder="Enter option D content"
                      value={optionD}
                      onChange={(e) => setOptionD(e.target.value)}
                      className="flex-1 px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-600 text-sm focus:outline-none focus:border-purple-500 transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Correct Answer Selector */}
              <div className="space-y-1.5">
                <label htmlFor="correctOption" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Correct Answer
                </label>
                <select
                  id="correctOption"
                  value={correctOptionIndex}
                  onChange={(e) => setCorrectOptionIndex(parseInt(e.target.value))}
                  className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-purple-500 transition-colors"
                >
                  <option value={0}>Option A is Correct</option>
                  <option value={1}>Option B is Correct</option>
                  <option value={2}>Option C is Correct</option>
                  <option value={3}>Option D is Correct</option>
                </select>
              </div>

              {/* Submit button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold text-sm active:scale-[0.98] shadow-lg shadow-purple-500/10 transition-all disabled:opacity-50"
              >
                {loading ? 'Publishing MCQ...' : 'Publish Question'}
              </button>
            </form>
          </div>
        </section>

        {/* Right Column: Published Questions Feed */}
        <section className="lg:col-span-7 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
              Published Questions
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-400">
                {questions.length}
              </span>
            </h2>
          </div>

          <div className="space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-2">
            {questions.length === 0 ? (
              <div className="glass-panel rounded-xl p-12 text-center text-slate-500 border border-dashed border-slate-800">
                No questions have been published yet. Create one on the left to start!
              </div>
            ) : (
              questions.map((q) => (
                <div key={q.id} className="glass-card rounded-xl p-5 border border-slate-800 relative">
                  {/* Category Pill */}
                  <div className="flex items-center justify-between mb-3.5">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                      q.category === 'Quants' 
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {q.category}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(q.created_at).toLocaleDateString(undefined, { 
                        month: 'short', 
                        day: 'numeric', 
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
    </div>
  );
}
