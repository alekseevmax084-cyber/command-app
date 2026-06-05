import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'w-full bg-[var(--surface)] border border-[var(--border-dim)] text-[var(--text-1)]',
          'px-3 py-1.5 text-sm font-body rounded placeholder:text-[var(--text-3)]',
          'focus:outline-none focus:border-[var(--accent)] transition-colors',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'
