import type { Metadata, Viewport } from 'next'
import { Poppins, Geist_Mono } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'DIAN',
  description: 'Document Intelligence and Archive Network',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#2563eb',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id" className={`${poppins.variable} ${geistMono.variable} h-full antialiased`}>
      <head>
        {/* Prevents FOUC in dev: Turbopack injects CSS via JS, not render-blocking <link> tags */}
        <style>{`
          *, *::before, *::after { box-sizing: border-box; }
          body { margin: 0; background-color: #f8fafc; }
          html { height: 100%; }
        `}</style>
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {children}
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html:
              process.env.NODE_ENV === 'production'
                ? `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(console.error); }`
                : `if ('serviceWorker' in navigator) { navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())); }`,
          }}
        />
      </body>
    </html>
  )
}
