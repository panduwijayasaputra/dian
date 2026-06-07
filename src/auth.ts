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

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        })

        if (!user) {
          await logActivity({
            action: 'AUTH_LOGIN_FAILED',
            information: `Username tidak ditemukan: ${credentials.username}`,
          })
          return null
        }

        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!valid) {
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
      session.user.id = token.sub!
      session.user.role = token.role
      session.user.divisionId = token.divisionId
      session.user.isActive = token.isActive
      return session
    },
  },
})
