'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { PriorityBadge } from '@/components/PriorityBadge'
import { TeamAvatarChip } from '@/components/TeamAvatarChip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GlobalTaskModal } from '@/components/GlobalTaskModal'
import { TaskDrawer } from '@/components/TaskDrawer'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { formatDate, isOverdue } from '@/lib/utils'
import type { Task, Profile, TaskStatus, TaskPriority, TaskWorkspace } from '@/types'
import { STATUS_LABELS, WORKSPACE_LABELS } from '@/types'
import { Plus, ArrowUpDown } from 'lucide-react'

type StatusFilter = TaskStatus | 'all'
type PriorityFilter = TaskPriority | 'all'
type WorkspaceFilter = TaskWorkspace | 'all'

const STATUS_BADGE: Record<TaskStatus, 'default' | 'accent' | 'done' | 'high'> = {
  todo: 'default',
  in_progress: 'high',
  review: 'accent',
  done: 'done',
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const [filterStatus, setFilterStatus] = useState<StatusFilter>('all')
  const [filterPriority, setFilterPriority] = useState<PriorityFilter>('all')
  const [filterWorkspace, setFilterWorkspace] = useState<WorkspaceFilter>('all')
  const [filterAssignee, setFilterAssignee] = useState<string>('all')

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const [tr, pr] = await Promise.all([
      supabase.from('tasks').select('*, assigned_to_profile:profiles!assigned_to(*), assigned_by_profile:profiles!assigned_by(*)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
    ])
    setTasks(tr.data ?? [])
    setProfiles(pr.data ?? [])
    setCurrentProfile((pr.data ?? []).find(p => p.id === user?.id) ?? null)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = tasks.filter(t => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    if (filterWorkspace !== 'all' && t.workspace !== filterWorkspace) return false
    if (filterAssignee !== 'all' && t.assigned_to !== filterAssignee) return false
    return true
  })

  return (
    <AppLayout title="Все задачи" profile={currentProfile}>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as StatusFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="todo">TODO</SelectItem>
            <SelectItem value="in_progress">В работе</SelectItem>
            <SelectItem value="review">Ревью</SelectItem>
            <SelectItem value="done">Готово</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterPriority} onValueChange={(v) => setFilterPriority(v as PriorityFilter)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Приоритет" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все приоритеты</SelectItem>
            <SelectItem value="critical">Критично</SelectItem>
            <SelectItem value="high">Высокий</SelectItem>
            <SelectItem value="medium">Средний</SelectItem>
            <SelectItem value="low">Низкий</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterWorkspace} onValueChange={(v) => setFilterWorkspace(v as WorkspaceFilter)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Пространство" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="dev">Разработка</SelectItem>
            <SelectItem value="marketing">Маркетинг</SelectItem>
            <SelectItem value="strategy">Стратегия</SelectItem>
            <SelectItem value="revisions">Доработки</SelectItem>
            <SelectItem value="general">Общее</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filterAssignee} onValueChange={setFilterAssignee}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Исполнитель" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            {profiles.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-xs text-[var(--text-3)]">{filtered.length} задач</span>
          <Button variant="default" size="sm" onClick={() => setModalOpen(true)}>
            <Plus size={14} /> Поставить задачу
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--surface)] border border-[var(--border-dim)]">
        {/* Header */}
        <div className="grid gap-0 border-b border-[var(--border-dim)] bg-[var(--surface-2)]"
          style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px 80px' }}
        >
          {['Задача', 'Поставил → Кому', 'Приоритет', 'Статус', 'Пространство', 'Дедлайн', ''].map((h) => (
            <div key={h} className="px-3 py-2.5 font-mono text-[10px] text-[var(--text-3)] uppercase tracking-wider">
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center font-mono text-xs text-[var(--text-3)]">— задач нет —</div>
        ) : (
          filtered.map((task, i) => {
            const overdue = task.status !== 'done' && isOverdue(task.due_date)
            return (
              <div
                key={task.id}
                className="grid items-center border-b border-[var(--border-dim)] last:border-0 hover:bg-[rgba(46,242,196,0.04)] transition-colors cursor-pointer relative"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px 80px', background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}
                onClick={() => setSelectedTask(task)}
              >
                <div className="px-3 py-2.5">
                  <span className="font-body text-sm text-[var(--text-1)] font-medium">{task.title}</span>
                </div>
                <div className="px-3 py-2.5 flex items-center gap-1.5">
                  {task.assigned_by_profile && <TeamAvatarChip name={task.assigned_by_profile.name} role={task.assigned_by_profile.role} size="sm" />}
                  {task.assigned_by_profile && task.assigned_to_profile && <span className="text-[var(--text-3)] text-xs">→</span>}
                  {task.assigned_to_profile && <TeamAvatarChip name={task.assigned_to_profile.name} role={task.assigned_to_profile.role} size="sm" />}
                </div>
                <div className="px-3 py-2.5">
                  <PriorityBadge priority={task.priority} />
                </div>
                <div className="px-3 py-2.5">
                  <Badge variant={STATUS_BADGE[task.status]}>{STATUS_LABELS[task.status]}</Badge>
                </div>
                <div className="px-3 py-2.5 font-body text-xs text-[var(--text-2)]">
                  {task.workspace ? WORKSPACE_LABELS[task.workspace] : '—'}
                </div>
                <div className={`px-3 py-2.5 font-mono text-xs tabular-nums ${overdue ? 'text-[var(--critical)]' : 'text-[var(--text-2)]'}`}>
                  {formatDate(task.due_date)}
                </div>
                <div className="px-3 py-2.5">
                  <Button variant="ghost" size="sm" className="text-[var(--text-3)] text-xs" onClick={(e) => { e.stopPropagation(); setSelectedTask(task) }}>
                    Открыть
                  </Button>
                </div>
              </div>
            )
          })
        )}
      </div>

      <GlobalTaskModal open={modalOpen} onOpenChange={setModalOpen} profile={currentProfile} onCreated={load} />
      <TaskDrawer task={selectedTask} currentProfile={currentProfile} onClose={() => setSelectedTask(null)} onUpdated={load} />
    </AppLayout>
  )
}
