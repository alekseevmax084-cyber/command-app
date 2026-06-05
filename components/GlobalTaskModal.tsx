'use client'
import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TeamAvatarChip } from '@/components/TeamAvatarChip'
import { createClient } from '@/lib/supabase/client'
import type { Profile, TaskPriority, TaskWorkspace } from '@/types'
import { TEAM_MEMBERS } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  profile?: Profile | null
  defaultAssignTo?: string
  defaultWorkspace?: TaskWorkspace
  onCreated?: () => void
}

export function GlobalTaskModal({ open, onOpenChange, profile, defaultAssignTo, defaultWorkspace, onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assignedTo, setAssignedTo] = useState(defaultAssignTo ?? '')
  const [workspace, setWorkspace] = useState<TaskWorkspace>(defaultWorkspace ?? 'general')
  const [priority, setPriority] = useState<TaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) { setError('Введите заголовок'); return }
    setSaving(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // resolve assigned_to uuid from profiles by name/role
    let assignedToId: string | null = null
    if (assignedTo) {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('name', assignedTo)
        .single()
      assignedToId = data?.id ?? null
    }

    const { error: err } = await supabase.from('tasks').insert({
      title: title.trim(),
      description: description.trim() || null,
      assigned_to: assignedToId,
      assigned_by: user?.id ?? null,
      workspace,
      priority,
      due_date: dueDate || null,
      status: 'todo',
    })

    if (err) { setError(err.message); setSaving(false); return }

    // Record history
    if (user) {
      await supabase.from('task_history').insert({
        task_id: undefined, // will be fixed below
        user_id: user.id,
        action: 'created',
        detail: title.trim(),
      })
    }

    setSaving(false)
    setTitle(''); setDescription(''); setDueDate(''); setError('')
    onOpenChange(false)
    onCreated?.()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Новая задача</DialogTitle>
        </DialogHeader>

        {profile && (
          <div className="flex items-center gap-2 mb-4 px-3 py-2 bg-[var(--surface-2)] border border-[var(--border-dim)] rounded">
            <TeamAvatarChip name={profile.name} role={profile.role} color={profile.avatar_color} size="sm" />
            <span className="font-mono text-xs text-[var(--text-3)]">
              Поставил: <span className="text-[var(--accent)]">{profile.name}</span>
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="task-title">Заголовок *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Что нужно сделать?"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="task-desc">Описание</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробности задачи..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Назначить</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Кому?" />
                </SelectTrigger>
                <SelectContent>
                  {TEAM_MEMBERS.map((m) => (
                    <SelectItem key={m.name} value={m.name}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Пространство</Label>
              <Select value={workspace} onValueChange={(v) => setWorkspace(v as TaskWorkspace)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dev">Разработка</SelectItem>
                  <SelectItem value="marketing">Маркетинг</SelectItem>
                  <SelectItem value="strategy">Стратегия</SelectItem>
                  <SelectItem value="revisions">Доработки</SelectItem>
                  <SelectItem value="general">Общее</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Приоритет</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Критично</SelectItem>
                  <SelectItem value="high">Высокий</SelectItem>
                  <SelectItem value="medium">Средний</SelectItem>
                  <SelectItem value="low">Низкий</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="task-due">Дедлайн</Label>
              <Input
                id="task-due"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-[var(--critical)] font-mono text-xs">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="default" disabled={saving}>
              {saving ? 'Создаю...' : 'Создать задачу'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
