import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    role: 'ADMIN' | 'USER'
    divisionId: string | null
    isActive: boolean
  }
  interface Session {
    user: {
      id: string
      role: 'ADMIN' | 'USER'
      divisionId: string | null
      isActive: boolean
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: 'ADMIN' | 'USER'
    divisionId: string | null
    isActive: boolean
  }
}
