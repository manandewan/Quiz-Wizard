import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasStudentSession = request.cookies.has('student-session');
  const hasTeacherSession = request.cookies.has('teacher-session');

  // 1. Protect Student Routes (/student/*)
  if (pathname.startsWith('/student')) {
    if (!hasStudentSession) {
      const loginUrl = new URL('/', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Protect Teacher Routes (/admin/* except /admin/login)
  if (pathname.startsWith('/admin')) {
    if (pathname !== '/admin/login') {
      if (!hasTeacherSession) {
        const loginUrl = new URL('/admin/login', request.url);
        return NextResponse.redirect(loginUrl);
      }
    } else {
      // If already logged in as teacher, redirect /admin/login to /admin
      if (hasTeacherSession) {
        const adminUrl = new URL('/admin', request.url);
        return NextResponse.redirect(adminUrl);
      }
    }
  }

  // 3. Redirect / if student is already logged in
  if (pathname === '/') {
    if (hasStudentSession) {
      const feedUrl = new URL('/student/feed', request.url);
      return NextResponse.redirect(feedUrl);
    }
  }

  return NextResponse.next();
}

// Config matching all routes we want to intercept
export const config = {
  matcher: ['/', '/student/:path*', '/admin/:path*'],
};
