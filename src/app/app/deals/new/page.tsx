'use client';

import { DealIntake } from '@/components/intake/DealIntake';

export default function NewDealPage() {
  return (
    <div className="py-8 px-4">
      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8">
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">
          New Deal
        </h1>
        <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
          Drop your broker package, enter a CMS number, or start with basics
        </p>
      </div>

      {/* Intake Component */}
      <DealIntake />
    </div>
  );
}
