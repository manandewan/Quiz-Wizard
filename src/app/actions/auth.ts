'use server';

import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'testprep-jwt-secret-key-2026';

const TEACHER_ID = process.env.TEACHER_ID || 'imsludhiana';
const TEACHER_PASSWORD = process.env.TEACHER_PASSWORD || '123456';

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.warn('Warning: JWT_SECRET environment variable is missing in production!');
}

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
  if (trimmedName.length > 50) {
    return { success: false, error: 'Full Name cannot exceed 50 characters.' };
  }
  if (!/^\d{4}$/.test(pin)) {
    return { success: false, error: 'Secret PIN must be exactly 4 digits.' };
  }

  try {
    // 1. Check if student already exists
    let user = null;
    let fetchError = null;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('name', trimmedName)
        .eq('role', 'student')
        .maybeSingle();
      user = data;
      fetchError = error;
    } catch (dbErr) {
      console.error('Database fetch exception in studentLogin:', dbErr);
      return { success: false, error: 'Database error. Please try again.' };
    }

    if (fetchError) {
      console.error('Error fetching student:', fetchError);
      return { success: false, error: 'Database error. Please try again.' };
    }

    let targetUser = user;

    if (user) {
      // 2. User exists: verify PIN
      const pinMatches = await bcrypt.compare(pin, user.pin_hash);
      if (!pinMatches) {
        return { success: false, error: 'Incorrect PIN for this Full Name.' };
      }
    } else {
      // 3. User does not exist: create account frictionlessly
      const salt = await bcrypt.genSalt(10);
      const pinHash = await bcrypt.hash(pin, salt);

      let newUser = null;
      let insertError = null;
      try {
        const { data, error } = await supabase
          .from('users')
          .insert({
            name: trimmedName,
            role: 'student',
            pin_hash: pinHash,
            total_score: 0,
          })
          .select()
          .single();
        newUser = data;
        insertError = error;
      } catch (dbErr) {
        console.error('Database insert exception in studentLogin:', dbErr);
        return { success: false, error: 'Failed to create student account.' };
      }

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

// Teacher Login Action (imsludhiana / 123456) - Trigger redeploy for env vars
export async function teacherLogin(teacherId: string, password: string): Promise<AuthResult> {
  const trimmedId = teacherId.trim();
  if (trimmedId !== TEACHER_ID || password !== TEACHER_PASSWORD) {
    return { success: false, error: 'Invalid Teacher ID or password.' };
  }

  try {
    // Check if the teacher user exists in the public database users table - limit 1 and get first element if present
    let user = null;
    let dbError = null;
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'teacher')
        .limit(1);
      dbError = error;
      if (users && users.length > 0) {
        user = users[0];
      }
    } catch (dbErr) {
      console.error('Database connection exception in teacherLogin:', dbErr);
      return { success: false, error: 'Database connection failed.' };
    }

    if (dbError) {
      console.error('Error fetching teacher user:', dbError);
      return { success: false, error: 'Database connection failed.' };
    }

    let targetUser = user;

    // If teacher user doesn't exist for some reason, create a default one
    if (!user) {
      let newUser = null;
      let insertError = null;
      try {
        const { data, error } = await supabase
          .from('users')
          .insert({
            id: 'd3b07384-d113-4e4e-9c76-2e8b61c94441',
            name: 'Teacher Admin',
            role: 'teacher',
            total_score: 0,
          })
          .select()
          .single();
        newUser = data;
        insertError = error;
      } catch (dbErr) {
        console.error('Database insert exception in teacherLogin:', dbErr);
        return { success: false, error: 'Failed to configure teacher user in database.' };
      }

      if (insertError) {
        console.error('Error inserting default teacher user:', insertError);
        return { success: false, error: 'Failed to configure teacher user in database.' };
      }
      targetUser = newUser;
    }

    // Create JWT Session Cookie for Teacher
    const token = jwt.sign(
      { id: targetUser.id, name: targetUser.name, role: 'teacher', email: 'teacher@testprep.com' },
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
  try {
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
  } catch (err) {
    console.error('Error in getCurrentUser:', err);
  }

  return null;
}
