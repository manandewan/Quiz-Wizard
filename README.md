# Aptify (QuizWizard)

A high-performance, mobile-first web application designed for students to attempt daily aptitude questions (Quantitative Aptitude & Verbal Ability) and for teachers to publish, manage, and analyze performance in real-time.

---

## Short Summary
Aptify is a responsive, dark-mode test preparation portal built with Next.js and Supabase (PostgreSQL). It provides students with a frictionless registration flow, a unified question feed with instant correct-answer breakdown reviews, and a global leaderboard. For educators, Aptify offers a comprehensive Analytics Dashboard displaying registration metrics, question-by-question selection distributions, and cascade-safe deletion mechanisms to manage questions and attempts dynamically.

---

## Detailed Features

### 1. Student Portal (Mobile-First Experience)
*   **Frictionless Authentication**: Students register or log back in using only their **Full Name** and a **4-digit PIN** (no emails or complex signup pages).
*   **Unified Question Feed**:
    *   Subject tabs are unified into a single stream, displaying both **QA (Quants)** and **VA/RC (Verbal)** questions.
    *   Cards are labeled with visual subject badges (Indigo `QA` and Purple `VA/RC`).
    *   **Double-Submit Guards**: Buttons are disabled immediately upon clicking to prevent spam attempts.
*   **Detailed Attempt History**:
    *   Students can review past attempts in the history tab.
    *   Displays their selected option text in Green (if correct) or Red (if incorrect) alongside the correct option text.
*   **Global Leaderboard**:
    *   Displays rankings of all students sorted by their total score.
    *   Includes inline ranking badges for the top three students (`Gold`, `Silver`, and `Bronze`).
    *   Highlights the active student's row without layout shifts.

### 2. Teacher Panel (Analytics & Operations)
*   **Teacher Credentials**: Accesses the panel securely using `imsludhiana` as the ID and `123456` as the password.
*   **Question Management**:
    *   Publish questions with rich text, 4 choices, and optional image uploads (validated client-side to be under 5MB).
    *   Delete questions cleanly. Deletion removes the question's image from Supabase storage and cascade-deletes attempts.
*   **Score Correction Trigger**:
    *   An `AFTER DELETE` database trigger (`trg_decrement_user_score`) monitors the attempts table. If an admin deletes a question, any correct student attempts for that question are wiped, and the respective students' `total_score` is automatically decremented to prevent score inflation.
*   **Interactive Analytics Dashboard**:
    *   **Quick Stats Summary**: Live counter cards for Registered Students, Published Questions, Total Attempts, and Class Accuracy Rate (%).
    *   **Performance Table**: Search, filter, and sort published questions by Date, Attempts, or Accuracy (with dynamic progress bars).
    *   **Option Distribution Modal**: View question-by-question selection choices (distribution counts for A, B, C, and D) represented as interactive progress bars.

### 3. Architecture & Security
*   **Edge Middleware Proxy (`src/proxy.ts`)**: Next.js 16 Edge middleware inspects JWT session tokens on incoming requests. Stale, expired, or invalid cookies are automatically deleted in the response before the page renders, preventing redirect loops or page crashes.
*   **Isolated Sessions**: Implements separate server-side handlers (`getCurrentStudent()` and `getCurrentTeacher()`) to ensure student and teacher cookie profiles never clash in the same browser session.

---

## Tech Stack
*   **Framework**: Next.js 16.2.10 (Turbopack compiler)
*   **Library**: React 19.2.4
*   **Styling**: TailwindCSS 4 (Utility-first CSS)
*   **Database**: Supabase PostgreSQL (Managed cloud instance)
*   **Token Verification**: JWT (JSON Web Tokens) with Cookies
*   **Database Client**: `pg` (Node-Postgres) for raw SQL triggers and migrations

---

## Database Schema

```sql
-- 1. Users table (Stores both Student and Teacher records)
CREATE TABLE public.users (
  id uuid default gen_random_uuid() primary key,
  name text unique not null,
  role text not null check (role in ('student', 'teacher')),
  pin_hash text,
  total_score integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Questions table
CREATE TABLE public.questions (
  id uuid default gen_random_uuid() primary key,
  category text not null check (category in ('Quants', 'VA/RC')),
  text_content text,
  image_url text,
  options text[] not null,
  correct_option_index integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Attempts table
CREATE TABLE public.attempts (
  id uuid default gen_random_uuid() primary key,
  student_id uuid references public.users(id) on delete cascade not null,
  question_id uuid references public.questions(id) on delete cascade not null,
  selected_option_index integer not null,
  is_correct boolean not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(student_id, question_id)
);
```

---

## Local Development Setup

### 1. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
JWT_SECRET=your-secure-jwt-secret-key-string
TEACHER_ID=imsludhiana
TEACHER_PASSWORD=123456
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the portal.

### 4. Build for Production
```bash
npm run build
npm run start
```
