'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { EnhancedDealWizard } from '@/components/wizard';

function WizardContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session') || undefined;
  const dealId = searchParams.get('dealId') || undefined;

  return (
    <EnhancedDealWizard
      sessionId={sessionId}
      dealId={dealId}
    />
  );
}

export default function NewDealWizardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500" />
        </div>
      }
    >
      <WizardContent />
    </Suspense>
  );
}
