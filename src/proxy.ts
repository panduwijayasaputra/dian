import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export const proxy = auth((req) => {
  const { pathname } = req.nextUrl
  const isLoggedIn = !!req.auth

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

  const isAdminRoute = pathname.startsWith('/admin')
  const isUploadRoute = pathname.startsWith('/upload')

  if (isLoggedIn && (isAdminRoute || isUploadRoute) && req.auth?.user?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/documents', req.nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico).*)'],
}
