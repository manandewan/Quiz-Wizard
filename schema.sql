-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Drop tables if they exist (for easy resetting)
drop table if exists attempts cascade;
drop table if exists questions cascade;
drop table if exists users cascade;

-- 2. Users Table
create table users (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('student', 'teacher')),
  name text not null unique,
  pin_hash text, -- Stores bcrypt hash of student PIN (null for teachers if they use standard Supabase Auth)
  total_score integer not null default 0,
  created_at timestamp with time zone default now()
);

-- 3. Questions Table
create table questions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  category text not null check (category in ('Quants', 'VA/RC')),
  text_content text not null,
  image_url text, -- Nullable if no image is uploaded
  options jsonb not null, -- A JSON array of 4 strings: ["Option A", "Option B", "Option C", "Option D"]
  correct_option_index integer not null check (correct_option_index between 0 and 3),
  solution_images text[] default '{}'
);

-- 4. Attempts Table
create table attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references users(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  is_correct boolean not null,
  selected_option_index integer not null check (selected_option_index between 0 and 3),
  created_at timestamp with time zone default now(),
  constraint unique_student_question_attempt unique (student_id, question_id)
);

-- 5. Enable Realtime on questions table (for student feeds)
-- Check if the publication exists, and add the table.
begin;
  -- Supabase might already have the publication, add the table
  alter publication supabase_realtime add table questions;
commit;

-- 6. Trigger to automatically update total_score when a student attempts a question
create or replace function update_user_score()
returns trigger as $$
begin
  if NEW.is_correct = true then
    update users
    set total_score = total_score + 1
    where id = NEW.student_id;
  end if;
  return NEW;
end;
$$ language plpgsql;

create trigger trg_update_user_score
after insert on attempts
for each row
execute function update_user_score();

-- 7. Storage Bucket Setup
-- Create the bucket for question images
insert into storage.buckets (id, name, public)
values ('question-images', 'question-images', true)
on conflict (id) do nothing;

-- Set up policies for storage
-- Allow public select access to the bucket
create policy "Public Access" on storage.objects
  for select using (bucket_id = 'question-images');

-- Allow public insert access to the bucket
create policy "Public Upload" on storage.objects
  for insert with check (bucket_id = 'question-images');

-- Disable Row Level Security on tables for frictionless client access
alter table public.users disable row level security;
alter table public.questions disable row level security;
alter table public.attempts disable row level security;
