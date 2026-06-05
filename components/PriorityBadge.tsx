import { type TaskPriority, PRIORITY_LABELS } from '@/types'
import { cn } from '@/lib/utils'

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  critical: 'var(--critical)',
  high:     'var(--high)',
  medium:   'var(--medium)',
  low:      'var(--low)',
}

interface Props {
  priority: TaskPriority
  className?: string
}

export function PriorityBadge({ priority, className }: Props) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <span
        className="inline-block w-2 h-2 shrink-0"
        style={{ background: PRIORITY_COLORS[priority] }}
      />
      <span className="font-mono text-[11px] tracking-wider" style={{ color: PRIORITY_COLORS[priority] }}>
        {PRIORITY_LABELS[priority]}
      </span>
    </span>
  )
}
