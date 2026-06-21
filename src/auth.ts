import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { logActivity } from '@/lib/activity-log'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null

        let user
        try {
          user = await prisma.user.findUnique({
            where: { username: credentials.username as string },
          })
        } catch (err) {
          console.error('[auth] DB error during findUnique:', err)
          return null
        }

        if (!user) {
          console.error('[auth] User not found:', credentials.username)
          await logActivity({
            action: 'AUTH_LOGIN_FAILED',
            information: `Username tidak ditemukan: ${credentials.username}`,
          })
          return null
        }

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!valid) {
          console.error('[auth] Invalid password for:', user.username)
          await logActivity({
            userId: user.id,
            action: 'AUTH_LOGIN_FAILED',
            resourceId: user.id,
            information: `Password salah untuk: ${user.username}`,
          })
          return null
        }

        if (!user.isActive) {
          await logActivity({
            userId: user.id,
            action: 'AUTH_LOGIN_FAILED',
            resourceId: user.id,
            information: `Akun tidak aktif: ${user.username}`,
          })
          return null
        }

        await logActivity({
          userId: user.id,
          action: 'AUTH_LOGIN',
          resourceId: user.id,
          information: `Login berhasil: ${user.name}`,
        })

        return {
          id: user.id,
          name: user.name,
          email: user.username,
          role: user.role,
          divisionId: user.divisionId,
          isActive: user.isActive,
        }
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  callbacks: {
    jwt({ token, user, trigger }) {
      if (trigger === 'signIn' && user) {
        token.role = user.role
        token.divisionId = user.divisionId
        token.isActive = user.isActive
      }
      return token
    },
    session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = token as any
      session.user.id = token.sub!
      session.user.role = t.role
      session.user.divisionId = t.divisionId
      session.user.isActive = t.isActive
      return session
    },
  },
})
