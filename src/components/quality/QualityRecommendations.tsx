'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, ArrowRight, Upload, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QualityRecommendationsProps {
  recommendations: string[];
  canProceed: boolean;
  compact?: boolean;
}

export function QualityRecommendations({
  recommendations,
  canProceed,
  compact = false,
}: QualityRecommendationsProps) {
  if (compact) {
    if (recommendations.length === 0) {
      return (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <CheckCircle className="h-4 w-4" />
          Ready for analysis
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground">
          {recommendations.length} recommendation{recommendations.length !== 1 ? 's' : ''}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
            <div>
              <p className="font-medium text-emerald-700 dark:text-emerald-400">
                Data quality is good
              </p>
              <p className="text-sm text-muted-foreground">
                No improvements needed. Ready to proceed with analysis.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {!canProceed && (
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Action Required: Quality score is too low for analysis
                </p>
              </div>
            )}
            <ul className="space-y-2">
              {recommendations.map((rec, index) => (
                <li
                  key={index}
                  className={cn(
                    'flex items-start gap-2 p-3 rounded-lg transition-colors',
                    'bg-muted/50 hover:bg-muted'
                  )}
                >
                  <ArrowRight className="h-4 w-4 mt-0.5 text-primary flex-shrink-0" />
                  <span className="text-sm">{rec}</span>
                </li>
              ))}
            </ul>
            <div className="pt-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Upload className="h-3 w-3" />
                Upload additional documents to improve data quality
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
