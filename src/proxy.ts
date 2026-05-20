import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const intlMiddleware = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Auth callback — skip all processing
  if (pathname.startsWith('/auth/callback')) {
    return NextResponse.next()
  }

  // Always run intl middleware — it handles locale detection, rewrites, and redirects
  const intlResponse = intlMiddleware(request)

  // Supabase session refresh + protect /report routes
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            intlResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user && /\/report\//.test(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return intlResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
