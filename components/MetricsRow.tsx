import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Metric {
  label: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'neutral'
  sub?: string
}

interface Props {
  metrics: Metric[]
  className?: string
}

export function MetricsRow({ metrics, className }: Props) {
  return (
    <div className={cn('grid gap-px', className)} style={{ gridTemplateColumns: `repeat(${metrics.length}, 1fr)` }}>
      {metrics.map((m, i) => (
        <div key={i} className="bg-[var(--surface)] border border-[var(--border-dim)] px-5 py-4">
          <div className="flex items-end gap-2 mb-1">
            <span className="font-mono text-2xl font-medium text-[var(--text-1)] tabular-nums leading-none">
              {m.value}
            </span>
            {m.unit && <span className="font-mono text-sm text-[var(--text-3)] mb-0.5">{m.unit}</span>}
            {m.trend && m.trend !== 'neutral' && (
              <span className={cn('mb-0.5', m.trend === 'up' ? 'text-[var(--accent)]' : 'text-[var(--critical)]')}>
                {m.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              </span>
            )}
          </div>
          <div className="font-body text-xs text-[var(--text-3)] uppercase tracking-wider">{m.label}</div>
          {m.sub && <div className="font-mono text-xs text-[var(--text-2)] mt-0.5">{m.sub}</div>}
        </div>
      ))}
    </div>
  )
}
