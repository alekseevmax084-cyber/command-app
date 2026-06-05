'use client'
import { useState, useEffect, useCallback } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { formatDate } from '@/lib/utils'
import type { Profile, ContentEntry, Scenario, CompetitorAnalysis } from '@/types'
import { Plus, Edit2, Check, X } from 'lucide-react'

const SCENARIO_STATUS_LABELS: Record<string, string> = {
  hypothesis: 'ГИПОТЕЗА',
  testing: 'ТЕСТИРОВАНИЕ',
  active: 'АКТИВЕН',
  done: 'ЗАВЕРШЁН',
  rejected: 'ОТКЛОНЁН',
}

const SCENARIO_BADGE: Record<string, 'default' | 'accent' | 'done' | 'high' | 'low'> = {
  hypothesis: 'default',
  testing: 'high',
  active: 'accent',
  done: 'done',
  rejected: 'low',
}

export default function StrategyPage() {
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [contentEntries, setContentEntries] = useState<ContentEntry[]>([])
  const [scenarios, setScenarios] = useState<Scenario[]>([])
  const [competitors, setCompetitors] = useState<CompetitorAnalysis[]>([])
  const [scenarioModal, setScenarioModal] = useState(false)
  const [editingContentId, setEditingContentId] = useState<string | null>(null)
  const [editingCompId, setEditingCompId] = useState<string | null>(null)
  const [scenarioForm, setScenarioForm] = useState({
    title: '', channel: '', target_audience: '', hypothesis: '', expected_result: '', status: 'hypothesis', notes: '',
  })

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const [pr, ce, sc, comp] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('content_entries').select('*').order('post_date', { ascending: false }),
      supabase.from('scenarios').select('*').order('created_at', { ascending: false }),
      supabase.from('competitor_analysis').select('*').order('updated_at', { ascending: false }),
    ])
    setCurrentProfile((pr.data ?? []).find(p => p.id === user?.id) ?? null)
    setContentEntries((ce.data ?? []) as ContentEntry[])
    setScenarios((sc.data ?? []) as Scenario[])
    setCompetitors((comp.data ?? []) as CompetitorAnalysis[])
  }, [])

  useEffect(() => { load() }, [load])

  async function addContentRow() {
    const supabase = createClient()
    const { data, error } = await supabase.from('content_entries').insert({
      platform: '', account_name: '', content_type: '', reach: 0, engagement: 0,
    }).select().single()
    if (data) setEditingContentId(data.id)
    load()
  }

  async function saveContentRow(entry: ContentEntry) {
    const supabase = createClient()
    await supabase.from('content_entries').update(entry).eq('id', entry.id)
    setEditingContentId(null)
    load()
  }

  async function addCompetitorRow() {
    const supabase = createClient()
    const { data } = await supabase.from('competitor_analysis').insert({
      competitor_name: 'Новый конкурент', updated_at: new Date().toISOString(),
    }).select().single()
    if (data) setEditingCompId(data.id)
    load()
  }

  async function saveCompetitorRow(entry: CompetitorAnalysis) {
    const supabase = createClient()
    await supabase.from('competitor_analysis').update({ ...entry, updated_at: new Date().toISOString() }).eq('id', entry.id)
    setEditingCompId(null)
    load()
  }

  async function createScenario(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    await supabase.from('scenarios').insert(scenarioForm)
    setScenarioModal(false)
    setScenarioForm({ title: '', channel: '', target_audience: '', hypothesis: '', expected_result: '', status: 'hypothesis', notes: '' })
    load()
  }

  async function updateScenarioStatus(id: string, status: string) {
    const supabase = createClient()
    await supabase.from('scenarios').update({ status }).eq('id', id)
    load()
  }

  return (
    <AppLayout title="Стратегия" profile={currentProfile}>
      <div className="space-y-8">

        {/* Section 1: Content entries */}
        <section>
          <SectionHeader title="Контент и аккаунты" onAdd={addContentRow} />
          <div className="bg-[var(--surface)] border border-[var(--border-dim)]">
            <TableHeader cols={['Платформа', 'Аккаунт', 'Тип контента', 'Охват', 'Вовлечённость', 'Дата', 'Заметки', '']} />
            {contentEntries.length === 0 && <EmptyRow />}
            {contentEntries.map((entry) => (
              editingContentId === entry.id
                ? <ContentEditRow key={entry.id} entry={entry} onSave={saveContentRow} onCancel={() => setEditingContentId(null)} />
                : (
                  <div key={entry.id} className="grid items-center px-3 py-2.5 border-b border-[var(--border-dim)] last:border-0 hover:bg-[rgba(46,242,196,0.04)]"
                    style={{ gridTemplateColumns: '100px 120px 100px 80px 100px 90px 1fr 40px' }}>
                    <Cell>{entry.platform}</Cell>
                    <Cell>{entry.account_name}</Cell>
                    <Cell>{entry.content_type}</Cell>
                    <Cell mono>{entry.reach?.toLocaleString('ru')}</Cell>
                    <Cell mono>{entry.engagement?.toLocaleString('ru')}</Cell>
                    <Cell mono>{formatDate(entry.post_date)}</Cell>
                    <Cell>{entry.notes}</Cell>
                    <button onClick={() => setEditingContentId(entry.id)} className="text-[var(--text-3)] hover:text-[var(--accent)] transition-colors">
                      <Edit2 size={13} />
                    </button>
                  </div>
                )
            ))}
          </div>
        </section>

        {/* Section 2: Scenarios */}
        <section>
          <SectionHeader title="Сценарии" onAdd={() => setScenarioModal(true)} addLabel="Добавить сценарий" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {scenarios.length === 0 && (
              <div className="col-span-3 py-10 text-center font-mono text-xs text-[var(--text-3)]">— сценариев нет —</div>
            )}
            {scenarios.map((s) => (
              <div key={s.id} className="bg-[var(--surface)] border border-[var(--border-dim)] rounded p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="font-display font-bold text-[var(--text-1)]">{s.title}</span>
                  <Badge variant={SCENARIO_BADGE[s.status ?? 'hypothesis']}>
                    {SCENARIO_STATUS_LABELS[s.status ?? 'hypothesis']}
                  </Badge>
                </div>
                {s.channel && <div className="font-mono text-[10px] text-[var(--accent)] mb-2">📡 {s.channel}</div>}
                {s.target_audience && (
                  <div className="mb-2">
                    <span className="font-mono text-[10px] text-[var(--text-3)] uppercase tracking-wider">ЦА: </span>
                    <span className="text-xs text-[var(--text-2)]">{s.target_audience}</span>
                  </div>
                )}
                {s.hypothesis && (
                  <div className="mb-2">
                    <span className="font-mono text-[10px] text-[var(--text-3)] uppercase tracking-wider">Гипотеза: </span>
                    <span className="text-xs text-[var(--text-2)]">{s.hypothesis}</span>
                  </div>
                )}
                {s.expected_result && (
                  <div className="mb-3">
                    <span className="font-mono text-[10px] text-[var(--text-3)] uppercase tracking-wider">Ожидаем: </span>
                    <span className="text-xs text-[var(--text-2)]">{s.expected_result}</span>
                  </div>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {Object.entries(SCENARIO_STATUS_LABELS).filter(([k]) => k !== s.status).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => updateScenarioStatus(s.id, key)}
                      className="font-mono text-[9px] px-1.5 py-0.5 border border-[var(--border-dim)] text-[var(--text-3)] hover:border-[var(--accent)] hover:text-[var(--accent)] rounded-sm transition-colors"
                    >
                      → {label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Competitors */}
        <section>
          <SectionHeader title="Анализ конкурентов" onAdd={addCompetitorRow} />
          <div className="bg-[var(--surface)] border border-[var(--border-dim)]">
            <TableHeader cols={['Конкурент', 'Платформа', 'Подписчиков', 'Охват', 'Контент', 'Сильные', 'Слабые', 'Заметки', 'Обновлено', '']} />
            {competitors.length === 0 && <EmptyRow />}
            {competitors.map((c) => (
              editingCompId === c.id
                ? <CompetitorEditRow key={c.id} entry={c} onSave={saveCompetitorRow} onCancel={() => setEditingCompId(null)} />
                : (
                  <div key={c.id} className="grid items-center px-3 py-2.5 border-b border-[var(--border-dim)] last:border-0 hover:bg-[rgba(46,242,196,0.04)]"
                    style={{ gridTemplateColumns: '120px 90px 80px 80px 90px 120px 120px 120px 90px 36px' }}>
                    <Cell bold>{c.competitor_name}</Cell>
                    <Cell>{c.platform}</Cell>
                    <Cell mono>{c.followers?.toLocaleString('ru')}</Cell>
                    <Cell mono>{c.avg_reach?.toLocaleString('ru')}</Cell>
                    <Cell>{c.content_type}</Cell>
                    <Cell>{c.strengths}</Cell>
                    <Cell>{c.weaknesses}</Cell>
                    <Cell>{c.notes}</Cell>
                    <Cell mono>{formatDate(c.updated_at)}</Cell>
                    <button onClick={() => setEditingCompId(c.id)} className="text-[var(--text-3)] hover:text-[var(--accent)] transition-colors">
                      <Edit2 size={13} />
                    </button>
                  </div>
                )
            ))}
          </div>
        </section>
      </div>

      {/* Scenario modal */}
      <Dialog open={scenarioModal} onOpenChange={setScenarioModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Новый сценарий</DialogTitle>
          </DialogHeader>
          <form onSubmit={createScenario} className="space-y-3">
            <div><Label>Название *</Label><Input value={scenarioForm.title} onChange={e => setScenarioForm({ ...scenarioForm, title: e.target.value })} required /></div>
            <div><Label>Канал</Label><Input value={scenarioForm.channel} onChange={e => setScenarioForm({ ...scenarioForm, channel: e.target.value })} /></div>
            <div><Label>Целевая аудитория</Label><Input value={scenarioForm.target_audience} onChange={e => setScenarioForm({ ...scenarioForm, target_audience: e.target.value })} /></div>
            <div><Label>Гипотеза</Label><Textarea rows={2} value={scenarioForm.hypothesis} onChange={e => setScenarioForm({ ...scenarioForm, hypothesis: e.target.value })} /></div>
            <div><Label>Ожидаемый результат</Label><Textarea rows={2} value={scenarioForm.expected_result} onChange={e => setScenarioForm({ ...scenarioForm, expected_result: e.target.value })} /></div>
            <div>
              <Label>Статус</Label>
              <Select value={scenarioForm.status} onValueChange={v => setScenarioForm({ ...scenarioForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(SCENARIO_STATUS_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setScenarioModal(false)}>Отмена</Button>
              <Button type="submit" variant="default">Создать</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}

function SectionHeader({ title, onAdd, addLabel = 'Добавить строку' }: { title: string; onAdd: () => void; addLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display font-bold text-base text-[var(--text-1)] uppercase tracking-wider">{title}</h2>
      <Button variant="outline" size="sm" onClick={onAdd}><Plus size={13} /> {addLabel}</Button>
    </div>
  )
}

function TableHeader({ cols }: { cols: string[] }) {
  return (
    <div className="flex border-b border-[var(--border-dim)] bg-[var(--surface-2)]">
      {cols.map((c) => (
        <div key={c} className="px-3 py-2 font-mono text-[10px] text-[var(--text-3)] uppercase tracking-wider flex-1 shrink-0 min-w-0">
          {c}
        </div>
      ))}
    </div>
  )
}

function Cell({ children, mono, bold }: { children?: React.ReactNode; mono?: boolean; bold?: boolean }) {
  return (
    <div className={`px-1 truncate text-xs ${mono ? 'font-mono tabular-nums text-[var(--text-2)]' : 'font-body text-[var(--text-2)]'} ${bold ? 'font-medium text-[var(--text-1)]' : ''}`}>
      {children || <span className="text-[var(--text-3)]">—</span>}
    </div>
  )
}

function EmptyRow() {
  return (
    <div className="py-6 text-center font-mono text-xs text-[var(--text-3)]">— нет данных —</div>
  )
}

function ContentEditRow({ entry, onSave, onCancel }: { entry: ContentEntry; onSave: (e: ContentEntry) => void; onCancel: () => void }) {
  const [data, setData] = useState(entry)
  return (
    <div className="grid items-center px-3 py-2 border-b border-[var(--border-dim)] bg-[var(--surface-2)]"
      style={{ gridTemplateColumns: '100px 120px 100px 80px 100px 90px 1fr 60px' }}>
      <EditInput value={data.platform ?? ''} onChange={v => setData({ ...data, platform: v })} />
      <EditInput value={data.account_name ?? ''} onChange={v => setData({ ...data, account_name: v })} />
      <EditInput value={data.content_type ?? ''} onChange={v => setData({ ...data, content_type: v })} />
      <EditInput value={String(data.reach ?? '')} onChange={v => setData({ ...data, reach: Number(v) })} />
      <EditInput value={String(data.engagement ?? '')} onChange={v => setData({ ...data, engagement: Number(v) })} />
      <EditInput value={data.post_date ?? ''} onChange={v => setData({ ...data, post_date: v })} type="date" />
      <EditInput value={data.notes ?? ''} onChange={v => setData({ ...data, notes: v })} />
      <div className="flex gap-1">
        <button onClick={() => onSave(data)} className="text-[var(--done)] hover:text-[var(--done)]/80"><Check size={13} /></button>
        <button onClick={onCancel} className="text-[var(--text-3)] hover:text-[var(--critical)]"><X size={13} /></button>
      </div>
    </div>
  )
}

function CompetitorEditRow({ entry, onSave, onCancel }: { entry: CompetitorAnalysis; onSave: (e: CompetitorAnalysis) => void; onCancel: () => void }) {
  const [data, setData] = useState(entry)
  return (
    <div className="grid items-center px-3 py-2 border-b border-[var(--border-dim)] bg-[var(--surface-2)]"
      style={{ gridTemplateColumns: '120px 90px 80px 80px 90px 120px 120px 120px 90px 60px' }}>
      <EditInput value={data.competitor_name} onChange={v => setData({ ...data, competitor_name: v })} />
      <EditInput value={data.platform ?? ''} onChange={v => setData({ ...data, platform: v })} />
      <EditInput value={String(data.followers ?? '')} onChange={v => setData({ ...data, followers: Number(v) })} />
      <EditInput value={String(data.avg_reach ?? '')} onChange={v => setData({ ...data, avg_reach: Number(v) })} />
      <EditInput value={data.content_type ?? ''} onChange={v => setData({ ...data, content_type: v })} />
      <EditInput value={data.strengths ?? ''} onChange={v => setData({ ...data, strengths: v })} />
      <EditInput value={data.weaknesses ?? ''} onChange={v => setData({ ...data, weaknesses: v })} />
      <EditInput value={data.notes ?? ''} onChange={v => setData({ ...data, notes: v })} />
      <div className="font-mono text-[10px] text-[var(--text-3)]">{formatDate(new Date())}</div>
      <div className="flex gap-1">
        <button onClick={() => onSave(data)} className="text-[var(--done)] hover:text-[var(--done)]/80"><Check size={13} /></button>
        <button onClick={onCancel} className="text-[var(--text-3)] hover:text-[var(--critical)]"><X size={13} /></button>
      </div>
    </div>
  )
}

function EditInput({ value, onChange, type = 'text' }: { value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-transparent border-b border-[var(--accent)]/50 text-xs text-[var(--text-1)] px-1 py-0.5 outline-none focus:border-[var(--accent)]"
    />
  )
}
