'use client'
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

const AVATAR_CONFIG: Record<string, { color: string; initial: string }> = {
  programmer: { color: '#3b82f6', initial: 'В' },
  marketer:   { color: '#f97316', initial: 'С' },
  strategist: { color: '#2EF2C4', initial: 'М' },
}

interface Props {
  name: string
  role?: string
  color?: string
  size?: 'sm' | 'md'
  className?: string
}

export function TeamAvatarChip({ name, role, color, size = 'md', className }: Props) {
  const cfg = role ? AVATAR_CONFIG[role] : null
  const bg = color || cfg?.color || '#484f58'
  const initial = name?.charAt(0) || '?'
  const sizeClass = size === 'sm' ? 'w-5 h-5 text-[10px]' : 'w-7 h-7 text-xs'

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-full font-mono font-medium shrink-0 cursor-default',
              sizeClass,
              className
            )}
            style={{ background: bg, color: bg === '#2EF2C4' ? '#05080b' : '#fff' }}
          >
            {initial}
          </span>
        </TooltipTrigger>
        <TooltipContent>{name}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
