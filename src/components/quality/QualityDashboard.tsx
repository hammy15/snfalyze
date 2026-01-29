'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { RefreshCw, Activity, Building2, FileText, AlertTriangle } from 'lucide-react';

import { QualityGauge } from './QualityGauge';
import { DataCompletenessPanel } from './DataCompletenessPanel';
import { QualityIssuesList } from './QualityIssuesList';
import { QualityRecommendations } from './QualityRecommendations';
import { useQuality } from '@/hooks/useQuality';

interface QualityDashboardProps {
  dealId: string;
  compact?: boolean;
}

export function QualityDashboard({ dealId, compact = false }: QualityDashboardProps) {
  const { quality, isLoading, error, recalculate } = useQuality(dealId);
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = async () => {
    setIsRecalculating(true);
    try {
      await recalculate();
    } finally {
      setIsRecalculating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !quality) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
          <p className="text-muted-foreground">
            {error?.message || 'Unable to load quality data'}
          </p>
          <Button variant="outline" className="mt-4" onClick={handleRecalculate}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Quality Score
            </CardTitle>
            <Badge
              className={cn(
                quality.level === 'excellent' && 'bg-emerald-500',
                quality.level === 'good' && 'bg-amber-500',
                quality.level === 'fair' && 'bg-orange-500',
                quality.level === 'poor' && 'bg-red-500'
              )}
            >
              {quality.overallScore}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <QualityGauge
            score={quality.overallScore}
            level={quality.level as 'excellent' | 'good' | 'fair' | 'poor'}
            compact
          />
          <DataCompletenessPanel completeness={quality.completeness} compact />
          <QualityIssuesList issues={quality.issues} compact />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Quality Evaluation</h2>
          <p className="text-muted-foreground">
            Assess extraction reliability before analysis
          </p>
        </div>
        <Button
          variant="outline"
          onClick={handleRecalculate}
          disabled={isRecalculating}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isRecalculating && 'animate-spin')} />
          Recalculate
        </Button>
      </div>

      {/* Main gauge and summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <QualityGauge
          score={quality.overallScore}
          level={quality.level as 'excellent' | 'good' | 'fair' | 'poor'}
          breakdown={quality.breakdown}
          showBreakdown
        />
        <div className="lg:col-span-2">
          <QualityRecommendations
            recommendations={quality.recommendations}
            canProceed={quality.canProceedToAnalysis}
          />
        </div>
      </div>

      {/* Tabs for detailed views */}
      <Tabs defaultValue="issues" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="issues" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Issues
            {quality.issues.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {quality.issues.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completeness" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Completeness
          </TabsTrigger>
          <TabsTrigger value="facilities" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Facilities
          </TabsTrigger>
        </TabsList>

        <TabsContent value="issues" className="mt-4">
          <QualityIssuesList issues={quality.issues} />
        </TabsContent>

        <TabsContent value="completeness" className="mt-4">
          <DataCompletenessPanel completeness={quality.completeness} />
        </TabsContent>

        <TabsContent value="facilities" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                Facility Quality Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {quality.facilityScores.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No facilities found for this deal
                </p>
              ) : (
                <div className="space-y-3">
                  {quality.facilityScores.map((facility) => (
                    <div
                      key={facility.facilityId}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{facility.facilityName}</p>
                        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                          <span>{facility.periodCount} period(s)</span>
                          <span>•</span>
                          <span>
                            {facility.hasRevenue ? '✓' : '✗'} Revenue
                          </span>
                          <span>•</span>
                          <span>
                            {facility.hasCensus ? '✓' : '✗'} Census
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={cn(
                            'text-lg font-bold',
                            facility.score >= 80
                              ? 'text-emerald-600'
                              : facility.score >= 60
                                ? 'text-amber-600'
                                : facility.score >= 40
                                  ? 'text-orange-600'
                                  : 'text-red-600'
                          )}
                        >
                          {facility.score}%
                        </div>
                        {facility.issueCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {facility.issueCount} issue{facility.issueCount !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
