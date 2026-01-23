'use client';

import { cn } from '@/lib/utils';
import { Plus, Copy, Trash2, MoreVertical, Check } from 'lucide-react';
import { useState } from 'react';

export type ScenarioType = 'baseline' | 'upside' | 'downside' | 'custom';

export interface ProformaScenario {
  id: string;
  name: string;
  scenarioType: ScenarioType;
  description?: string | null;
  isBaseCase?: boolean;
  projectionYears?: number;
  assumptions?: Record<string, unknown>;
  createdAt?: string;
}

interface ScenarioTabsProps {
  scenarios: ProformaScenario[];
  activeScenarioId?: string;
  onSelectScenario: (id: string) => void;
  onCreateScenario?: (type: ScenarioType) => void;
  onDuplicateScenario?: (id: string) => void;
  onDeleteScenario?: (id: string) => void;
  onRenameScenario?: (id: string, name: string) => void;
  className?: string;
}

const SCENARIO_TYPE_CONFIG: Record<
  ScenarioType,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  baseline: {
    label: 'Baseline',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  upside: {
    label: 'Upside',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  downside: {
    label: 'Downside',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  custom: {
    label: 'Custom',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
};

function ScenarioTab({
  scenario,
  isActive,
  onClick,
  onDuplicate,
  onDelete,
  onRename,
}: {
  scenario: ProformaScenario;
  isActive: boolean;
  onClick: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onRename?: (name: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(scenario.name);

  const config = SCENARIO_TYPE_CONFIG[scenario.scenarioType];

  const handleRename = () => {
    if (editName.trim() && editName !== scenario.name) {
      onRename?.(editName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      className={cn(
        'relative flex items-center gap-2 px-4 py-2 border-b-2 cursor-pointer transition-all',
        isActive
          ? `${config.bgColor} ${config.borderColor} border-b-[var(--accent-solid)]`
          : 'border-transparent hover:bg-[var(--gray-50)]'
      )}
      onClick={onClick}
    >
      {/* Scenario type indicator */}
      <span
        className={cn('px-1.5 py-0.5 rounded text-xs font-medium', config.bgColor, config.color)}
      >
        {config.label}
      </span>

      {/* Name */}
      {isEditing ? (
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleRename();
            if (e.key === 'Escape') {
              setEditName(scenario.name);
              setIsEditing(false);
            }
          }}
          onClick={(e) => e.stopPropagation()}
          className="px-1 py-0.5 text-sm font-medium bg-white border border-[var(--color-border-default)] rounded focus:outline-none focus:ring-1 focus:ring-[var(--accent-solid)]"
          autoFocus
        />
      ) : (
        <span
          className={cn(
            'text-sm font-medium',
            isActive ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)]'
          )}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (onRename) {
              setIsEditing(true);
            }
          }}
        >
          {scenario.name}
        </span>
      )}

      {/* Base case indicator */}
      {scenario.isBaseCase && (
        <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[var(--accent-bg)] text-[var(--accent-solid)] text-xs">
          <Check className="w-3 h-3" />
          Base
        </span>
      )}

      {/* Menu */}
      {(onDuplicate || onDelete) && (
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 rounded hover:bg-white/50 text-[var(--color-text-tertiary)]"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-[var(--color-border-default)] py-1 min-w-[140px]">
                {onRename && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      setIsEditing(true);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--gray-50)]"
                  >
                    Rename
                  </button>
                )}
                {onDuplicate && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onDuplicate();
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--gray-50)]"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                )}
                {onDelete && !scenario.isBaseCase && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      if (confirm(`Delete scenario "${scenario.name}"?`)) {
                        onDelete();
                      }
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ScenarioTabs({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onCreateScenario,
  onDuplicateScenario,
  onDeleteScenario,
  onRenameScenario,
  className,
}: ScenarioTabsProps) {
  const [showCreateMenu, setShowCreateMenu] = useState(false);

  // Sort scenarios: base case first, then by type
  const sortedScenarios = [...scenarios].sort((a, b) => {
    if (a.isBaseCase && !b.isBaseCase) return -1;
    if (!a.isBaseCase && b.isBaseCase) return 1;
    const typeOrder: ScenarioType[] = ['baseline', 'upside', 'downside', 'custom'];
    return typeOrder.indexOf(a.scenarioType) - typeOrder.indexOf(b.scenarioType);
  });

  return (
    <div className={cn('flex items-center border-b border-[var(--color-border-default)]', className)}>
      {/* Scenario tabs */}
      <div className="flex items-center overflow-x-auto">
        {sortedScenarios.map((scenario) => (
          <ScenarioTab
            key={scenario.id}
            scenario={scenario}
            isActive={activeScenarioId === scenario.id}
            onClick={() => onSelectScenario(scenario.id)}
            onDuplicate={onDuplicateScenario ? () => onDuplicateScenario(scenario.id) : undefined}
            onDelete={onDeleteScenario ? () => onDeleteScenario(scenario.id) : undefined}
            onRename={onRenameScenario ? (name) => onRenameScenario(scenario.id, name) : undefined}
          />
        ))}
      </div>

      {/* Add scenario button */}
      {onCreateScenario && (
        <div className="relative ml-2">
          <button
            type="button"
            onClick={() => setShowCreateMenu(!showCreateMenu)}
            className="flex items-center gap-1 px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--gray-50)] rounded transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Scenario
          </button>

          {showCreateMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowCreateMenu(false)} />
              <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-[var(--color-border-default)] py-1 min-w-[160px]">
                {(['baseline', 'upside', 'downside', 'custom'] as ScenarioType[]).map((type) => {
                  const config = SCENARIO_TYPE_CONFIG[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setShowCreateMenu(false);
                        onCreateScenario(type);
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--gray-50)]"
                    >
                      <span
                        className={cn(
                          'w-2 h-2 rounded-full',
                          type === 'baseline' && 'bg-blue-500',
                          type === 'upside' && 'bg-green-500',
                          type === 'downside' && 'bg-red-500',
                          type === 'custom' && 'bg-purple-500'
                        )}
                      />
                      {config.label}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
