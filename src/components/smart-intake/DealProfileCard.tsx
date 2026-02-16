'use client';

import { cn } from '@/lib/utils';
import {
  Building2,
  Star,
  DollarSign,
  AlertTriangle,
  Shield,
  Check,
  TrendingUp,
  FileText,
  Sparkles,
} from 'lucide-react';
import type { DealSynthesis, RedFlag } from '@/lib/pipeline/types';

interface DealProfileCardProps {
  dealName: string | null;
  parsedFiles: Array<{
    filename: string;
    docType: string;
    pageCount: number;
    confidence: number;
  }>;
  detectedFacilities: Array<{
    name: string;
    beds?: number;
    state?: string;
    assetType?: string;
  }>;
  cmsMatches: Array<{
    facilityName: string;
    providerNumber: string;
    stars: number;
  }>;
  completenessScore: number;
  missingDocuments: string[];
  redFlags: RedFlag[];
  analysisScore: number | null;
  analysisThesis: string | null;
  toolResults: Array<{ toolName: string; headline?: string }>;
  synthesis: DealSynthesis | null;
  isRunning: boolean;
}

function ShimmerLine({ width = 'w-full' }: { width?: string }) {
  return <div className={cn('h-4 rounded shimmer-warm', width)} />;
}

function ShimmerBlock() {
  return (
    <div className="space-y-2">
      <ShimmerLine width="w-3/4" />
      <ShimmerLine width="w-1/2" />
    </div>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] uppercase tracking-wider text-[var(--warm-text-secondary)] font-semibold mb-2">
      {children}
    </h4>
  );
}

function ProfileField({ label, value, icon: Icon }: {
  label: string;
  value: React.ReactNode;
  icon?: typeof Building2;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[var(--warm-text-secondary)] flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3" />}
        {label}
      </span>
      <span className="text-[var(--warm-text)] font-medium animate-fade-in">{value}</span>
    </div>
  );
}

