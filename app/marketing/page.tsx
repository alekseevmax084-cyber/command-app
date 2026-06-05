'use client'
import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { MetricsRow } from '@/components/MetricsRow'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { MarketingEntry, Profile } from '@/types'
import { MONTH_NAMES } from '@/types'
import { Plus, Download, Columns } from 'lucide-react'
import { AgGridReact } from 'ag-grid-react'
import type { ColDef, CellValueChangedEvent, ValueGetterParams, ValueFormatterParams, CellClassParams } from 'ag-grid-community'
import 'ag-grid-community/styles/ag-grid.css'
import 'ag-grid-community/styles/ag-theme-alpine.css'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

function calcCPL(entry: MarketingEntry): number | null {
  if (entry.budget_spent && entry.leads_actual && entry.leads_actual > 0) {
    return Math.round(entry.budget_spent / entry.leads_actual)
  }
  return null
}

function calcROI(entry: MarketingEntry): number | null {
  if (entry.budget_spent && entry.product_price && entry.leads_actual && entry.budget_spent > 0) {
    return Math.round(((entry.leads_actual * entry.product_price - entry.budget_spent) / entry.budget_spent) * 100)
  }
  return null
}

const STATUS_COLORS: Record<string, string> = {
  active: 'var(--done)',
  paused: 'var(--high)',
  done: 'var(--text-3)',
  planned: 'var(--accent)',
}

const STATUS_LABELS: Record<string, string> = {
  active: 'АКТИВНА',
  paused: 'ПАУЗА',
  done: 'ГОТОВО',
  planned: 'ПЛАН',
}

