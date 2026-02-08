import { NextRequest, NextResponse } from 'next/server';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/api/admin-login', '/api/admin-logout'];

// Routes that require authentication
const PROTECTED_ROUTES = ['/', '/tasks', '/volunteers'];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Get token from cookies or headers
  const token = request.cookies.get('adminToken')?.value;

  // Allow public routes
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    // If user is logged in and trying to access login, redirect to dashboard
    if (token && pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // Check if route requires authentication
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !token) {
    // Redirect to login if trying to access protected route without token
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
