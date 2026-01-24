'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Building2,
  RefreshCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FacilityScoreSummary {
  facilityId: string;
  facilityName: string;
  score: number;
  color: 'red' | 'yellow' | 'green';
  confidence: number;
}

interface DealScore {
  dealId: string;
  dealName: string;
  portfolioScore: number;
  portfolioColor: 'red' | 'yellow' | 'green';
  recommendation: 'pass' | 'reprice' | 'proceed';
  classification: 'core' | 'reprice' | 'turnaround' | 'speculative';
  confidenceScore: number;
  facilityScores: FacilityScoreSummary[];
  riskFactors: string[];
  upsidefactors: string[];
  algorithmVersion: string;
  scoredAt: string;
}

interface DealScoreCardProps {
  dealId: string;
  compact?: boolean;
}

const colorClasses = {
  red: 'bg-red-500',
  yellow: 'bg-yellow-500',
  green: 'bg-green-500',
};

const recommendationConfig = {
  pass: {
    icon: XCircle,
    label: 'Pass',
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  reprice: {
    icon: AlertTriangle,
    label: 'Re-price / Fix',
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  proceed: {
    icon: CheckCircle,
    label: 'Proceed',
    className: 'bg-green-100 text-green-800 border-green-200',
  },
};

const classificationLabels = {
  core: 'Core',
  reprice: 'Re-price',
  turnaround: 'Turnaround',
  speculative: 'Speculative',
};

export function DealScoreCard({ dealId, compact = false }: DealScoreCardProps) {
  const [score, setScore] = useState<DealScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/deals/${dealId}/score`);
      if (!res.ok) throw new Error('Failed to fetch score');
      const data = await res.json();
      if (data.success) {
        setScore(data.data);
      } else {
        setError(data.error || 'Failed to load score');
      }
    } catch (err) {
      setError('Failed to load score');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, [dealId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !score) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-4 w-4" />
            <span>{error || 'Unable to calculate score'}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const RecommendationIcon = recommendationConfig[score.recommendation].icon;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex items-center justify-center w-12 h-12 rounded-lg text-white font-bold text-xl',
            colorClasses[score.portfolioColor]
          )}
        >
          {score.portfolioScore.toFixed(1)}
        </div>
        <div>
          <div className="font-medium">{classificationLabels[score.classification]}</div>
          <div className="text-sm text-muted-foreground">
            {score.facilityScores.length} facilities
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold">Deal Score</CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchScore}>
          <RefreshCcw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score Display */}
        <div className="flex items-center gap-6">
          <div
            className={cn(
              'flex items-center justify-center w-20 h-20 rounded-xl text-white font-bold text-3xl',
              colorClasses[score.portfolioColor]
            )}
          >
            {score.portfolioScore.toFixed(1)}
          </div>
          <div className="flex-1">
            <Badge
              variant="outline"
              className={cn('mb-2', recommendationConfig[score.recommendation].className)}
            >
              <RecommendationIcon className="h-3 w-3 mr-1" />
              {recommendationConfig[score.recommendation].label}
            </Badge>
            <div className="text-lg font-semibold">
              {classificationLabels[score.classification]} Deal
            </div>
            <div className="text-sm text-muted-foreground">
              Algorithm v{score.algorithmVersion}
            </div>
          </div>
        </div>

        {/* Confidence Score */}
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>Confidence</span>
            <span className="font-medium">{score.confidenceScore}%</span>
          </div>
          <Progress value={score.confidenceScore} className="h-2" />
          {score.confidenceScore < 70 && (
            <p className="text-xs text-muted-foreground mt-1">
              Score reliability is limited due to incomplete data
            </p>
          )}
        </div>

        {/* Facility Breakdown */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Facility Scores
          </h4>
          <div className="space-y-2">
            {score.facilityScores.map((facility) => (
              <div
                key={facility.facilityId}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
              >
                <span className="text-sm truncate flex-1">{facility.facilityName}</span>
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'w-8 h-8 rounded flex items-center justify-center text-white text-sm font-medium',
                      colorClasses[facility.color]
                    )}
                  >
                    {facility.score.toFixed(1)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Factors */}
        {score.riskFactors.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              Risk Factors
            </h4>
            <ul className="text-sm space-y-1">
              {score.riskFactors.map((factor, i) => (
                <li key={i} className="text-muted-foreground">
                  • {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Upside Factors */}
        {score.upsidefactors.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-2 text-green-600">
              <TrendingUp className="h-4 w-4" />
              Upside Factors
            </h4>
            <ul className="text-sm space-y-1">
              {score.upsidefactors.map((factor, i) => (
                <li key={i} className="text-muted-foreground">
                  • {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-muted-foreground text-right">
          Scored: {new Date(score.scoredAt).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}
