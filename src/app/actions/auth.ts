'use server';

import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'testprep-jwt-secret-key-2026';

export interface AuthResult {
  success: boolean;
  error?: string;
}

// Student Login & Frictionless Registration Action
export async function studentLogin(name: string, pin: string): Promise<AuthResult> {
  // Validate inputs
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, error: 'Full Name is required.' };
  }
  if (!/^\d{4}$/.test(pin)) {
    return { success: false, error: 'Secret PIN must be exactly 4 digits.' };
  }

  try {
    // 1. Check if student already exists
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('name', trimmedName)
      .eq('role', 'student')
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching student:', fetchError);
      return { success: false, error: 'Database error. Please try again.' };
    }

    let targetUser = user;

    if (user) {
      // 2. User exists: verify PIN
      const pinMatches = bcrypt.compareSync(pin, user.pin_hash);
      if (!pinMatches) {
        return { success: false, error: 'Incorrect PIN for this Full Name.' };
      }
    } else {
      // 3. User does not exist: create account frictionlessly
      const salt = bcrypt.genSaltSync(10);
      const pinHash = bcrypt.hashSync(pin, salt);

      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          name: trimmedName,
          role: 'student',
          pin_hash: pinHash,
          total_score: 0,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Error inserting student:', insertError);
        return { success: false, error: 'Failed to create student account.' };
      }
      targetUser = newUser;
    }

    // 4. Set JWT Session Cookie
    const token = jwt.sign(
      { id: targetUser.id, name: targetUser.name, role: 'student' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const cookieStore = await cookies();
    cookieStore.set('student-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return { success: true };
  } catch (err) {
    console.error('Student auth exception:', err);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// Student Logout Action
export async function studentLogout(): Promise<AuthResult> {
  const cookieStore = await cookies();
  cookieStore.delete('student-session');
  return { success: true };
}

// Teacher Login Action
export async function teacherLogin(email: string, password: string): Promise<AuthResult> {
  const trimmedEmail = email.trim();
  if (!trimmedEmail || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  try {
    // 1. Sign in using Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: password,
    });

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Authentication failed.' };
    }

    // 2. Double check role in our public.users table
    const { data: user, error: dbError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .eq('role', 'teacher')
      .maybeSingle();

    if (dbError || !user) {
      // Sign out from Supabase Auth to keep state consistent
      await supabase.auth.signOut();
      return { success: false, error: 'Access denied: You are not registered as a teacher.' };
    }

    // 3. Create JWT Session Cookie
    const token = jwt.sign(
      { id: user.id, name: user.name, role: 'teacher', email: authData.user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const cookieStore = await cookies();
    cookieStore.set('teacher-session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return { success: true };
  } catch (err) {
    console.error('Teacher auth exception:', err);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// Teacher Logout Action
export async function teacherLogout(): Promise<AuthResult> {
  try {
    await supabase.auth.signOut();
    const cookieStore = await cookies();
    cookieStore.delete('teacher-session');
    return { success: true };
  } catch (err) {
    console.error('Teacher logout exception:', err);
    return { success: false, error: 'An unexpected error occurred.' };
  }
}

// Helper Action to get current logged in user from cookies (on server-side)
export async function getCurrentUser() {
  const cookieStore = await cookies();
  
  const studentToken = cookieStore.get('student-session')?.value;
  if (studentToken) {
    try {
      const decoded = jwt.verify(studentToken, JWT_SECRET) as { id: string; name: string; role: string };
      if (decoded.role === 'student') return decoded;
    } catch {
      // Token invalid or expired
    }
  }

  const teacherToken = cookieStore.get('teacher-session')?.value;
  if (teacherToken) {
    try {
      const decoded = jwt.verify(teacherToken, JWT_SECRET) as { id: string; name: string; role: string; email: string };
      if (decoded.role === 'teacher') return decoded;
    } catch {
      // Token invalid or expired
    }
  }

  return null;
}
