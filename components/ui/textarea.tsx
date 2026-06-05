import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'w-full bg-[var(--surface)] border border-[var(--border-dim)] text-[var(--text-1)]',
          'px-3 py-2 text-sm font-body rounded placeholder:text-[var(--text-3)] resize-none',
          'focus:outline-none focus:border-[var(--accent)] transition-colors',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'