export function DealProfileCard({
  dealName,
  parsedFiles,
  detectedFacilities,
  cmsMatches,
  completenessScore,
  missingDocuments,
  redFlags,
  analysisScore,
  analysisThesis,
  toolResults,
  synthesis,
  isRunning,
}: DealProfileCardProps) {
  const criticalFlags = redFlags.filter((f) => f.severity === 'critical');
  const warningFlags = redFlags.filter((f) => f.severity === 'warning');

  const recConfig: Record<string, { label: string; color: string }> = {
    pursue: { label: 'Pursue', color: 'text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/15' },
    conditional: { label: 'Conditional', color: 'text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-500/15' },
    pass: { label: 'Pass', color: 'text-rose-700 bg-rose-100 dark:text-rose-300 dark:bg-rose-500/15' },
  };

  return (
    <div className="neu-card-warm sticky top-16 space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-primary-500" />
        <h3 className="text-sm font-bold text-[var(--warm-text)] dark:text-surface-200">Deal Profile</h3>
      </div>

      {/* Deal Name */}
      <div className="neu-inset-warm p-3 space-y-2">
        <SectionHeader>Deal</SectionHeader>
        {dealName ? (
          <div className="animate-fade-in">
            <p className="text-sm font-semibold text-[var(--warm-text)] dark:text-surface-100">{dealName}</p>
            {detectedFacilities[0]?.assetType && (
              <p className="text-xs text-[var(--warm-text-secondary)] mt-0.5">{detectedFacilities[0].assetType}</p>
            )}
          </div>
        ) : (
          <ShimmerBlock />
        )}
      </div>

      {/* Documents */}
      {(parsedFiles.length > 0 || isRunning) && (
        <div className="space-y-1.5">
          <SectionHeader>
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              Documents ({parsedFiles.length})
            </span>
          </SectionHeader>
          {parsedFiles.length > 0 ? (
            <div className="space-y-1">
              {parsedFiles.slice(0, 4).map((f, i) => (
                <div key={i} className="flex items-center gap-2 text-[10px] animate-fade-in">
                  <Check className="w-2.5 h-2.5 text-emerald-500" />
                  <span className="text-[var(--warm-text)] dark:text-surface-300 truncate">{f.filename}</span>
                  <span className="text-[var(--warm-text-secondary)] ml-auto flex-shrink-0">{f.confidence}%</span>
                </div>
              ))}
              {parsedFiles.length > 4 && (
                <p className="text-[10px] text-[var(--warm-text-secondary)]">+{parsedFiles.length - 4} more</p>
              )}
            </div>
          ) : (
            <ShimmerLine width="w-2/3" />
          )}
        </div>
      )}

      {/* Facilities */}
      {(detectedFacilities.length > 0 || isRunning) && (
        <div className="neu-inset-warm p-3 space-y-1.5">
          <SectionHeader>
            <span className="flex items-center gap-1">
              <Building2 className="w-3 h-3" />
              Facilities ({detectedFacilities.length})
            </span>
          </SectionHeader>
          {detectedFacilities.length > 0 ? (
            <div className="space-y-1.5">
              {detectedFacilities.map((f, i) => {
                const cms = cmsMatches.find((m) => m.facilityName === f.name);
                return (
                  <div key={i} className="animate-fade-in">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-[var(--warm-text)] dark:text-surface-200">{f.name}</span>
                      {cms && (
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }, (_, s) => (
                            <Star
                              key={s}
                              className={cn(
                                'w-2.5 h-2.5',
                                s < cms.stars
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-surface-300 dark:text-surface-600'
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-[var(--warm-text-secondary)]">
                      {f.beds && <span>{f.beds} beds</span>}
                      {f.state && <span>{f.state}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <ShimmerBlock />
          )}
        </div>
      )}

      {/* Completeness */}
      {completenessScore > 0 && (
        <div className="space-y-1.5">
          <SectionHeader>Completeness</SectionHeader>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 rounded-full overflow-hidden neu-inset-warm">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  completenessScore >= 70 ? 'bg-emerald-500' : completenessScore >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                )}
                style={{ width: `${completenessScore}%` }}
              />
            </div>
            <span className={cn(
              'text-xs font-bold',
              completenessScore >= 70 ? 'text-emerald-600' : completenessScore >= 40 ? 'text-amber-600' : 'text-rose-600'
            )}>
              {completenessScore}%
            </span>
          </div>
          {missingDocuments.length > 0 && (
            <div className="space-y-0.5">
              {missingDocuments.slice(0, 3).map((doc, i) => (
                <p key={i} className="text-[10px] text-[var(--warm-text-secondary)]">Missing: {doc}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Red Flags */}
      {redFlags.length > 0 && (
        <div className="space-y-1.5">
          <SectionHeader>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
              <Shield className="w-3 h-3" />
              Red Flags ({redFlags.length})
            </span>
          </SectionHeader>
          <div className="space-y-1">
            {criticalFlags.slice(0, 2).map((flag) => (
              <div key={flag.id} className="flex items-start gap-1.5 text-[10px] animate-fade-in">
                <AlertTriangle className="w-2.5 h-2.5 text-rose-500 mt-0.5 flex-shrink-0" />
                <span className="text-rose-700 dark:text-rose-300">{flag.message}</span>
              </div>
            ))}
            {warningFlags.slice(0, 2).map((flag) => (
              <div key={flag.id} className="flex items-start gap-1.5 text-[10px] animate-fade-in">
                <AlertTriangle className="w-2.5 h-2.5 text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="text-amber-700 dark:text-amber-300">{flag.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financials / Tool Results */}
      {toolResults.length > 0 && (
        <div className="neu-inset-warm p-3 space-y-1.5">
          <SectionHeader>
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              Tool Results
            </span>
          </SectionHeader>
          {toolResults.map((t, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[10px] animate-fade-in">
              <TrendingUp className="w-2.5 h-2.5 text-primary-500 mt-0.5 flex-shrink-0" />
              <span className="text-[var(--warm-text)] dark:text-surface-300">{t.headline || t.toolName}</span>
            </div>
          ))}
        </div>
      )}

      {/* Score & Recommendation */}
      {synthesis ? (
        <div className="neu-inset-warm p-3 text-center animate-fade-in space-y-2">
          <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">{synthesis.dealScore}</div>
          <div className="text-[10px] text-[var(--warm-text-secondary)]">Deal Score</div>
          <div className={cn(
            'inline-block text-xs font-semibold px-3 py-1 rounded-lg',
            recConfig[synthesis.recommendation]?.color
          )}>
            {recConfig[synthesis.recommendation]?.label}
          </div>
        </div>
      ) : analysisScore !== null ? (
        <div className="neu-inset-warm p-3 text-center animate-fade-in space-y-1">
          <div className="text-2xl font-bold text-primary-600 dark:text-primary-400">{analysisScore}</div>
          <div className="text-[10px] text-[var(--warm-text-secondary)]">Analysis Score</div>
        </div>
      ) : isRunning ? (
        <div className="space-y-2">
          <SectionHeader>Score</SectionHeader>
          <ShimmerLine width="w-1/3" />
        </div>
      ) : null}
    </div>
  );
}
