import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'COMMAND',
  description: 'Командный рабочий центр',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  )
}
