export type UserRole = 'programmer' | 'marketer' | 'strategist'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done'
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical'
export type TaskWorkspace = 'dev' | 'marketing' | 'strategy' | 'revisions' | 'general'
export type RevisionStatus = 'pending' | 'in_progress' | 'done'
export type MarketingStatus = 'active' | 'paused' | 'done' | 'planned'

export interface Profile {
  id: string
  name: string
  role: UserRole
  avatar_color: string
  created_at: string
}

export interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  assigned_to: string | null
  assigned_by: string | null
  workspace: TaskWorkspace | null
  due_date: string | null
  created_at: string
  updated_at: string
  updated_by: string | null
  assigned_to_profile?: Profile
  assigned_by_profile?: Profile
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  text: string
  created_at: string
  profile?: Profile
}

export interface TaskAttachment {
  id: string
  task_id: string
  user_id: string
  file_url: string
  file_name: string
  file_type: string
  uploaded_at: string
}

export interface TaskHistory {
  id: string
  task_id: string
  user_id: string
  action: string
  detail: string
  created_at: string
  profile?: Profile
}

export interface MarketingEntry {
  id: string
  month: number
  year: number
  platform: string | null
  source: string | null
  asset_name: string | null
  asset_type: string | null
  budget_spent: number
  reach: number
  impressions: number
  clicks: number
  leads_forecast: number
  leads_actual: number
  product_price: number | null
  cpl: number | null
  roi: number | null
  notes: string | null
  status: MarketingStatus
  extra_data: Record<string, unknown>
  created_by: string | null
  updated_by: string | null
  updated_at: string
}

export interface MarketingCustomColumn {
  id: string
  name: string
  type: string
  col_order: number
  visible: boolean
  created_by: string | null
}

export interface Revision {
  id: string
  title: string
  description: string | null
  assigned_to: string | null
  assigned_by: string | null
  due_date: string | null
  reminder_date: string | null
  status: RevisionStatus
  priority: TaskPriority
  created_at: string
  updated_at: string
  assigned_to_profile?: Profile
  assigned_by_profile?: Profile
}

export interface ContentEntry {
  id: string
  platform: string | null
  account_name: string | null
  content_type: string | null
  reach: number | null
  engagement: number | null
  post_date: string | null
  notes: string | null
  created_at: string
}

export interface Scenario {
  id: string
  title: string
  channel: string | null
  target_audience: string | null
  hypothesis: string | null
  expected_result: string | null
  status: string | null
  notes: string | null
  created_at: string
}

export interface CompetitorAnalysis {
  id: string
  competitor_name: string
  platform: string | null
  followers: number | null
  avg_reach: number | null
  content_type: string | null
  strengths: string | null
  weaknesses: string | null
  notes: string | null
  updated_at: string
}

export const TEAM_MEMBERS: { name: string; role: UserRole; color: string; initial: string }[] = [
  { name: 'Ваня', role: 'programmer', color: '#3b82f6', initial: 'В' },
  { name: 'Саня', role: 'marketer', color: '#f97316', initial: 'С' },
  { name: 'Макс', role: 'strategist', color: '#2EF2C4', initial: 'М' },
]

export const PRIORITY_LABELS: Record<TaskPriority, string> = {
  critical: 'КРИТИЧНО',
  high: 'ВЫСОКИЙ',
  medium: 'СРЕДНИЙ',
  low: 'НИЗКИЙ',
}

export const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'TODO',
  in_progress: 'В РАБОТЕ',
  review: 'РЕВЬЮ',
  done: 'ГОТОВО',
}

export const WORKSPACE_LABELS: Record<TaskWorkspace, string> = {
  dev: 'Разработка',
  marketing: 'Маркетинг',
  strategy: 'Стратегия',
  revisions: 'Доработки',
  general: 'Общее',
}

export const MONTH_NAMES = [
  '', 'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
]
