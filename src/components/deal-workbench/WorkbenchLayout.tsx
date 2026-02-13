'use client';

import { cn } from '@/lib/utils';
import { DealIdentityBar } from './DealIdentityBar';
import { StagePanel } from './StagePanel';
import { AIAdvisorPanel } from './AIAdvisorPanel';

interface WorkbenchLayoutProps {
  // Identity bar props
  dealId: string;
  name: string;
  assetType: string;
  askingPrice: number;
  totalBeds: number;
  stage: string;
  stageLabel: string;
  stagePosition: number;
  status: string;
  score?: number;
  // Stage panel props
  currentStage: string;
  stageProgress: Array<{ stage: string; status: string }>;
  onStageClick: (stage: string) => void;
  documentCount: number;
  riskCount: number;
  hasFinancials: boolean;
  // Content
  children: React.ReactNode;
}

export function WorkbenchLayout({
  dealId,
  name,
  assetType,
  askingPrice,
  totalBeds,
  stage,
  stageLabel,
  stagePosition,
  status,
  score,
  currentStage,
  stageProgress,
  onStageClick,
  documentCount,
  riskCount,
  hasFinancials,
  children,
}: WorkbenchLayoutProps) {
  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] -m-6">
      {/* Deal Identity Bar */}
      <div className="px-4 pt-3 pb-2 flex-shrink-0">
        <DealIdentityBar
          dealId={dealId}
          name={name}
          assetType={assetType}
          askingPrice={askingPrice}
          totalBeds={totalBeds}
          stage={stage}
          stageLabel={stageLabel}
          stagePosition={stagePosition}
          totalStages={6}
          score={score}
          status={status}
        />
      </div>

      {/* 3-Panel Layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Stage Panel */}
        <StagePanel
          currentStage={currentStage}
          stageProgress={stageProgress}
          onStageClick={onStageClick}
          documentCount={documentCount}
          riskCount={riskCount}
        />

        {/* Center: Workspace Canvas */}
        <div className="flex-1 overflow-y-auto px-4 py-3 min-w-0">
          {children}
        </div>

        {/* Right: AI Advisor */}
        <AIAdvisorPanel
          dealId={dealId}
          dealName={name}
          currentStage={currentStage}
          stageLabel={stageLabel}
          documentCount={documentCount}
          hasFinancials={hasFinancials}
        />
      </div>
    </div>
  );
}
