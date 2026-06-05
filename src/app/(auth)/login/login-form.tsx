'use client'

import { useActionState } from 'react'
import { loginAction } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null)

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">DIAN</h1>
        <p className="text-muted-foreground text-sm">Document Intelligence and Archive Network</p>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="username">Nama Pengguna</Label>
            <Input id="username" name="username" type="text" autoComplete="username" required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Kata Sandi</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? 'Memproses...' : 'Masuk'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
