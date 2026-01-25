'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SliderProps {
  value?: number[];
  defaultValue?: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  disabled?: boolean;
  className?: string;
}

export function Slider({
  value,
  defaultValue = [50],
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  disabled = false,
  className,
}: SliderProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue);
  const currentValue = value ?? internalValue;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = [parseFloat(e.target.value)];
    if (!value) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  const percentage = ((currentValue[0] - min) / (max - min)) * 100;

  return (
    <div className={cn('relative flex items-center w-full', className)}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={currentValue[0]}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          'w-full h-2 rounded-full appearance-none cursor-pointer',
          'bg-surface-200 dark:bg-surface-700',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          '[&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:w-4',
          '[&::-webkit-slider-thumb]:h-4',
          '[&::-webkit-slider-thumb]:rounded-full',
          '[&::-webkit-slider-thumb]:bg-primary-500',
          '[&::-webkit-slider-thumb]:border-2',
          '[&::-webkit-slider-thumb]:border-white',
          '[&::-webkit-slider-thumb]:shadow-md',
          '[&::-webkit-slider-thumb]:transition-transform',
          '[&::-webkit-slider-thumb]:hover:scale-110',
          '[&::-moz-range-thumb]:w-4',
          '[&::-moz-range-thumb]:h-4',
          '[&::-moz-range-thumb]:rounded-full',
          '[&::-moz-range-thumb]:bg-primary-500',
          '[&::-moz-range-thumb]:border-2',
          '[&::-moz-range-thumb]:border-white',
          '[&::-moz-range-thumb]:shadow-md'
        )}
        style={{
          background: `linear-gradient(to right, rgb(var(--color-primary-500)) 0%, rgb(var(--color-primary-500)) ${percentage}%, rgb(var(--color-surface-200)) ${percentage}%, rgb(var(--color-surface-200)) 100%)`,
        }}
      />
    </div>
  );
}
