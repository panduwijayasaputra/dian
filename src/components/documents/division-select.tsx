'use client'

import { ChevronDown, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

type Division = { id: string; name: string }

interface DivisionSelectProps {
  value: string[]
  onChange: (ids: string[]) => void
  divisions: Division[]
  disabled?: boolean
}

export function DivisionSelect({ value, onChange, divisions, disabled }: DivisionSelectProps) {
  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id))
    } else {
      onChange([...value, id])
    }
  }

  function remove(id: string) {
    onChange(value.filter((v) => v !== id))
  }

  const selectedDivisions = divisions.filter((d) => value.includes(d.id))

  return (
    <div className="flex flex-col gap-2">
      <Popover>
        <PopoverTrigger
          disabled={disabled}
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm text-muted-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>{value.length === 0 ? 'Pilih divisi…' : `${value.length} divisi dipilih`}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-1" align="start">
          {divisions.length === 0 ? (
            <p className="px-2 py-1.5 text-sm text-muted-foreground">Belum ada divisi.</p>
          ) : (
            divisions.map((division) => {
              const checked = value.includes(division.id)
              return (
                <button
                  key={division.id}
                  type="button"
                  onClick={() => toggle(division.id)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                    }`}
                  >
                    {checked && (
                      <svg viewBox="0 0 10 10" className="h-3 w-3 fill-current">
                        <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {division.name}
                </button>
              )
            })
          )}
        </PopoverContent>
      </Popover>

      {selectedDivisions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedDivisions.map((d) => (
            <Badge key={d.id} variant="secondary" className="gap-1 pr-1">
              {d.name}
              <button
                type="button"
                onClick={() => remove(d.id)}
                disabled={disabled}
                className="ml-0.5 rounded-sm opacity-60 hover:opacity-100 disabled:pointer-events-none"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}
