"use client"

import { useState, ReactNode } from "react"
import { cn } from "@/lib/utils"

export interface Column<T> {
  key?: keyof T | string
  id?: string
  accessor?: keyof T | string
  header: string
  width?: string | number
  minWidth?: number
  maxWidth?: number
  align?: "left" | "center" | "right"
  sortable?: boolean
  render?: (value: any, row: T, index: number) => ReactNode
  cell?: (value: any, row: T, index: number) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  onRowClick?: (row: T) => void
  emptyMessage?: string
  loading?: boolean
  className?: string
  striped?: boolean
  selectable?: boolean
  selectedRows?: string[]
  onSelectionChange?: (rows: string[]) => void
  sortColumn?: string | null
  sortDirection?: 'asc' | 'desc'
  onSort?: (column: string, direction: 'asc' | 'desc') => void
  hoverable?: boolean
  activeRowId?: string
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  keyField,
  onRowClick,
  emptyMessage = "No data available",
  loading = false,
  className,
  striped = true,
  hoverable = true
}: DataTableProps<T>) {
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "asc" | "desc"
  } | null>(null)

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        if (prev.direction === "asc") return { key, direction: "desc" }
        if (prev.direction === "desc") return null
      }
      return { key, direction: "asc" }
    })
  }

  const sortedData = [...data].sort((a, b) => {
    if (!sortConfig) return 0
    const aValue = a[sortConfig.key]
    const bValue = b[sortConfig.key]
    if (aValue < bValue) return sortConfig.direction === "asc" ? -1 : 1
    if (aValue > bValue) return sortConfig.direction === "asc" ? 1 : -1
    return 0
  })

  const getValue = (row: T, key: string) => {
    const keys = key.split(".")
    let value: any = row
    for (const k of keys) {
      value = value?.[k]
    }
    return value
  }

  return (
    <div className={cn("overflow-hidden rounded-xl border border-gray-200 dark:border-white/10", className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead>
            <tr className="bg-gray-50 dark:bg-white/5">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  onClick={() => column.sortable && handleSort(String(column.key))}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold uppercase tracking-wider",
                    "text-gray-500 dark:text-gray-400",
                    "border-b border-gray-200 dark:border-white/10",
                    column.sortable && "cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-white/5",
                    column.align === "center" && "text-center",
                    column.align === "right" && "text-right"
                  )}
                  style={{ width: column.width }}
                >
                  <div className={cn(
                    "flex items-center gap-1",
                    column.align === "center" && "justify-center",
                    column.align === "right" && "justify-end"
                  )}>
                    {column.header}
                    {column.sortable && (
                      <span className="inline-flex flex-col">
                        <svg
                          className={cn(
                            "w-3 h-3 -mb-1",
                            sortConfig?.key === column.key && sortConfig?.direction === "asc"
                              ? "text-teal-500"
                              : "text-gray-300 dark:text-gray-600"
                          )}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 8l-6 6 1.41 1.41L12 10.83l4.59 4.58L18 14z" />
                        </svg>
                        <svg
                          className={cn(
                            "w-3 h-3 -mt-1",
                            sortConfig?.key === column.key && sortConfig?.direction === "desc"
                              ? "text-teal-500"
                              : "text-gray-300 dark:text-gray-600"
                          )}
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z" />
                        </svg>
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-gray-100 dark:divide-white/5">
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {columns.map((column, j) => (
                    <td key={j} className="px-4 py-4">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sortedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              sortedData.map((row, index) => (
                <tr
                  key={String(row[keyField])}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "transition-colors",
                    striped && index % 2 === 1 && "bg-gray-50/50 dark:bg-white/[0.02]",
                    hoverable && "hover:bg-teal-50/50 dark:hover:bg-teal-500/5",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((column) => {
                    const value = getValue(row, String(column.key))
                    return (
                      <td
                        key={String(column.key)}
                        className={cn(
                          "px-4 py-4 text-sm text-gray-700 dark:text-gray-200",
                          column.align === "center" && "text-center",
                          column.align === "right" && "text-right"
                        )}
                      >
                        {column.render ? column.render(value, row, index) : value}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Status badge helper for tables
export function StatusBadge({
  status,
  variant
}: {
  status: string
  variant: "success" | "warning" | "danger" | "info" | "default"
}) {
  const variants = {
    success: "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
    warning: "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400",
    danger: "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400",
    info: "bg-sky-100 dark:bg-sky-500/20 text-sky-700 dark:text-sky-400",
    default: "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
  }

  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
      variants[variant]
    )}>
      {status}
    </span>
  )
}
