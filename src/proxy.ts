import createMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const intlMiddleware = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Auth callback must not be locale-prefixed
  if (pathname.startsWith('/auth/callback')) {
    return NextResponse.next()
  }

  // Static assets — skip
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    /\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|js|css)$/.test(pathname)
  ) {
    return NextResponse.next()
  }

  // Run next-intl locale routing first
  const intlResponse = intlMiddleware(request)
  // If intl redirects/rewrites, return that response
  if (intlResponse.status !== 200 || intlResponse.headers.has('location')) {
    return intlResponse
  }

  // Supabase session refresh + auth protection on /report paths
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect /report pages (works for both / and /{locale}/report/...)
  if (!user && /\/report\//.test(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
