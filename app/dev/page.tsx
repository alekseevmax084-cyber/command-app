'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { PriorityBadge } from '@/components/PriorityBadge'
import { TeamAvatarChip } from '@/components/TeamAvatarChip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { GlobalTaskModal } from '@/components/GlobalTaskModal'
import { TaskDrawer } from '@/components/TaskDrawer'
import { createClient } from '@/lib/supabase/client'
import { formatDate, isOverdue } from '@/lib/utils'
import type { Task, Profile, TaskStatus } from '@/types'
import { STATUS_LABELS } from '@/types'
import { Plus } from 'lucide-react'

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'done']

const COL_LABELS: Record<TaskStatus, string> = {
  todo: 'TODO',
  in_progress: 'В РАБОТЕ',
  review: 'РЕВЬЮ',
  done: 'ГОТОВО',
}

const COL_ACCENT: Record<TaskStatus, string> = {
  todo: 'var(--text-3)',
  in_progress: 'var(--high)',
  review: 'var(--accent)',
  done: 'var(--done)',
}

export default function DevPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const [tr, pr] = await Promise.all([
      supabase.from('tasks').select('*, assigned_to_profile:profiles!assigned_to(*), assigned_by_profile:profiles!assigned_by(*)').eq('workspace', 'dev').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
    ])
    setTasks((tr.data ?? []) as Task[])
    const profileList = (pr.data ?? []) as Profile[]
    setCurrentProfile(profileList.find(p => p.id === user?.id) ?? null)
  }, [])

  useEffect(() => { load() }, [load])

  async function moveTask(taskId: string, newStatus: TaskStatus) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    await supabase.from('tasks').update({ status: newStatus, updated_by: user?.id, updated_at: new Date().toISOString() }).eq('id', taskId)
    if (user) {
      await supabase.from('task_history').insert({
        task_id: taskId,
        user_id: user.id,
        action: 'status_changed',
        detail: `${STATUS_LABELS[task.status]} → ${STATUS_LABELS[newStatus]}`,
      })
    }
    load()
  }

  const byStatus = (status: TaskStatus) => tasks.filter(t => t.status === status || (status === 'in_progress' && t.status === 'review'))

  return (
    <AppLayout title="Разработка" profile={currentProfile}>
      <div className="flex items-center justify-between mb-5">
        <div className="font-mono text-xs text-[var(--text-3)]">{tasks.length} задач в пространстве</div>
        <Button variant="default" size="sm" onClick={() => setModalOpen(true)}>
          <Plus size={14} /> Новая задача
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4 h-[calc(100vh-200px)]">
        {COLUMNS.map((col) => {
          const colTasks = byStatus(col)
          return (
            <div key={col} className="flex flex-col min-h-0">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <span className="w-1.5 h-4 rounded-sm shrink-0" style={{ background: COL_ACCENT[col] }} />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-[var(--text-2)]">
                  {COL_LABELS[col]}
                </span>
                <span className="ml-auto font-mono text-[11px] text-[var(--text-3)] bg-[var(--surface-2)] px-1.5 py-0.5 rounded-sm">
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {colTasks.map((task) => {
                  const overdue = task.status !== 'done' && isOverdue(task.due_date)
                  return (
                    <div
                      key={task.id}
                      className="bg-[var(--surface)] border border-[var(--border-dim)] rounded p-3 cursor-pointer hover:border-[var(--accent)]/40 transition-colors group"
                      onClick={() => setSelectedTask(task)}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="font-body text-sm text-[var(--text-1)] font-medium leading-snug flex-1">
                          {task.title}
                        </span>
                        <PriorityBadge priority={task.priority} />
                      </div>

                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                          {task.assigned_by_profile && (
                            <TeamAvatarChip name={task.assigned_by_profile.name} role={task.assigned_by_profile.role} size="sm" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {task.due_date && (
                            <span className={`font-mono text-[10px] tabular-nums ${overdue ? 'text-[var(--critical)]' : 'text-[var(--text-3)]'}`}>
                              {formatDate(task.due_date)}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[10px] text-[var(--text-3)] opacity-0 group-hover:opacity-100 h-5 px-1.5"
                            onClick={(e) => { e.stopPropagation(); setSelectedTask(task) }}
                          >
                            →
                          </Button>
                        </div>
                      </div>

                      {/* Quick move buttons */}
                      <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {col !== 'todo' && (
                          <button
                            className="font-mono text-[9px] px-1.5 py-0.5 border border-[var(--border-dim)] text-[var(--text-3)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors rounded-sm"
                            onClick={(e) => { e.stopPropagation(); moveTask(task.id, col === 'in_progress' ? 'todo' : 'in_progress') }}
                          >
                            ← {col === 'in_progress' ? 'TODO' : 'В РАБОТУ'}
                          </button>
                        )}
                        {col !== 'done' && (
                          <button
                            className="font-mono text-[9px] px-1.5 py-0.5 border border-[var(--border-dim)] text-[var(--text-3)] hover:border-[var(--done)] hover:text-[var(--done)] transition-colors rounded-sm ml-auto"
                            onClick={(e) => { e.stopPropagation(); moveTask(task.id, col === 'todo' ? 'in_progress' : 'done') }}
                          >
                            {col === 'todo' ? 'В РАБОТУ' : 'ГОТОВО'} →
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}

                {colTasks.length === 0 && (
                  <div className="border border-dashed border-[var(--border-dim)] rounded py-8 text-center">
                    <span className="font-mono text-[11px] text-[var(--text-3)]">— пусто —</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <GlobalTaskModal open={modalOpen} onOpenChange={setModalOpen} profile={currentProfile} defaultWorkspace="dev" onCreated={load} />
      <TaskDrawer task={selectedTask} currentProfile={currentProfile} onClose={() => setSelectedTask(null)} onUpdated={load} />
    </AppLayout>
  )
}
