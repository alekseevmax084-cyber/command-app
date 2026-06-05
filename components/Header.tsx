'use client'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { GlobalTaskModal } from '@/components/GlobalTaskModal'
import type { Profile } from '@/types'
import { formatDate } from '@/lib/utils'

interface Props {
  title: string
  profile?: Profile | null
}

export function Header({ title, profile }: Props) {
  const [open, setOpen] = useState(false)
  const today = formatDate(new Date())

  return (
    <>
      <header className="h-14 border-b border-[var(--border-dim)] bg-[var(--surface)] flex items-center px-6 gap-4 shrink-0">
        <h1 className="font-display font-bold text-base text-[var(--text-1)] flex-1 tracking-tight uppercase">
          {title}
        </h1>

        <span className="font-mono text-xs text-[var(--text-3)] hidden md:block">{today}</span>

        {profile && (
          <span className="font-mono text-xs text-[var(--text-2)]">{profile.name}</span>
        )}

        <Button variant="default" size="sm" onClick={() => setOpen(true)} className="gap-1">
          <Plus size={14} />
          Задача
        </Button>
      </header>

      <GlobalTaskModal open={open} onOpenChange={setOpen} profile={profile} />
    </>
  )
}
