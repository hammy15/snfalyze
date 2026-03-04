'use client';

import { BrainVisualization } from '@/components/brain/BrainVisualization';
import { Crosshair } from 'lucide-react';
import Link from 'next/link';

export default function AnalyzePage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-800 dark:text-surface-100">
          Deal Analyzer
        </h1>
        <p className="text-sm text-surface-400 mt-1">
          Newo + Dev analyze every deal in parallel with full CIL orchestration
        </p>
      </div>

      <div className="neu-card-warm p-8 flex flex-col items-center text-center">
        <BrainVisualization
          newoStatus="online"
          devStatus="online"
          compact
        />
        <p className="text-sm text-surface-500 mt-6 max-w-md">
          Upload deal documents and both brains will activate — Newo evaluates operational viability
          while Dev structures the deal and models valuations.
        </p>
        <Link
          href="/app/deals"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 neu-button-primary rounded-xl text-sm font-medium"
        >
          <Crosshair className="w-4 h-4" />
          Go to Deal Pipeline
        </Link>
      </div>
    </div>
  );
}
