'use server'

import { signIn } from '@/auth'
import { AuthError } from 'next-auth'

export type LoginState = { error: string } | null

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn('credentials', {
      username: formData.get('username'),
      password: formData.get('password'),
      redirectTo: '/',
    })
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Username atau password salah.' }
    }
    throw error
  }
  return null
}
