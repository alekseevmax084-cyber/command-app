'use client'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { TaskCreateDrawer } from '@/components/TaskCreateDrawer'
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
      <header
        className="flex items-center px-6 gap-4 shrink-0"
        style={{ height: 56, borderBottom: '1px solid var(--border-dim)', background: 'var(--surface)' }}
      >
        <h1
          className="flex-1 tracking-tight uppercase"
          style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 14, color: 'var(--text-1)' }}
        >
          {title}
        </h1>

        <span className="hidden md:block" style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
          {today}
        </span>

        {profile && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)' }}>
            {profile.name}
          </span>
        )}

        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 transition-colors"
          style={{
            padding: '6px 14px',
            background: 'var(--accent)', color: 'var(--bg)',
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 13, borderRadius: 4, border: 'none', cursor: 'pointer',
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Задача
        </button>
      </header>

      <TaskCreateDrawer
        open={open}
        onOpenChange={setOpen}
        currentProfile={profile}
      />
    </>
  )
}
