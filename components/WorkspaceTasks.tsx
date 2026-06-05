'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TeamAvatarChip } from '@/components/TeamAvatarChip'
import { PriorityBadge } from '@/components/PriorityBadge'
import { Badge } from '@/components/ui/badge'
import { TaskCreateDrawer } from '@/components/TaskCreateDrawer'
import { TaskDrawer } from '@/components/TaskDrawer'
import { formatDate, isOverdue } from '@/lib/utils'
import type { Task, Profile, TaskWorkspace, TaskStatus } from '@/types'
import { STATUS_LABELS } from '@/types'
import { Plus } from 'lucide-react'

const STATUS_BADGE: Record<TaskStatus, 'default' | 'accent' | 'done' | 'high'> = {
  todo: 'default',
  in_progress: 'high',
  review: 'accent',
  done: 'done',
}

const PRIORITY_BORDER: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f59e0b',
  medium:   '#2EF2C4',
  low:      '#484f58',
}

interface Props {
  workspace: TaskWorkspace
  currentProfile: Profile | null
  title?: string
}

export function WorkspaceTasks({ workspace, currentProfile, title = 'Задачи' }: Props) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tasks')
      .select('*, assigned_to_profile:profiles!assigned_to(*), assigned_by_profile:profiles!assigned_by(*)')
      .eq('workspace', workspace)
      .neq('status', 'done')
      .order('created_at', { ascending: false })
    if (error) console.error(`WorkspaceTasks [${workspace}] error:`, error)
    setTasks((data ?? []) as Task[])
  }, [workspace])

  useEffect(() => { load() }, [load])

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
          color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {title}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', marginLeft: 8 }}>
            {tasks.length}
          </span>
        </h2>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1.5 transition-colors"
          style={{
            padding: '5px 12px', borderRadius: 4, cursor: 'pointer',
            background: 'transparent', border: '1px solid var(--border-dim)',
            fontFamily: 'var(--font-body)', fontSize: 12, color: 'var(--text-2)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-dim)'; e.currentTarget.style.color = 'var(--text-2)' }}
        >
          <Plus size={12} /> Задача
        </button>
      </div>

      {/* List */}
      <div style={{ border: '1px solid var(--border-dim)', borderRadius: 4, overflow: 'hidden' }}>
        {tasks.length === 0 ? (
          <div style={{
            padding: '20px', textAlign: 'center',
            fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)',
          }}>
            — задач нет —
          </div>
        ) : (
          tasks.map((task, i) => {
            const overdue = task.status !== 'done' && isOverdue(task.due_date)
            const border = PRIORITY_BORDER[task.priority] ?? '#484f58'
            return (
              <div
                key={task.id}
                onClick={() => setSelectedTask(task)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px',
                  borderLeft: `3px solid ${border}`,
                  borderBottom: i < tasks.length - 1 ? '1px solid var(--border-dim)' : 'none',
                  background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)',
                  cursor: 'pointer', transition: 'background 0.1s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(46,242,196,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'var(--surface)' : 'var(--bg)')}
              >
                <span style={{
                  flex: 1, fontFamily: 'var(--font-body)', fontSize: 13,
                  color: 'var(--text-1)', fontWeight: 500,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {task.title}
                </span>

                {task.assigned_to_profile && (
                  <TeamAvatarChip
                    name={(task.assigned_to_profile as Profile).name}
                    role={(task.assigned_to_profile as Profile).role}
                    color={(task.assigned_to_profile as Profile).avatar_color}
                    size="sm"
                  />
                )}

                <Badge variant={STATUS_BADGE[task.status]}>
                  {STATUS_LABELS[task.status]}
                </Badge>

                {task.due_date && (
                  <span style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11,
                    color: overdue ? 'var(--critical)' : 'var(--text-3)',
                    whiteSpace: 'nowrap',
                  }}>
                    {formatDate(task.due_date)}
                  </span>
                )}
              </div>
            )
          })
        )}
      </div>

      <TaskCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        currentProfile={currentProfile}
        defaultWorkspace={workspace}
        onCreated={(newTask) => {
          if (newTask) setTasks(prev => [newTask as Task, ...prev])
        }}
      />

      <TaskDrawer
        task={selectedTask}
        currentProfile={currentProfile}
        onClose={() => setSelectedTask(null)}
        onUpdated={load}
      />
    </section>
  )
}
