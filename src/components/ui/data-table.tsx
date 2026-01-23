'use client';

import { useState, useMemo, useCallback } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Check,
  Columns3,
  MoreHorizontal,
} from 'lucide-react';

export interface Column<T> {
  id: string;
  header: string;
  accessor: keyof T | ((row: T) => any);
  width?: number;
  minWidth?: number;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  cell?: (value: any, row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;

  // Selection
  selectable?: boolean;
  selectedRows?: string[];
  onSelectionChange?: (ids: string[]) => void;

  // Sorting
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: string, direction: 'asc' | 'desc') => void;

  // Row interaction
  onRowClick?: (row: T) => void;
  activeRowId?: string;

  // Display
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  sortColumn,
  sortDirection,
  onSort,
  onRowClick,
  activeRowId,
  loading = false,
  emptyMessage = 'No data found',
  className,
}: DataTableProps<T>) {
  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    columns.map((c) => c.id)
  );
  const [showColumnPicker, setShowColumnPicker] = useState(false);

  const getValue = useCallback((row: T, accessor: Column<T>['accessor']) => {
    if (typeof accessor === 'function') {
      return accessor(row);
    }
    return row[accessor];
  }, []);

  const handleSort = (columnId: string) => {
    if (!onSort) return;

    const column = columns.find((c) => c.id === columnId);
    if (!column?.sortable) return;

    if (sortColumn === columnId) {
      onSort(columnId, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(columnId, 'asc');
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;

    if (selectedRows.length === data.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(data.map((row) => String(row[keyField])));
    }
  };

  const handleSelectRow = (id: string) => {
    if (!onSelectionChange) return;

    if (selectedRows.includes(id)) {
      onSelectionChange(selectedRows.filter((r) => r !== id));
    } else {
      onSelectionChange([...selectedRows, id]);
    }
  };

  const toggleColumn = (columnId: string) => {
    if (visibleColumns.includes(columnId)) {
      setVisibleColumns(visibleColumns.filter((c) => c !== columnId));
    } else {
      setVisibleColumns([...visibleColumns, columnId]);
    }
  };

  const displayColumns = columns.filter((c) => visibleColumns.includes(c.id));

  if (loading) {
    return (
      <div className={cn('card overflow-hidden', className)}>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {selectable && <th style={{ width: 48 }}></th>}
                {displayColumns.map((column) => (
                  <th key={column.id} style={{ width: column.width, minWidth: column.minWidth }}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  {selectable && (
                    <td>
                      <div className="skeleton w-4 h-4 rounded" />
                    </td>
                  )}
                  {displayColumns.map((column) => (
                    <td key={column.id}>
                      <div className="skeleton skeleton-text" style={{ width: '80%' }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={cn('card', className)}>
        <div className="empty-state">
          <div className="empty-state-title">{emptyMessage}</div>
          <div className="empty-state-description">
            Try adjusting your filters or search criteria.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('card overflow-hidden', className)}>
      {/* Column Picker */}
      <div className="flex items-center justify-end px-4 py-2 border-b border-[var(--color-border-muted)] bg-[var(--gray-25)]">
        <div className="relative">
          <button
            onClick={() => setShowColumnPicker(!showColumnPicker)}
            className="btn btn-ghost btn-sm"
          >
            <Columns3 className="w-4 h-4" />
            Columns
          </button>

          {showColumnPicker && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowColumnPicker(false)}
              />
              <div className="dropdown-menu right-0 left-auto z-20 w-48">
                {columns.map((column) => (
                  <button
                    key={column.id}
                    onClick={() => toggleColumn(column.id)}
                    className="dropdown-item w-full text-left"
                  >
                    <span className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center',
                      visibleColumns.includes(column.id)
                        ? 'bg-[var(--accent-solid)] border-[var(--accent-solid)]'
                        : 'border-[var(--color-border-default)]'
                    )}>
                      {visibleColumns.includes(column.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </span>
                    <span className="flex-1">{column.header}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="data-table">
          <thead>
            <tr>
              {selectable && (
                <th style={{ width: 48 }}>
                  <input
                    type="checkbox"
                    checked={selectedRows.length === data.length && data.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-[var(--color-border-default)]"
                  />
                </th>
              )}
              {displayColumns.map((column) => (
                <th
                  key={column.id}
                  style={{ width: column.width, minWidth: column.minWidth }}
                  className={cn(
                    column.sortable && 'sortable',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                  onClick={() => column.sortable && handleSort(column.id)}
                >
                  <div className={cn(
                    'flex items-center gap-1',
                    column.align === 'center' && 'justify-center',
                    column.align === 'right' && 'justify-end'
                  )}>
                    {column.header}
                    {column.sortable && (
                      <span className="text-[var(--color-text-disabled)]">
                        {sortColumn === column.id ? (
                          sortDirection === 'asc' ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )
                        ) : (
                          <ChevronsUpDown className="w-3.5 h-3.5" />
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th style={{ width: 48 }}></th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const rowId = String(row[keyField]);
              const isSelected = selectedRows.includes(rowId);
              const isActive = activeRowId === rowId;

              return (
                <tr
                  key={rowId}
                  className={cn(
                    isSelected && 'selected',
                    isActive && 'active',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {selectable && (
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(rowId)}
                        className="w-4 h-4 rounded border-[var(--color-border-default)]"
                      />
                    </td>
                  )}
                  {displayColumns.map((column) => {
                    const value = getValue(row, column.accessor);

                    return (
                      <td
                        key={column.id}
                        className={cn(
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right'
                        )}
                      >
                        {column.cell ? column.cell(value, row) : value}
                      </td>
                    );
                  })}
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-sm p-1">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
