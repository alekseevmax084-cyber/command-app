import { formatRelative } from '@/lib/utils'
import { TeamAvatarChip } from '@/components/TeamAvatarChip'
import type { TaskHistory, Profile } from '@/types'

interface ActivityItem {
  id: string
  action: string
  detail: string
  created_at: string
  profile?: Profile
}

interface Props {
  items: ActivityItem[]
  limit?: number
}

const ACTION_LABELS: Record<string, string> = {
  created: 'создал задачу',
  status_changed: 'изменил статус',
  edited: 'отредактировал',
  commented: 'прокомментировал',
}

export function ActivityFeed({ items, limit = 20 }: Props) {
  const visible = items.slice(0, limit)

  if (visible.length === 0) {
    return (
      <div className="py-8 text-center text-[var(--text-3)] font-mono text-xs">
        — активности нет —
      </div>
    )
  }

  return (
    <div className="divide-y divide-[var(--border-dim)]">
      {visible.map((item) => (
        <div key={item.id} className="flex items-start gap-3 py-3 px-4 hover:bg-[var(--surface)] transition-colors">
          {item.profile ? (
            <TeamAvatarChip
              name={item.profile.name}
              role={item.profile.role}
              color={item.profile.avatar_color}
              size="sm"
            />
          ) : (
            <span className="w-5 h-5 rounded-full bg-[var(--surface-2)] inline-block shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <span className="text-[var(--text-1)] text-sm">
              <span className="font-medium">{item.profile?.name ?? 'Система'}</span>{' '}
              <span className="text-[var(--text-2)]">{ACTION_LABELS[item.action] ?? item.action}</span>
            </span>
            {item.detail && (
              <p className="text-[var(--text-3)] font-mono text-xs mt-0.5 truncate">{item.detail}</p>
            )}
          </div>
          <span className="font-mono text-[11px] text-[var(--text-3)] shrink-0 mt-0.5">
            {formatRelative(item.created_at)}
          </span>
        </div>
      ))}
    </div>
  )
}
