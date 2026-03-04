'use client';

import { NeuralRail } from '@/components/brain/NeuralRail';

export default function BrainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NeuralRail />
      <main className="pl-14 pt-0 min-h-screen bg-[#F8F7F4] dark:bg-surface-900">
        {children}
      </main>
    </>
  );
}
