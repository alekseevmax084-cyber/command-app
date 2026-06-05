'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Terminal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createClient()

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout: нет ответа от сервера (10с). Проверь URL и ключ Supabase.')), 10000)
      )

      const { error: err } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        timeout,
      ])

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }
      router.push('/')
      router.refresh()
    } catch (ex: unknown) {
      setError(ex instanceof Error ? ex.message : String(ex))
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 border-r border-[var(--border-dim)] p-12">
        <div className="flex items-center gap-3">
          <Terminal size={24} style={{ color: 'var(--accent)' }} />
          <span className="font-display font-bold text-2xl tracking-tight" style={{ color: 'var(--accent)' }}>
            COMMAND
          </span>
        </div>
        <div>
          <h2 className="font-display font-bold text-5xl text-[var(--text-1)] leading-tight mb-4">
            Командный<br />центр
          </h2>
          <p className="font-body text-[var(--text-2)] text-lg max-w-xs">
            Единое рабочее пространство для команды. Задачи, маркетинг, стратегия.
          </p>
          <div className="flex gap-4 mt-8">
            {['Ваня', 'Саня', 'Макс'].map((name, i) => {
              const colors = ['#3b82f6', '#f97316', '#2EF2C4']
              return (
                <div key={name} className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs font-medium"
                    style={{ background: colors[i], color: colors[i] === '#2EF2C4' ? '#05080b' : '#fff' }}
                  >
                    {name[0]}
                  </span>
                  <span className="font-body text-sm text-[var(--text-2)]">{name}</span>
                </div>
              )
            })}
          </div>
        </div>
        <div className="font-mono text-[11px] text-[var(--text-3)] tracking-wider">
          COMMAND / v1.0 / 2024
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <Terminal size={20} style={{ color: 'var(--accent)' }} />
            <span className="font-display font-bold text-xl" style={{ color: 'var(--accent)' }}>COMMAND</span>
          </div>

          <h1 className="font-display font-bold text-2xl text-[var(--text-1)] mb-2">Войти</h1>
          <p className="font-body text-sm text-[var(--text-3)] mb-8">Доступ только для членов команды</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ivan@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            {error && (
              <p className="font-mono text-xs text-[var(--critical)]">{error}</p>
            )}

            <Button type="submit" variant="default" className="w-full" disabled={loading} size="lg">
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </form>

          <p className="mt-6 text-center font-mono text-[11px] text-[var(--text-3)]">
            Нет аккаунта? Обратитесь к администратору.
          </p>
        </div>
      </div>
    </div>
  )
}
