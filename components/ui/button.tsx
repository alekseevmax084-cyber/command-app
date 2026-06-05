'use client'
import * as React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'accent'
  size?: 'sm' | 'md' | 'lg'
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'outline', size = 'md', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-2 font-body text-sm font-medium transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed',
          'border border-[var(--border)]',
          {
            'bg-transparent text-[var(--text-1)] hover:bg-[var(--surface-2)] hover:border-[var(--accent)]': variant === 'outline',
            'bg-[var(--accent)] text-[var(--bg)] border-[var(--accent)] hover:bg-[var(--accent)]/90 font-semibold': variant === 'default' || variant === 'accent',
            'bg-transparent border-transparent text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]': variant === 'ghost',
            'bg-[var(--critical)]/10 border-[var(--critical)]/30 text-[var(--critical)] hover:bg-[var(--critical)]/20': variant === 'destructive',
          },
          {
            'px-2 py-1 text-xs rounded-sm': size === 'sm',
            'px-3 py-1.5 rounded': size === 'md',
            'px-4 py-2 text-base rounded': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }
)
Button.displayName = 'Button'
