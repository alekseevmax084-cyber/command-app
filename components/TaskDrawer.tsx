'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Paperclip, Send, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PriorityBadge } from '@/components/PriorityBadge'
import { TeamAvatarChip } from '@/components/TeamAvatarChip'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { formatDate, formatRelative } from '@/lib/utils'
import type { Task, TaskComment, TaskHistory, TaskAttachment, Profile, TaskStatus, TaskPriority } from '@/types'
import { STATUS_LABELS } from '@/types'

interface Props {
  task: Task | null
  currentProfile: Profile | null
  onClose: () => void
  onUpdated: () => void
}

const STATUS_BADGE_VARIANT: Record<TaskStatus, 'default' | 'accent' | 'done' | 'high'> = {
  todo: 'default',
  in_progress: 'high',
  review: 'accent',
  done: 'done',
}

export function TaskDrawer({ task, currentProfile, onClose, onUpdated }: Props) {
  const [comments, setComments] = useState<TaskComment[]>([])
  const [history, setHistory] = useState<TaskHistory[]>([])
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [newComment, setNewComment] = useState('')
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editStatus, setEditStatus] = useState<TaskStatus>('todo')
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium')
  const [editDue, setEditDue] = useState('')
  const [historyExpanded, setHistoryExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!task) return
    setEditTitle(task.title)
    setEditDesc(task.description ?? '')
    setEditStatus(task.status)
    setEditPriority(task.priority)
    setEditDue(task.due_date ?? '')
    loadData(task.id)
  }, [task])

  async function loadData(taskId: string) {
    const supabase = createClient()
    const [c, h, a] = await Promise.all([
      supabase.from('task_comments').select('*, profile:profiles(*)').eq('task_id', taskId).order('created_at'),
      supabase.from('task_history').select('*, profile:profiles(*)').eq('task_id', taskId).order('created_at', { ascending: false }),
      supabase.from('task_attachments').select('*').eq('task_id', taskId).order('uploaded_at', { ascending: false }),
    ])
    setComments((c.data ?? []) as TaskComment[])
    setHistory((h.data ?? []) as TaskHistory[])
    setAttachments((a.data ?? []) as TaskAttachment[])
  }

  async function saveField(field: string, value: unknown, detail: string) {
    if (!task || !currentProfile) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('tasks').update({
      [field]: value,
      updated_by: currentProfile.id,
      updated_at: new Date().toISOString(),
    }).eq('id', task.id)
    await supabase.from('task_history').insert({
      task_id: task.id,
      user_id: currentProfile.id,
      action: 'edited',
      detail,
    })
    setSaving(false)
    onUpdated()
    loadData(task.id)
  }

  async function handleStatusChange(newStatus: TaskStatus) {
    if (!task) return
    const oldLabel = STATUS_LABELS[task.status]
    const newLabel = STATUS_LABELS[newStatus]
    setEditStatus(newStatus)
    const supabase = createClient()
    await supabase.from('tasks').update({
      status: newStatus,
      updated_by: currentProfile?.id,
      updated_at: new Date().toISOString(),
    }).eq('id', task.id)
    if (currentProfile) {
      await supabase.from('task_history').insert({
        task_id: task.id,
        user_id: currentProfile.id,
        action: 'status_changed',
        detail: `${oldLabel} → ${newLabel}`,
      })
    }
    onUpdated()
    loadData(task.id)
  }

  async function sendComment() {
    if (!newComment.trim() || !task || !currentProfile) return
    const supabase = createClient()
    await supabase.from('task_comments').insert({
      task_id: task.id,
      user_id: currentProfile.id,
      text: newComment.trim(),
    })
    await supabase.from('task_history').insert({
      task_id: task.id,
      user_id: currentProfile.id,
      action: 'commented',
      detail: newComment.trim().slice(0, 80),
    })
    setNewComment('')
    loadData(task.id)
  }

  async function uploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !task || !currentProfile) return
    const supabase = createClient()
    const path = `tasks/${task.id}/${Date.now()}_${file.name}`
    const { data, error } = await supabase.storage.from('attachments').upload(path, file)
    if (error || !data) return
    const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path)
    await supabase.from('task_attachments').insert({
      task_id: task.id,
      user_id: currentProfile.id,
      file_url: publicUrl,
      file_name: file.name,
      file_type: file.type,
    })
    loadData(task.id)
  }

  if (!task) return null

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40"
        onClick={onClose}
      />
      <motion.aside
        key="drawer"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 w-[480px] bg-[var(--surface)] border-l border-[var(--border)] z-50 flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border-dim)] shrink-0">
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_BADGE_VARIANT[editStatus]}>
              {STATUS_LABELS[editStatus]}
            </Badge>
            <PriorityBadge priority={editPriority} />
          </div>
          <button onClick={onClose} className="text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          {/* Title */}
          <div className="px-5 pt-5 pb-4 border-b border-[var(--border-dim)]">
            <input
              className="w-full font-display font-bold text-xl text-[var(--text-1)] bg-transparent border-none outline-none focus:text-[var(--accent)] transition-colors"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={() => {
                if (editTitle.trim() !== task.title) {
                  saveField('title', editTitle.trim(), `заголовок изменён`)
                }
              }}
            />

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div>
                <Label>Статус</Label>
                <Select value={editStatus} onValueChange={(v) => handleStatusChange(v as TaskStatus)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">TODO</SelectItem>
                    <SelectItem value="in_progress">В работе</SelectItem>
                    <SelectItem value="review">Ревью</SelectItem>
                    <SelectItem value="done">Готово</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Приоритет</Label>
                <Select value={editPriority} onValueChange={(v) => {
                  setEditPriority(v as TaskPriority)
                  saveField('priority', v, `приоритет → ${v}`)
                }}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Критично</SelectItem>
                    <SelectItem value="high">Высокий</SelectItem>
                    <SelectItem value="medium">Средний</SelectItem>
                    <SelectItem value="low">Низкий</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-3">
              <Label>Дедлайн</Label>
              <Input
                type="date"
                value={editDue}
                onChange={(e) => setEditDue(e.target.value)}
                onBlur={() => saveField('due_date', editDue || null, `дедлайн → ${editDue}`)}
                className="text-xs"
              />
            </div>

            <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-3)] font-mono">
              {task.assigned_by_profile && (
                <span>Поставил: <span className="text-[var(--text-2)]">{task.assigned_by_profile.name}</span></span>
              )}
              {task.assigned_to_profile && (
                <span>Исполнитель: <span className="text-[var(--text-2)]">{task.assigned_to_profile.name}</span></span>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="px-5 py-4 border-b border-[var(--border-dim)]">
            <Label>Описание</Label>
            <Textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              onBlur={() => saveField('description', editDesc || null, 'описание изменено')}
              placeholder="Описание задачи..."
              rows={4}
            />
          </div>

          {/* Attachments */}
          <div className="px-5 py-4 border-b border-[var(--border-dim)]">
            <div className="flex items-center justify-between mb-2">
              <Label className="mb-0">Файлы ({attachments.length})</Label>
              <button
                onClick={() => fileRef.current?.click()}
                className="text-[var(--text-3)] hover:text-[var(--accent)] transition-colors"
              >
                <Paperclip size={14} />
              </button>
              <input ref={fileRef} type="file" className="hidden" onChange={uploadFile} />
            </div>
            {attachments.length > 0 && (
              <div className="space-y-1">
                {attachments.map((a) => (
                  <a
                    key={a.id}
                    href={a.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-2 py-1.5 bg-[var(--surface-2)] rounded hover:border-[var(--accent)] border border-[var(--border-dim)] transition-colors group"
                  >
                    <Paperclip size={12} className="text-[var(--text-3)]" />
                    <span className="font-mono text-xs text-[var(--text-2)] group-hover:text-[var(--accent)] truncate">
                      {a.file_name}
                    </span>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Comments */}
          <div className="px-5 py-4 border-b border-[var(--border-dim)]">
            <Label className="mb-3">Комментарии ({comments.length})</Label>
            <div className="space-y-3 mb-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  {c.profile && (
                    <TeamAvatarChip name={c.profile.name} role={c.profile.role} color={c.profile.avatar_color} size="sm" />
                  )}
                  <div className="flex-1 bg-[var(--surface-2)] rounded px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-[var(--text-1)]">{c.profile?.name}</span>
                      <span className="font-mono text-[10px] text-[var(--text-3)]">{formatRelative(c.created_at)}</span>
                    </div>
                    <p className="text-sm text-[var(--text-2)]">{c.text}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Написать комментарий..."
                rows={2}
                onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) sendComment() }}
                className="flex-1"
              />
              <button
                onClick={sendComment}
                className="self-end p-2 text-[var(--text-3)] hover:text-[var(--accent)] transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>

          {/* History */}
          <div className="px-5 py-4">
            <button
              className="flex items-center gap-2 text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors mb-2 font-mono text-xs uppercase tracking-wider"
              onClick={() => setHistoryExpanded(!historyExpanded)}
            >
              <Clock size={12} />
              История изменений ({history.length})
              {historyExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
            {historyExpanded && (
              <div className="space-y-1">
                {history.map((h) => (
                  <div key={h.id} className="flex items-start gap-2 py-1.5 border-b border-[var(--border-dim)] last:border-0">
                    <span className="font-mono text-[10px] text-[var(--text-3)] shrink-0 mt-0.5">{formatRelative(h.created_at)}</span>
                    <span className="text-xs text-[var(--text-2)]">
                      <span className="text-[var(--text-1)] font-medium">{h.profile?.name ?? '—'}</span>
                      {' · '}{h.detail}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  )
}

