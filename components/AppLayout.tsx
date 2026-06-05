import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import type { Profile } from '@/types'

interface Props {
  title: string
  profile?: Profile | null
  children: React.ReactNode
}

export function AppLayout({ title, profile, children }: Props) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg)]">
      <Sidebar profile={profile} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header title={title} profile={profile} />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
