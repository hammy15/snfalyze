'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';
import { Loader2 } from 'lucide-react';

export default function WorkspacePage() {
  const params = useParams();
  const dealId = params.id as string;
  const [dealName, setDealName] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDeal() {
      try {
        const res = await fetch(`/api/deals/${dealId}`);
        if (res.ok) {
          const data = await res.json();
          setDealName(data.data?.name || data.name || data.deal?.name || 'Untitled Deal');
        }
      } catch {
        setDealName('Deal');
      } finally {
        setIsLoading(false);
      }
    }
    loadDeal();
  }, [dealId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          <p className="text-sm text-surface-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return <WorkspaceShell dealId={dealId} dealName={dealName} />;
}
