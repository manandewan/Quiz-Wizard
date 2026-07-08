import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Lightweight parser to validate JWT format, role, and expiration in the Edge middleware
function isSessionValid(cookieValue: string | undefined, expectedRole: string): boolean {
  if (!cookieValue) return false;
  try {
    const parts = cookieValue.split('.');
    if (parts.length !== 3) return false;
    
    // Decode base64url payload
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    
    const payloadJson = atob(paddedBase64);
    const payload = JSON.parse(payloadJson);
    
    // Validate role and expiration date
    if (payload.role !== expectedRole) return false;
    if (payload.exp && payload.exp < Date.now() / 1000) return false;
    
    return true;
  } catch (err) {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const studentCookie = request.cookies.get('student-session')?.value;
  const teacherCookie = request.cookies.get('teacher-session')?.value;

  const isStudentValid = isSessionValid(studentCookie, 'student');
  const isTeacherValid = isSessionValid(teacherCookie, 'teacher');

  // 1. Protect Student Routes (/student/*)
  if (pathname.startsWith('/student')) {
    if (!isStudentValid) {
      const loginUrl = new URL('/', request.url);
      const response = NextResponse.redirect(loginUrl);
      if (studentCookie) {
        response.cookies.delete('student-session');
      }
      return response;
    }
  }

  // 2. Protect Teacher Routes (/admin/* except /admin/login)
  if (pathname.startsWith('/admin')) {
    if (pathname !== '/admin/login') {
      if (!isTeacherValid) {
        const loginUrl = new URL('/admin/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        if (teacherCookie) {
          response.cookies.delete('teacher-session');
        }
        return response;
      }
    } else {
      // If already logged in as teacher, redirect /admin/login to /admin
      if (isTeacherValid) {
        const adminUrl = new URL('/admin', request.url);
        return NextResponse.redirect(adminUrl);
      } else if (teacherCookie) {
        // Clear invalid teacher cookie
        const response = NextResponse.next();
        response.cookies.delete('teacher-session');
        return response;
      }
    }
  }

  // 3. Redirect / if student is already logged in
  if (pathname === '/') {
    if (isStudentValid) {
      const feedUrl = new URL('/student/feed', request.url);
      return NextResponse.redirect(feedUrl);
    } else if (studentCookie) {
      // Clear invalid student cookie
      const response = NextResponse.next();
      response.cookies.delete('student-session');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/', '/student/:path*', '/admin/:path*'],
};