export default function MarketingPage() {
  const [entries, setEntries] = useState<MarketingEntry[]>([])
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [customColModal, setCustomColModal] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [newColType, setNewColType] = useState('text')
  const gridRef = useRef<AgGridReact>(null)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const [er, pr] = await Promise.all([
      supabase.from('marketing_entries').select('*').order('year').order('month').order('created_at'),
      supabase.from('profiles').select('*'),
    ])
    setEntries((er.data ?? []) as MarketingEntry[])
    setProfiles(pr.data ?? [])
    setCurrentProfile((pr.data ?? []).find(p => p.id === user?.id) ?? null)
  }, [])

  useEffect(() => { load() }, [load])

  async function addRow() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('marketing_entries').insert({
      month: CURRENT_MONTH,
      year: CURRENT_YEAR,
      platform: '',
      status: 'planned',
      created_by: user?.id,
      budget_spent: 0,
      reach: 0,
      impressions: 0,
      clicks: 0,
      leads_forecast: 0,
      leads_actual: 0,
    })
    load()
  }

  async function addNewMonth() {
    const maxEntry = entries.reduce((acc, e) => {
      if (e.year > acc.year || (e.year === acc.year && e.month > acc.month)) return e
      return acc
    }, { year: CURRENT_YEAR, month: CURRENT_MONTH })

    let nextMonth = maxEntry.month + 1
    let nextYear = maxEntry.year
    if (nextMonth > 12) { nextMonth = 1; nextYear++ }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('marketing_entries').insert({
      month: nextMonth, year: nextYear,
      platform: '', status: 'planned',
      created_by: user?.id,
      budget_spent: 0, reach: 0, impressions: 0, clicks: 0,
      leads_forecast: 0, leads_actual: 0,
    })
    load()
  }

  async function onCellChanged(event: CellValueChangedEvent) {
    const entry = event.data as MarketingEntry
    if (!entry.id) return
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const updates: Partial<MarketingEntry> = {
      [event.colDef.field as string]: event.newValue,
      updated_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    }
    if (['budget_spent', 'leads_actual', 'product_price'].includes(event.colDef.field ?? '')) {
      const updated = { ...entry, [event.colDef.field as string]: event.newValue }
      const cpl = calcCPL(updated)
      const roi = calcROI(updated)
      if (cpl !== null) updates.cpl = cpl
      if (roi !== null) updates.roi = roi
    }
    await supabase.from('marketing_entries').update(updates).eq('id', entry.id)
    load()
  }

  function exportCSV() {
    gridRef.current?.api.exportDataAsCsv()
  }

  // Current month metrics
  const currentMonthEntries = entries.filter(e => e.month === CURRENT_MONTH && e.year === CURRENT_YEAR)
  const totalBudget = currentMonthEntries.reduce((s, e) => s + (e.budget_spent || 0), 0)
  const totalReach = currentMonthEntries.reduce((s, e) => s + (e.reach || 0), 0)
  const totalLeadsFact = currentMonthEntries.reduce((s, e) => s + (e.leads_actual || 0), 0)
  const totalLeadsPlan = currentMonthEntries.reduce((s, e) => s + (e.leads_forecast || 0), 0)

  const colDefs = useMemo<ColDef[]>(() => [
    {
      field: 'month',
      headerName: 'Месяц',
      rowGroup: true,
      hide: true,
      valueFormatter: (p: ValueFormatterParams) => p.value ? `${MONTH_NAMES[p.value]} ${p.data?.year ?? ''}` : '',
    },
    { field: 'platform', headerName: 'Площадка', width: 120, editable: true },
    { field: 'source', headerName: 'Источник', width: 100, editable: true },
    { field: 'asset_name', headerName: 'Кампания', width: 180, editable: true },
    { field: 'asset_type', headerName: 'Тип', width: 80, editable: true },
    {
      field: 'budget_spent', headerName: 'Бюджет ₽', width: 100, editable: true,
      cellClass: 'tabular',
      valueFormatter: (p: ValueFormatterParams) => p.value != null ? `₽ ${Number(p.value).toLocaleString('ru')}` : '',
      aggFunc: 'sum',
    },
    { field: 'reach', headerName: 'Охват', width: 90, editable: true, cellClass: 'tabular', aggFunc: 'sum' },
    { field: 'impressions', headerName: 'Показы', width: 90, editable: true, cellClass: 'tabular', aggFunc: 'sum' },
    { field: 'clicks', headerName: 'Клики', width: 80, editable: true, cellClass: 'tabular', aggFunc: 'sum' },
    { field: 'leads_forecast', headerName: 'Лидов план', width: 90, editable: true, cellClass: 'tabular', aggFunc: 'sum' },
    { field: 'leads_actual', headerName: 'Лидов факт', width: 90, editable: true, cellClass: 'tabular', aggFunc: 'sum' },
    {
      field: 'product_price', headerName: 'Цена ₽', width: 100, editable: true,
      cellClass: 'tabular',
      valueFormatter: (p: ValueFormatterParams) => p.value != null ? `₽ ${Number(p.value).toLocaleString('ru')}` : '',
    },
    {
      field: 'cpl', headerName: 'CPL', width: 90, editable: false,
      cellClass: 'tabular',
      valueGetter: (p: ValueGetterParams) => p.data ? calcCPL(p.data as MarketingEntry) : null,
      valueFormatter: (p: ValueFormatterParams) => p.value != null ? `₽ ${p.value}` : '—',
      aggFunc: 'avg',
    },
    {
      field: 'roi', headerName: 'ROI%', width: 80, editable: false,
      cellClass: 'tabular',
      valueGetter: (p: ValueGetterParams) => p.data ? calcROI(p.data as MarketingEntry) : null,
      valueFormatter: (p: ValueFormatterParams) => p.value != null ? `${p.value}%` : '—',
      cellStyle: (p: CellClassParams) => {
        if (p.value == null) return null
        return { color: p.value >= 0 ? 'var(--done)' : 'var(--critical)' }
      },
    },
    {
      field: 'status', headerName: 'Статус', width: 90, editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['active', 'paused', 'done', 'planned'] },
      cellRenderer: (p: { value: string }) => {
        if (!p.value) return null
        return `<span style="color:${STATUS_COLORS[p.value]};font-family:var(--font-mono);font-size:11px">${STATUS_LABELS[p.value] ?? p.value}</span>`
      },
    },
    { field: 'notes', headerName: 'Заметки', width: 150, editable: true },
    {
      field: 'updated_by', headerName: 'Изменил', width: 120, editable: false,
      valueFormatter: (p: ValueFormatterParams) => {
        if (!p.value) return '—'
        return profiles.find(pr => pr.id === p.value)?.name ?? '—'
      },
    },
  ], [profiles])

  return (
    <AppLayout title="Маркетинг" profile={currentProfile}>
      {/* Metrics */}
      <MetricsRow
        className="mb-5"
        metrics={[
          { label: 'Потрачено в этом месяце', value: `₽ ${totalBudget.toLocaleString('ru')}`, trend: 'neutral' },
          { label: 'Суммарный охват', value: totalReach.toLocaleString('ru'), trend: 'neutral' },
          { label: 'Лидов факт / план', value: `${totalLeadsFact}`, sub: `план: ${totalLeadsPlan}`, trend: totalLeadsFact >= totalLeadsPlan ? 'up' : 'down' },
        ]}
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <Button variant="outline" size="sm" onClick={addRow}><Plus size={14} /> Строка</Button>
        <Button variant="outline" size="sm" onClick={addNewMonth}><Plus size={14} /> Новый месяц</Button>
        <Button variant="outline" size="sm" onClick={() => setCustomColModal(true)}><Columns size={14} /> Колонка</Button>
        <Button variant="ghost" size="sm" onClick={exportCSV} className="ml-auto"><Download size={14} /> CSV</Button>
      </div>

      {/* AG Grid */}
      <div className="ag-theme-command" style={{ height: 'calc(100vh - 340px)', width: '100%' }}>
        <AgGridReact
          ref={gridRef}
          rowData={entries}
          columnDefs={colDefs}
          groupDisplayType="groupRows"
          rowGroupPanelShow="never"
          groupDefaultExpanded={1}
          suppressRowClickSelection
          animateRows
          onCellValueChanged={onCellChanged}
          defaultColDef={{
            sortable: true,
            resizable: true,
            suppressHeaderMenuButton: false,
          }}
          getRowStyle={(params) => {
            if (params.node.group) return { background: 'var(--surface-2)' }
            return params.node.rowIndex != null && params.node.rowIndex % 2 === 0
              ? { background: 'var(--surface)' }
              : { background: 'var(--bg)' }
          }}
        />
      </div>

      {/* Custom column modal */}
      <Dialog open={customColModal} onOpenChange={setCustomColModal}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Добавить колонку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input value={newColName} onChange={e => setNewColName(e.target.value)} placeholder="Название колонки" />
            </div>
            <div>
              <Label>Тип</Label>
              <Select value={newColType} onValueChange={setNewColType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Текст</SelectItem>
                  <SelectItem value="number">Число</SelectItem>
                  <SelectItem value="date">Дата</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setCustomColModal(false)}>Отмена</Button>
              <Button variant="default" onClick={async () => {
                if (!newColName.trim()) return
                const supabase = createClient()
                const { data: { user } } = await supabase.auth.getUser()
                await supabase.from('marketing_custom_columns').insert({
                  name: newColName, type: newColType, col_order: 99, visible: true, created_by: user?.id
                })
                setCustomColModal(false)
                setNewColName('')
              }}>Добавить</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  )
}
