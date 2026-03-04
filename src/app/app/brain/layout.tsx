'use client';

import { NeuralRail } from '@/components/brain/NeuralRail';

export default function BrainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NeuralRail />
      <main className="md:pl-14 pb-16 md:pb-0 min-h-screen bg-[#F8F7F4] dark:bg-surface-900">
        {children}
      </main>
    </>
  );
}
