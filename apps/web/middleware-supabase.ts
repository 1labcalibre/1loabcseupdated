import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
// Supabase middleware disabled - not being used
// import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Supabase middleware disabled - using Firebase auth instead
  return NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * 
     * Note: We removed 'api' from exclusions to allow middleware to process API routes
     * but we handle them explicitly in the middleware function
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
} 