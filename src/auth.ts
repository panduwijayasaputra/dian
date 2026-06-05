import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

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
        if (!user) return null
        const valid = await bcrypt.compare(credentials.password as string, user.passwordHash)
        if (!valid) return null
        if (!user.isActive) return null
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
