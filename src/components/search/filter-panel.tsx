'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import { CalendarIcon, Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import type { SearchFilters } from '@/app/(app)/search/actions'

type FilterField = {
  key: 'documentNumber' | 'sender' | 'subject' | 'date'
  label: string
  isDate: boolean
}

const FILTER_FIELDS: FilterField[] = [
  { key: 'documentNumber', label: 'Nomor Surat', isDate: false },
  { key: 'sender', label: 'Pengirim', isDate: false },
  { key: 'subject', label: 'Perihal', isDate: false },
  { key: 'date', label: 'Tanggal', isDate: true },
]

function isDateActive(filters: SearchFilters) {
  return !!(filters.dateFrom || filters.dateTo)
}

function getAvailableFields(filters: SearchFilters): FilterField[] {
  return FILTER_FIELDS.filter((f) => {
    if (f.key === 'date') return !isDateActive(filters)
    return !filters[f.key as keyof SearchFilters]
  })
}

type FilterChip = {
  label: string
  onRemove: () => void
}

function buildChips(filters: SearchFilters, onChange: (f: SearchFilters) => void): FilterChip[] {
  const chips: FilterChip[] = []

  if (filters.documentNumber) {
    chips.push({
      label: `Nomor: ${filters.documentNumber}`,
      onRemove: () => onChange({ ...filters, documentNumber: undefined }),
    })
  }
  if (filters.sender) {
    chips.push({
      label: `Pengirim: ${filters.sender}`,
      onRemove: () => onChange({ ...filters, sender: undefined }),
    })
  }
  if (filters.subject) {
    chips.push({
      label: `Perihal: ${filters.subject}`,
      onRemove: () => onChange({ ...filters, subject: undefined }),
    })
  }
  if (filters.dateFrom || filters.dateTo) {
    const fromLabel = filters.dateFrom
      ? format(new Date(filters.dateFrom), 'd MMM yyyy', { locale: idLocale })
      : '...'
    const toLabel = filters.dateTo
      ? format(new Date(filters.dateTo), 'd MMM yyyy', { locale: idLocale })
      : '...'
    chips.push({
      label: `Tanggal: ${fromLabel} – ${toLabel}`,
      onRemove: () => onChange({ ...filters, dateFrom: undefined, dateTo: undefined }),
    })
  }

  return chips
}

type FilterPanelProps = {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
}

export function FilterPanel({ filters, onChange }: FilterPanelProps) {
  const [open, setOpen] = useState(false)
  const [selectedField, setSelectedField] = useState<FilterField | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined)
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined)

  const chips = buildChips(filters, onChange)
  const availableFields = getAvailableFields(filters)

  function resetPopover() {
    setSelectedField(null)
    setInputValue('')
    setDateFrom(undefined)
    setDateTo(undefined)
  }

  function handleFieldSelect(field: FilterField) {
    setSelectedField(field)
  }

  function handleApply() {
    if (!selectedField) return

    if (selectedField.isDate) {
      const next: SearchFilters = { ...filters }
      if (dateFrom) next.dateFrom = format(dateFrom, 'yyyy-MM-dd')
      if (dateTo) next.dateTo = format(dateTo, 'yyyy-MM-dd')
      if (dateFrom || dateTo) {
        onChange(next)
        setOpen(false)
        resetPopover()
      }
    } else {
      const trimmed = inputValue.trim()
      if (!trimmed) return
      onChange({ ...filters, [selectedField.key]: trimmed })
      setOpen(false)
      resetPopover()
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleApply()
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <Badge key={chip.label} variant="secondary" className="flex items-center gap-1 pr-1">
          <span>{chip.label}</span>
          <button
            onClick={chip.onRemove}
            className="ml-1 rounded-full hover:bg-muted p-0.5"
            aria-label="Hapus filter"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}

      {availableFields.length > 0 && (
        <Popover
          open={open}
          onOpenChange={(next) => {
            setOpen(next)
            if (!next) resetPopover()
          }}
        >
          <PopoverTrigger className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'h-7 gap-1 text-xs')}>
            <Plus className="h-3 w-3" />
            Tambah filter
          </PopoverTrigger>

          <PopoverContent className="w-72 p-3" align="start">
            {!selectedField ? (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Pilih filter</p>
                {availableFields.map((field) => (
                  <button
                    key={field.key}
                    onClick={() => handleFieldSelect(field)}
                    className="w-full rounded-md px-2 py-1.5 text-sm text-left hover:bg-accent transition-colors"
                  >
                    {field.label}
                  </button>
                ))}
              </div>
            ) : selectedField.isDate ? (
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Pilih rentang tanggal</p>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" /> Dari
                  </Label>
                  <Calendar
                    mode="single"
                    selected={dateFrom}
                    onSelect={setDateFrom}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <CalendarIcon className="h-3 w-3" /> Sampai
                  </Label>
                  <Calendar
                    mode="single"
                    selected={dateTo}
                    onSelect={setDateTo}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleApply} className="flex-1" disabled={!dateFrom && !dateTo}>
                    Terapkan
                  </Button>
                  <Button size="sm" variant="ghost" onClick={resetPopover}>
                    Kembali
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{selectedField.label}</p>
                <Input
                  autoFocus
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={`Masukkan ${selectedField.label.toLowerCase()}...`}
                  className="h-8 text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleApply} className="flex-1" disabled={!inputValue.trim()}>
                    Terapkan
                  </Button>
                  <Button size="sm" variant="ghost" onClick={resetPopover}>
                    Kembali
                  </Button>
                </div>
              </div>
            )}
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}
