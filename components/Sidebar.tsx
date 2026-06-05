'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Code2, BarChart2, Target, CheckSquare, Wrench,
  Activity, ChevronLeft, ChevronRight, LogOut, Terminal
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TeamAvatarChip } from '@/components/TeamAvatarChip'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/types'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

const WORKSPACES: NavItem[] = [
  { href: '/dev',       label: 'Программист', icon: Code2 },
  { href: '/marketing', label: 'Маркетолог',  icon: BarChart2 },
  { href: '/strategy',  label: 'Стратег',     icon: Target },
]

const TEAM: NavItem[] = [
  { href: '/tasks',     label: 'Задачи',   icon: CheckSquare },
  { href: '/revisions', label: 'Доработки', icon: Wrench },
  { href: '/',          label: 'Прогресс', icon: Activity },
]

interface Props {
  profile?: Profile | null
}

export function Sidebar({ profile }: Props) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className={cn(
        'flex flex-col h-screen bg-[var(--surface)] border-r border-[var(--border-dim)] transition-all duration-200 shrink-0',
        collapsed ? 'w-14' : 'w-60'
      )}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-14 border-b border-[var(--border-dim)] px-4 shrink-0',
        collapsed && 'justify-center px-0'
      )}>
        {collapsed ? (
          <Terminal size={18} style={{ color: 'var(--accent)' }} />
        ) : (
          <span className="font-display font-bold text-lg tracking-tight" style={{ color: 'var(--accent)' }}>
            COMMAND
          </span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4">
        {/* Workspaces */}
        <div>
          {!collapsed && (
            <div className="px-2 mb-2 font-mono text-[10px] text-[var(--text-3)] uppercase tracking-widest">
              Рабочие пространства
            </div>
          )}
          {WORKSPACES.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </div>

        {/* Team */}
        <div>
          {!collapsed && (
            <div className="px-2 mb-2 font-mono text-[10px] text-[var(--text-3)] uppercase tracking-widest">
              Команда
            </div>
          )}
          {TEAM.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} collapsed={collapsed} />
          ))}
        </div>
      </nav>

      {/* User + collapse */}
      <div className="border-t border-[var(--border-dim)] p-2 shrink-0">
        {profile && !collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 mb-2">
            <TeamAvatarChip name={profile.name} role={profile.role} color={profile.avatar_color} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[var(--text-1)] font-medium truncate">{profile.name}</div>
              <div className="text-[10px] text-[var(--text-3)] font-mono truncate">{profile.role}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-[var(--text-3)] hover:text-[var(--critical)] transition-colors p-1"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center py-1.5 text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)] rounded transition-colors"
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>
    </aside>
  )
}

function NavLink({ item, pathname, collapsed }: { item: NavItem; pathname: string; collapsed: boolean }) {
  const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-2.5 px-2 py-2 rounded text-sm transition-colors relative',
        isActive
          ? 'text-[var(--text-1)] bg-[var(--surface-2)]'
          : 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--surface-2)]',
        collapsed && 'justify-center'
      )}
    >
      {isActive && (
        <span className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r" style={{ background: 'var(--accent)' }} />
      )}
      <Icon size={16} className={isActive ? 'text-[var(--accent)]' : undefined} />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  )
}
