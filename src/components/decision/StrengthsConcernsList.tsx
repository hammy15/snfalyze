'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StrengthsConcernsListProps {
  strengths: string[];
  concerns: string[];
  nextSteps?: string[];
}

export function StrengthsConcernsList({
  strengths,
  concerns,
  nextSteps,
}: StrengthsConcernsListProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Strengths Column */}
      <Card className="border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <ThumbsUp className="h-5 w-5" />
            Strengths ({strengths.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {strengths.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No strengths identified</p>
          ) : (
            <ul className="space-y-2">
              {strengths.map((strength, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-500 shrink-0" />
                  <span className="text-emerald-800 dark:text-emerald-200">{strength}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Concerns Column */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <ThumbsDown className="h-5 w-5" />
            Concerns ({concerns.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {concerns.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No concerns identified</p>
          ) : (
            <ul className="space-y-2">
              {concerns.map((concern, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
                  <span className="text-amber-800 dark:text-amber-200">{concern}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Next Steps (optional, full width) */}
      {nextSteps && nextSteps.length > 0 && (
        <Card className="col-span-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-blue-700 dark:text-blue-400">
              Recommended Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2 list-decimal list-inside">
              {nextSteps.map((step, i) => (
                <li key={i} className="text-sm text-blue-800 dark:text-blue-200">
                  {step}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
