'use client';

import { cn } from '@/lib/utils';
import type { ValuationMethod } from '@/lib/valuation/types';
import {
  Calculator,
  Bed,
  Building2,
  TrendingUp,
  Percent,
  Sparkles,
  Check,
} from 'lucide-react';

interface MethodSelectorProps {
  selectedMethods: ValuationMethod[];
  onMethodsChange: (methods: ValuationMethod[]) => void;
  availableMethods?: ValuationMethod[];
  disabledMethods?: ValuationMethod[];
}

const METHOD_CONFIG: Record<
  ValuationMethod,
  {
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  cap_rate: {
    label: 'Cap Rate',
    description: 'NOI / Cap Rate',
    icon: Calculator,
  },
  price_per_bed: {
    label: 'Price Per Bed',
    description: 'Beds × Market PPB',
    icon: Bed,
  },
  comparable_sales: {
    label: 'Comparable Sales',
    description: 'Weighted comp analysis',
    icon: Building2,
  },
  dcf: {
    label: 'DCF',
    description: 'Discounted cash flow',
    icon: TrendingUp,
  },
  noi_multiple: {
    label: 'NOI Multiple',
    description: 'NOI × Multiple',
    icon: Percent,
  },
  proprietary: {
    label: 'Proprietary',
    description: 'Custom algorithm',
    icon: Sparkles,
  },
};

export function MethodSelector({
  selectedMethods,
  onMethodsChange,
  availableMethods = ['cap_rate', 'price_per_bed', 'comparable_sales', 'dcf', 'noi_multiple'],
  disabledMethods = [],
}: MethodSelectorProps) {
  const toggleMethod = (method: ValuationMethod) => {
    if (disabledMethods.includes(method)) return;

    if (selectedMethods.includes(method)) {
      onMethodsChange(selectedMethods.filter((m) => m !== method));
    } else {
      onMethodsChange([...selectedMethods, method]);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[var(--color-text-secondary)]">
        Valuation Methods
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {availableMethods.map((method) => {
          const config = METHOD_CONFIG[method];
          const Icon = config.icon;
          const isSelected = selectedMethods.includes(method);
          const isDisabled = disabledMethods.includes(method);

          return (
            <button
              key={method}
              type="button"
              onClick={() => toggleMethod(method)}
              disabled={isDisabled}
              className={cn(
                'relative flex flex-col items-start p-3 rounded-lg border transition-all text-left',
                isSelected
                  ? 'border-[var(--accent-solid)] bg-[var(--accent-bg)]'
                  : 'border-[var(--color-border-default)] hover:border-[var(--color-border-strong)]',
                isDisabled && 'opacity-50 cursor-not-allowed'
              )}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <Check className="w-4 h-4 text-[var(--accent-solid)]" />
                </div>
              )}
              <Icon
                className={cn(
                  'w-5 h-5 mb-2',
                  isSelected ? 'text-[var(--accent-solid)]' : 'text-[var(--color-text-tertiary)]'
                )}
              />
              <span className="font-medium text-sm text-[var(--color-text-primary)]">
                {config.label}
              </span>
              <span className="text-xs text-[var(--color-text-tertiary)]">
                {config.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface MethodBadgeProps {
  method: ValuationMethod;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}

export function MethodBadge({ method, size = 'sm', showIcon = true }: MethodBadgeProps) {
  const config = METHOD_CONFIG[method];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-[var(--gray-100)] text-[var(--color-text-secondary)]',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'
      )}
    >
      {showIcon && <Icon className={cn(size === 'sm' ? 'w-3 h-3' : 'w-4 h-4')} />}
      {config.label}
    </span>
  );
}
