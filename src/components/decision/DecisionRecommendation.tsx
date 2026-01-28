'use client';

import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingUp,
  ThumbsUp,
  ThumbsDown,
  Minus,
} from 'lucide-react';
import type { DecisionResult } from '@/hooks/useDecisionAnalysis';

interface DecisionRecommendationProps {
  decision: DecisionResult;
}

export function DecisionRecommendation({ decision }: DecisionRecommendationProps) {
  const getRecommendationConfig = (rec: DecisionResult['recommendation']) => {
    const configs = {
      strong_buy: {
        label: 'Strong Buy',
        color: 'bg-emerald-500',
        textColor: 'text-emerald-600',
        bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
        borderColor: 'border-emerald-200 dark:border-emerald-800',
        icon: CheckCircle2,
      },
      buy: {
        label: 'Buy',
        color: 'bg-green-500',
        textColor: 'text-green-600',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        borderColor: 'border-green-200 dark:border-green-800',
        icon: ThumbsUp,
      },
      negotiate: {
        label: 'Negotiate',
        color: 'bg-amber-500',
        textColor: 'text-amber-600',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-800',
        icon: Minus,
      },
      pass: {
        label: 'Pass',
        color: 'bg-red-500',
        textColor: 'text-red-600',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        borderColor: 'border-red-200 dark:border-red-800',
        icon: ThumbsDown,
      },
    };
    return configs[rec] || configs.negotiate;
  };

  const getConfidenceConfig = (conf: DecisionResult['confidence']) => {
    const configs = {
      high: { label: 'High Confidence', color: 'bg-emerald-100 text-emerald-800' },
      medium: { label: 'Medium Confidence', color: 'bg-amber-100 text-amber-800' },
      low: { label: 'Low Confidence', color: 'bg-red-100 text-red-800' },
    };
    return configs[conf] || configs.medium;
  };

  const getPriceAssessmentConfig = (assessment: DecisionResult['priceAssessment']) => {
    const configs = {
      attractive: { label: 'Attractive Price', color: 'text-emerald-600', icon: TrendingUp },
      fair: { label: 'Fair Price', color: 'text-blue-600', icon: Minus },
      expensive: { label: 'Expensive', color: 'text-red-600', icon: AlertTriangle },
      unknown: { label: 'Price Unknown', color: 'text-gray-500', icon: AlertTriangle },
    };
    return configs[assessment] || configs.unknown;
  };

  const recConfig = getRecommendationConfig(decision.recommendation);
  const confConfig = getConfidenceConfig(decision.confidence);
  const priceConfig = getPriceAssessmentConfig(decision.priceAssessment);
  const Icon = recConfig.icon;
  const PriceIcon = priceConfig.icon;

  // Calculate score percentage for gauge
  const scorePercent = Math.min(100, Math.max(0, decision.score));

  return (
    <Card className={cn('border-2', recConfig.borderColor, recConfig.bgColor)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Investment Recommendation</CardTitle>
          <Badge className={confConfig.color}>{confConfig.label}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Large recommendation badge */}
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'w-24 h-24 rounded-full flex items-center justify-center',
                recConfig.color
              )}
            >
              <Icon className="h-12 w-12 text-white" />
            </div>
            <span className={cn('mt-2 text-xl font-bold', recConfig.textColor)}>
              {recConfig.label}
            </span>
          </div>

          {/* Score gauge */}
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Deal Score</span>
              <span className="font-bold text-2xl">{decision.score}</span>
            </div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  scorePercent >= 75
                    ? 'bg-emerald-500'
                    : scorePercent >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                )}
                style={{ width: `${scorePercent}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>50</span>
              <span>100</span>
            </div>
          </div>

          {/* Price assessment */}
          <div className="flex flex-col items-center px-4 border-l border-border/50">
            <PriceIcon className={cn('h-8 w-8', priceConfig.color)} />
            <span className={cn('mt-1 text-sm font-medium', priceConfig.color)}>
              {priceConfig.label}
            </span>
          </div>
        </div>

        {/* Deal breakers warning */}
        {decision.dealBreakers.length > 0 && (
          <div className="mt-4 p-3 bg-red-100 dark:bg-red-950/50 rounded-lg border border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium">
              <XCircle className="h-5 w-5" />
              <span>Deal Breakers Identified</span>
            </div>
            <ul className="mt-2 space-y-1 text-sm text-red-600 dark:text-red-300">
              {decision.dealBreakers.map((breaker, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 rounded-full bg-red-500" />
                  {breaker}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
