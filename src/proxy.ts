import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    cookieName: 'authjs.session-token',
  })

  const isLoggedIn = !!token
  const { pathname } = req.nextUrl

  const isPublicPath =
    pathname === '/login' ||
    pathname === '/offline' ||
    pathname === '/sw.js' ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/icons')

  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isLoggedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/', req.nextUrl))
  }

  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin')
  const isUploadRoute = req.nextUrl.pathname.startsWith('/upload')

  if (isLoggedIn && (isAdminRoute || isUploadRoute) && token.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/documents', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
}
