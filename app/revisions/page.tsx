'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { PriorityBadge } from '@/components/PriorityBadge'
import { TeamAvatarChip } from '@/components/TeamAvatarChip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { formatDate, isOverdue } from '@/lib/utils'
import type { Revision, Profile, TaskPriority, RevisionStatus } from '@/types'
import { Plus, Bell, AlertTriangle } from 'lucide-react'

const STATUS_LABELS: Record<RevisionStatus, string> = {
  pending: 'ОЖИДАЕТ',
  in_progress: 'В РАБОТЕ',
  done: 'ГОТОВО',
}

const STATUS_BADGE: Record<RevisionStatus, 'default' | 'high' | 'done'> = {
  pending: 'default',
  in_progress: 'high',
  done: 'done',
}

export default function RevisionsPage() {
  const [revisions, setRevisions] = useState<Revision[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [filterStatus, setFilterStatus] = useState<RevisionStatus | 'all'>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    title: '', description: '', assigned_to: '',
    due_date: '', reminder_date: '',
    priority: 'medium' as TaskPriority,
  })

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const [rr, pr] = await Promise.all([
      supabase.from('revisions').select('*, assigned_to_profile:profiles!assigned_to(*), assigned_by_profile:profiles!assigned_by(*)').order('due_date'),
      supabase.from('profiles').select('*'),
    ])
    setRevisions((rr.data ?? []) as Revision[])
    setProfiles(pr.data ?? [])
    setCurrentProfile((pr.data ?? []).find(p => p.id === user?.id) ?? null)
  }, [])

  useEffect(() => { load() }, [load])

  async function createRevision(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let assignedToId: string | null = null
    if (form.assigned_to) {
      const { data } = await supabase.from('profiles').select('id').eq('name', form.assigned_to).single()
      assignedToId = data?.id ?? null
    }

    await supabase.from('revisions').insert({
      title: form.title,
      description: form.description || null,
      assigned_to: assignedToId,
      assigned_by: user?.id ?? null,
      due_date: form.due_date || null,
      reminder_date: form.reminder_date || null,
      priority: form.priority,
    })
    setSaving(false)
    setModalOpen(false)
    setForm({ title: '', description: '', assigned_to: '', due_date: '', reminder_date: '', priority: 'medium' })
    load()
  }

  async function updateStatus(id: string, status: RevisionStatus) {
    const supabase = createClient()
    await supabase.from('revisions').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  const filtered = revisions
    .filter(r => {
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (filterAssignee !== 'all' && r.assigned_to !== filterAssignee) return false
      return true
    })
    .sort((a, b) => {
      const aOver = a.status !== 'done' && isOverdue(a.due_date)
      const bOver = b.status !== 'done' && isOverdue(b.due_date)
      if (aOver && !bOver) return -1
      if (!aOver && bOver) return 1
      if (a.due_date && b.due_date) return new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
      return 0
    })

  const now = new Date()
  function daysUntilReminder(r: Revision) {
    if (!r.reminder_date) return null
    const d = new Date(r.reminder_date)
    return Math.ceil((d.getTime() - now.getTime()) / 86400000)
  }

  return (
    <AppLayout title="Доработки" profile={currentProfile}>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as RevisionStatus | 'all')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="pending">Ожидает</SelectItem>
            <SelectItem value="in_progress">В работе</SelectItem>
            <SelectItem value="done">Готово</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Ответственный" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {profiles.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto">
          <Button variant="default" size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Новая доработка
          </Button>
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center font-mono text-xs text-[var(--text-3)]">— доработок нет —</div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((r) => {
            const overdue = r.status !== 'done' && isOverdue(r.due_date)
            const reminderDays = daysUntilReminder(r)
            return (
              <div
                key={r.id}
                className={`bg-[var(--surface)] border rounded p-4 transition-colors ${overdue ? 'border-[var(--critical)]/40' : 'border-[var(--border-dim)]'}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {overdue && (
                        <AlertTriangle size={13} style={{ color: 'var(--critical)' }} />
                      )}
                      <span className="font-body font-medium text-[var(--text-1)]">{r.title}</span>
                      <Badge variant={STATUS_BADGE[r.status]}>{STATUS_LABELS[r.status]}</Badge>
                      <PriorityBadge priority={r.priority} />
                    </div>
                    {r.description && (
                      <p className="font-body text-xs text-[var(--text-2)] mb-2 line-clamp-2">{r.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-[var(--text-3)]">
                      {r.assigned_to_profile && (
                        <div className="flex items-center gap-1.5">
                          <TeamAvatarChip name={r.assigned_to_profile.name} role={r.assigned_to_profile.role} size="sm" />
                          <span className="font-mono">{r.assigned_to_profile.name}</span>
                        </div>
                      )}
                      {r.due_date && (
                        <span className={`font-mono ${overdue ? 'text-[var(--critical)]' : ''}`}>
                          Дедлайн: {formatDate(r.due_date)}
                        </span>
                      )}
                      {reminderDays !== null && reminderDays >= 0 && (
                        <span className="flex items-center gap-1 font-mono text-[var(--accent)]">
                          <Bell size={11} />
                          Напомнить через {reminderDays} дн
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 shrink-0">
                    {r.status !== 'in_progress' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'in_progress')}>
                        В работу
                      </Button>
                    )}
                    {r.status !== 'done' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'done')}>
                        Готово
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New revision modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новая доработка</DialogTitle>
          </DialogHeader>
          <form onSubmit={createRevision} className="space-y-4">
            <div>
              <Label htmlFor="rev-title">Заголовок *</Label>
              <Input id="rev-title" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Что доработать?" required />
            </div>
            <div>
              <Label htmlFor="rev-desc">Описание</Label>
              <Textarea id="rev-desc" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Ответственный</Label>
                <Select value={form.assigned_to} onValueChange={v => setForm({ ...form, assigned_to: v })}>
                  <SelectTrigger><SelectValue placeholder="Кто?" /></SelectTrigger>
                  <SelectContent>
                    {['Ваня', 'Саня', 'Макс'].map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Приоритет</Label>
                <Select value={form.priority} onValueChange={v => setForm({ ...form, priority: v as TaskPriority })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Критично</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="low">Низкий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Дедлайн</Label>
                <Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
              </div>
              <div>
                <Label>Напоминание</Label>
                <Input type="date" value={form.reminder_date} onChange={e => setForm({ ...form, reminder_date: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Отмена</Button>
              <Button type="submit" variant="default" disabled={saving}>{saving ? 'Создаю...' : 'Создать'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
