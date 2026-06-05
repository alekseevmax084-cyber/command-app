import { createClient } from '@/lib/supabase/server'
import { AppLayout } from '@/components/AppLayout'
import { TeamAvatarChip } from '@/components/TeamAvatarChip'
import { ActivityFeed } from '@/components/ActivityFeed'
import { formatDate, isOverdue } from '@/lib/utils'
import type { Profile, Task, TaskHistory } from '@/types'
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react'

export default async function ProgressPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [profilesRes, tasksRes, historyRes] = await Promise.all([
    supabase.from('profiles').select('*').order('created_at'),
    supabase.from('tasks').select('*, assigned_to_profile:profiles!assigned_to(*), assigned_by_profile:profiles!assigned_by(*)'),
    supabase.from('task_history').select('*, profile:profiles(*)').order('created_at', { ascending: false }).limit(30),
  ])

  const profiles: Profile[] = profilesRes.data ?? []
  const tasks: Task[] = tasksRes.data ?? []
  const history: TaskHistory[] = historyRes.data ?? []
  const currentProfile = profiles.find(p => p.id === user?.id) ?? null

  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay() + 1)
  weekStart.setHours(0, 0, 0, 0)

  function getStats(profileId: string) {
    const mine = tasks.filter(t => t.assigned_to === profileId)
    const doneThisWeek = mine.filter(t =>
      t.status === 'done' && t.updated_at && new Date(t.updated_at) >= weekStart
    ).length
    const inProgress = mine.filter(t => t.status === 'in_progress' || t.status === 'review').length
    const overdue = mine.filter(t => t.status !== 'done' && t.due_date && isOverdue(t.due_date)).length
    const nextDeadline = mine
      .filter(t => t.status !== 'done' && t.due_date)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0]
    const lastActivity = history.find(h => h.user_id === profileId)
    return { doneThisWeek, inProgress, overdue, nextDeadline, lastActivity }
  }

  return (
    <AppLayout title="Прогресс команды" profile={currentProfile}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {profiles.map((p) => {
          const stats = getStats(p.id)
          return (
            <div key={p.id} className="bg-[var(--surface)] border border-[var(--border-dim)] rounded p-5">
              <div className="flex items-center gap-3 mb-5">
                <TeamAvatarChip name={p.name} role={p.role} color={p.avatar_color} />
                <div>
                  <div className="font-display font-bold text-[var(--text-1)]">{p.name}</div>
                  <div className="font-mono text-[10px] text-[var(--text-3)] uppercase tracking-wider">{p.role}</div>
                </div>
              </div>
              <div className="space-y-2">
                <StatRow icon={<CheckCircle2 size={13} style={{ color: 'var(--done)' }} />} label="Выполнено на неделе" value={stats.doneThisWeek} />
                <StatRow icon={<Clock size={13} style={{ color: 'var(--high)' }} />} label="В работе" value={stats.inProgress} />
                <StatRow
                  icon={<AlertTriangle size={13} style={{ color: stats.overdue > 0 ? 'var(--critical)' : 'var(--text-3)' }} />}
                  label="Просрочено"
                  value={stats.overdue}
                  alert={stats.overdue > 0}
                />
              </div>
              {stats.nextDeadline && (
                <div className="mt-4 pt-4 border-t border-[var(--border-dim)]">
                  <div className="font-mono text-[10px] text-[var(--text-3)] uppercase tracking-wider mb-1">Ближайший дедлайн</div>
                  <div className="font-body text-xs text-[var(--text-2)] truncate">{stats.nextDeadline.title}</div>
                  <div className="font-mono text-[11px] text-[var(--text-3)] mt-0.5">{formatDate(stats.nextDeadline.due_date)}</div>
                </div>
              )}
              {stats.lastActivity && (
                <div className="mt-3 font-mono text-[10px] text-[var(--text-3)] truncate">
                  Активность: {stats.lastActivity.detail?.slice(0, 40)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="bg-[var(--surface)] border border-[var(--border-dim)] rounded">
        <div className="px-5 py-3 border-b border-[var(--border-dim)]">
          <h2 className="font-display font-bold text-sm text-[var(--text-2)] uppercase tracking-wider">Лента событий</h2>
        </div>
        <ActivityFeed items={history as Parameters<typeof ActivityFeed>[0]['items']} />
      </div>
    </AppLayout>
  )
}

function StatRow({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: number; alert?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-[var(--text-3)]">
        {icon}
        <span className="font-body text-xs">{label}</span>
      </div>
      <span className={`font-mono text-sm font-medium tabular-nums ${alert ? 'text-[var(--critical)]' : 'text-[var(--text-1)]'}`}>
        {value}
      </span>
    </div>
  )
}
