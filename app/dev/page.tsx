'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { TaskDrawer } from '@/components/TaskDrawer'
import { TaskCreateDrawer } from '@/components/TaskCreateDrawer'
import { TeamAvatarChip } from '@/components/TeamAvatarChip'
import { createClient } from '@/lib/supabase/client'
import { formatDate, isOverdue } from '@/lib/utils'
import type { Task, Profile, TaskStatus } from '@/types'
import { STATUS_LABELS } from '@/types'
import { Plus } from 'lucide-react'

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'todo',        label: 'TODO',     color: '#484f58' },
  { status: 'in_progress', label: 'В РАБОТЕ', color: '#f59e0b' },
  { status: 'done',        label: 'ГОТОВО',   color: '#238636' },
]

const PRIORITY_BORDER: Record<string, string> = {
  critical: '#ef4444',
  high:     '#f59e0b',
  medium:   '#2EF2C4',
  low:      '#484f58',
}

export default function DevPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const [tr, pr] = await Promise.all([
      supabase
        .from('tasks')
        .select('*, assigned_to_profile:profiles!assigned_to(*), assigned_by_profile:profiles!assigned_by(*)')
        .eq('workspace', 'dev')
        .order('created_at', { ascending: false }),
      supabase.from('profiles').select('*'),
    ])
    const profileList = (pr.data ?? []) as Profile[]
    setTasks((tr.data ?? []) as Task[])
    setCurrentProfile(profileList.find(p => p.id === user?.id) ?? null)
  }, [])

  useEffect(() => { load() }, [load])

  async function moveTask(taskId: string, newStatus: TaskStatus) {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tasks').update({
      status: newStatus,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    }).eq('id', taskId)
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

  const byStatus = (status: TaskStatus) =>
    tasks.filter(t => t.status === status || (status === 'in_progress' && t.status === 'review'))

  return (
    <AppLayout title="Разработка" profile={currentProfile}>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-5">
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)' }}>
          {tasks.length} задач
        </span>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-2 transition-colors"
          style={{
            padding: '7px 16px',
            background: 'var(--accent)', color: 'var(--bg)',
            fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13,
            borderRadius: 4, border: 'none', cursor: 'pointer',
          }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Новая задача
        </button>
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-3 gap-4" style={{ height: 'calc(100vh - 190px)' }}>
        {COLUMNS.map(col => {
          const colTasks = byStatus(col.status)
          return (
            <div key={col.status} className="flex flex-col min-h-0">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-3 px-1">
                <span
                  style={{
                    display: 'inline-block', width: 8, height: 8,
                    borderRadius: '50%', background: col.color, flexShrink: 0,
                  }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, color: 'var(--text-2)', letterSpacing: '0.1em' }}>
                  {col.label}
                </span>
                <span
                  className="ml-auto"
                  style={{
                    fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)',
                    background: 'var(--surface-2)', padding: '1px 7px', borderRadius: 2,
                  }}
                >
                  {colTasks.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                {colTasks.map(task => (
                  <KanbanCard
                    key={task.id}
                    task={task}
                    onOpen={() => setSelectedTask(task)}
                    onMove={moveTask}
                    colStatus={col.status}
                  />
                ))}

                {colTasks.length === 0 && (
                  <div
                    style={{
                      border: '1px dashed var(--border-dim)',
                      borderRadius: 4, padding: '32px 16px',
                      textAlign: 'center',
                      fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)',
                    }}
                  >
                    — пусто —
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <TaskCreateDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        currentProfile={currentProfile}
        defaultWorkspace="dev"
        onCreated={(newTask) => {
          // optimistic: add to list immediately, then sync
          if (newTask) setTasks(prev => [newTask as Task, ...prev])
          load()
        }}
      />

      <TaskDrawer
        task={selectedTask}
        currentProfile={currentProfile}
        onClose={() => setSelectedTask(null)}
        onUpdated={load}
      />
    </AppLayout>
  )
}

function KanbanCard({
  task, onOpen, onMove, colStatus,
}: {
  task: Task
  onOpen: () => void
  onMove: (id: string, s: TaskStatus) => void
  colStatus: TaskStatus
}) {
  const overdue = task.status !== 'done' && isOverdue(task.due_date)
  const borderColor = PRIORITY_BORDER[task.priority] ?? '#484f58'

  return (
    <div
      onClick={onOpen}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-dim)',
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 4, padding: '12px 14px',
        cursor: 'pointer', transition: 'border-color 0.15s',
        position: 'relative',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(46,242,196,0.3)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-dim)')}
    >
      {/* Title */}
      <p style={{
        fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 14,
        color: 'var(--text-1)', marginBottom: 10, lineHeight: 1.4,
      }}>
        {task.title}
      </p>

      {/* Assignee + author row */}
      <div className="flex items-center gap-2 mb-2">
        {task.assigned_to_profile && (
          <TeamAvatarChip
            name={(task.assigned_to_profile as Profile).name}
            role={(task.assigned_to_profile as Profile).role}
            color={(task.assigned_to_profile as Profile).avatar_color}
            size="sm"
          />
        )}
        {task.assigned_by_profile && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)' }}>
            от {(task.assigned_by_profile as Profile).name}
          </span>
        )}
      </div>

      {/* Deadline */}
      {task.due_date && (
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11,
          color: overdue ? 'var(--critical)' : 'var(--text-3)',
          marginBottom: 8,
        }}>
          {overdue ? '⚠ ' : ''}{formatDate(task.due_date)}
        </div>
      )}

      {/* Move buttons */}
      <div
        className="flex gap-1.5 mt-2"
        onClick={e => e.stopPropagation()}
      >
        {colStatus !== 'todo' && (
          <MoveBtn
            label="← TODO"
            onClick={() => onMove(task.id, 'todo')}
          />
        )}
        {colStatus === 'todo' && (
          <MoveBtn
            label="В работу →"
            onClick={() => onMove(task.id, 'in_progress')}
          />
        )}
        {colStatus === 'in_progress' && (
          <>
            <MoveBtn label="← TODO" onClick={() => onMove(task.id, 'todo')} />
            <MoveBtn label="Готово →" onClick={() => onMove(task.id, 'done')} accent />
          </>
        )}
        {colStatus === 'done' && (
          <MoveBtn label="← В работу" onClick={() => onMove(task.id, 'in_progress')} />
        )}
      </div>
    </div>
  )
}

function MoveBtn({ label, onClick, accent }: { label: string; onClick: () => void; accent?: boolean }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '3px 8px',
        fontFamily: 'var(--font-mono)', fontSize: 10,
        border: `1px solid ${accent ? 'var(--done)' : 'var(--border-dim)'}`,
        color: accent ? 'var(--done)' : 'var(--text-3)',
        borderRadius: 2, background: 'transparent', cursor: 'pointer',
        transition: 'all 0.1s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = accent ? 'var(--done)' : 'var(--accent)'
        e.currentTarget.style.color = accent ? 'var(--done)' : 'var(--accent)'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = accent ? 'var(--done)' : 'var(--border-dim)'
        e.currentTarget.style.color = accent ? 'var(--done)' : 'var(--text-3)'
      }}
    >
      {label}
    </button>
  )
}
