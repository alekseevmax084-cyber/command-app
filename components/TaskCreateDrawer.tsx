'use client'
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TeamAvatarChip } from '@/components/TeamAvatarChip'
import type { Profile, TaskPriority, TaskWorkspace } from '@/types'
import { PRIORITY_LABELS } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  currentProfile?: Profile | null
  defaultWorkspace?: TaskWorkspace
  onCreated?: () => void
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: '#ef4444',
  high:     '#f59e0b',
  medium:   '#2EF2C4',
  low:      '#484f58',
}

export function TaskCreateDrawer({
  open, onOpenChange, currentProfile, defaultWorkspace = 'general', onCreated,
}: Props) {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [title, setTitle] = useState('')
  const [assignedTo, setAssignedTo] = useState<Profile | null>(null)
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('profiles').select('*').then(({ data }) => {
      setProfiles((data as Profile[]) ?? [])
    })
  }, [])

  useEffect(() => {
    if (open) {
      setTimeout(() => titleRef.current?.focus(), 80)
    } else {
      setTitle(''); setAssignedTo(null); setPriority('medium')
      setDueDate(''); setDescription(''); setError('')
    }
  }, [open])

  async function handleCreate() {
    if (!title.trim()) { setError('Введите название'); return }
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data: created, error: err } = await supabase
      .from('tasks')
      .insert({
        title: title.trim(),
        description: description.trim() || null,
        assigned_to: assignedTo?.id ?? null,
        assigned_by: user?.id ?? null,
        workspace: defaultWorkspace,
        priority,
        due_date: dueDate || null,
        status: 'todo',
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (err) { setError(err.message); setSaving(false); return }

    if (user && created) {
      await supabase.from('task_history').insert({
        task_id: created.id,
        user_id: user.id,
        action: 'created',
        detail: title.trim(),
      })
    }

    setSaving(false)
    onOpenChange(false)
    onCreated?.()
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={() => onOpenChange(false)}
          />
          <motion.aside
            key="drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
            style={{ width: 'min(480px, 100vw)', background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 shrink-0" style={{ borderBottom: '1px solid var(--border-dim)' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--text-1)' }}>
                Новая задача
              </span>
              <button
                onClick={() => onOpenChange(false)}
                style={{ color: 'var(--text-3)', padding: 4 }}
                className="hover:text-[var(--text-1)] transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-7">

              {/* Title */}
              <input
                ref={titleRef}
                value={title}
                onChange={e => setTitle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleCreate()}
                placeholder="Название задачи..."
                style={{
                  width: '100%', background: 'transparent',
                  color: 'var(--text-1)', fontSize: 22,
                  fontFamily: 'var(--font-display)', fontWeight: 700,
                  borderBottom: '2px solid var(--border-dim)',
                  paddingBottom: 10, outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={e => (e.target.style.borderBottomColor = 'var(--accent)')}
                onBlur={e => (e.target.style.borderBottomColor = 'var(--border-dim)')}
              />

              {/* Assignee */}
              <div>
                <FieldLabel>Кому назначить</FieldLabel>
                <div className="flex gap-3 mt-2">
                  {profiles.map(p => {
                    const selected = assignedTo?.id === p.id
                    return (
                      <button
                        key={p.id}
                        onClick={() => setAssignedTo(selected ? null : p)}
                        style={{
                          flex: 1, display: 'flex', flexDirection: 'column',
                          alignItems: 'center', gap: 8, padding: '12px 8px',
                          border: `1px solid ${selected ? 'var(--accent)' : 'var(--border-dim)'}`,
                          borderRadius: 4,
                          background: selected ? 'rgba(46,242,196,0.08)' : 'transparent',
                          transition: 'all 0.15s', cursor: 'pointer',
                        }}
                      >
                        <TeamAvatarChip name={p.name} role={p.role} color={p.avatar_color} />
                        <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, color: selected ? 'var(--text-1)' : 'var(--text-2)' }}>
                          {p.name}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Priority */}
              <div>
                <FieldLabel>Приоритет</FieldLabel>
                <div className="flex gap-2 mt-2">
                  {(['low', 'medium', 'high', 'critical'] as TaskPriority[]).map(p => {
                    const selected = priority === p
                    const color = PRIORITY_COLORS[p]
                    return (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        style={{
                          flex: 1, padding: '9px 4px',
                          border: `1px solid ${selected ? color : 'var(--border-dim)'}`,
                          borderRadius: 4,
                          background: selected ? `${color}18` : 'transparent',
                          color: selected ? color : 'var(--text-3)',
                          fontFamily: 'var(--font-mono)', fontSize: 11,
                          fontWeight: selected ? 700 : 400,
                          letterSpacing: '0.05em', cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {PRIORITY_LABELS[p]}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Due date */}
              <div>
                <FieldLabel>Дедлайн (необязательно)</FieldLabel>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  style={{
                    marginTop: 8, width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-dim)',
                    color: 'var(--text-1)', fontFamily: 'var(--font-mono)',
                    fontSize: 13, padding: '8px 12px', borderRadius: 4,
                    outline: 'none',
                    colorScheme: 'dark',
                  }}
                />
              </div>

              {/* Description */}
              <div>
                <FieldLabel>Описание (необязательно)</FieldLabel>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Детали, контекст, ссылки..."
                  rows={4}
                  style={{
                    marginTop: 8, width: '100%',
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-dim)',
                    color: 'var(--text-1)', fontFamily: 'var(--font-body)',
                    fontSize: 13, padding: '10px 12px', borderRadius: 4,
                    outline: 'none', resize: 'none',
                  }}
                />
              </div>

              {error && (
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--critical)' }}>
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 pt-4 shrink-0" style={{ borderTop: '1px solid var(--border-dim)' }}>
              {currentProfile && (
                <div className="flex items-center gap-2 mb-4">
                  <TeamAvatarChip name={currentProfile.name} role={currentProfile.role} color={currentProfile.avatar_color} size="sm" />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
                    Поставит: <span style={{ color: 'var(--accent)' }}>{currentProfile.name}</span>
                  </span>
                </div>
              )}
              <button
                onClick={handleCreate}
                disabled={saving || !title.trim()}
                style={{
                  width: '100%', padding: '14px',
                  background: 'var(--accent)', color: 'var(--bg)',
                  fontFamily: 'var(--font-display)', fontWeight: 800,
                  fontSize: 15, borderRadius: 4, border: 'none',
                  cursor: saving || !title.trim() ? 'not-allowed' : 'pointer',
                  opacity: saving || !title.trim() ? 0.45 : 1,
                  transition: 'opacity 0.15s',
                  letterSpacing: '0.02em',
                }}
              >
                {saving ? 'Создаю...' : '+ Создать задачу'}
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      {children}
    </div>
  )
}
