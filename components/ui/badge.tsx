import * as React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'accent' | 'critical' | 'high' | 'medium' | 'low' | 'done'
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-1.5 py-0.5 text-xs font-mono rounded-sm border',
        {
          'bg-[var(--surface-2)] text-[var(--text-2)] border-[var(--border-dim)]': variant === 'default',
          'bg-[var(--accent)]/10 text-[var(--accent)] border-[var(--accent)]/30': variant === 'accent' || variant === 'medium',
          'bg-[var(--critical)]/10 text-[var(--critical)] border-[var(--critical)]/30': variant === 'critical',
          'bg-[var(--high)]/10 text-[var(--high)] border-[var(--high)]/30': variant === 'high',
          'bg-[var(--low)]/20 text-[var(--text-3)] border-[var(--border-dim)]': variant === 'low',
          'bg-[var(--done)]/10 text-[var(--done)] border-[var(--done)]/30': variant === 'done',
        },
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
