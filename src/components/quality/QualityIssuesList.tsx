'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  AlertOctagon,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';

interface QualityIssue {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  field?: string;
  facilityId?: string;
  facilityName?: string;
  message: string;
  suggestedAction?: string;
}

interface QualityIssuesListProps {
  issues: QualityIssue[];
  onResolve?: (issueId: string) => void;
  compact?: boolean;
}

export function QualityIssuesList({ issues, onResolve, compact = false }: QualityIssuesListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');

  const getSeverityConfig = (severity: QualityIssue['severity']) => {
    const configs = {
      critical: {
        icon: AlertOctagon,
        color: 'text-red-600',
        bgColor: 'bg-red-100 dark:bg-red-900/30',
        badgeVariant: 'destructive' as const,
      },
      high: {
        icon: AlertTriangle,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100 dark:bg-orange-900/30',
        badgeVariant: 'default' as const,
      },
      medium: {
        icon: AlertCircle,
        color: 'text-amber-600',
        bgColor: 'bg-amber-100 dark:bg-amber-900/30',
        badgeVariant: 'secondary' as const,
      },
      low: {
        icon: Info,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100 dark:bg-blue-900/30',
        badgeVariant: 'outline' as const,
      },
    };
    return configs[severity];
  };

  const filteredIssues = filter === 'all' ? issues : issues.filter((i) => i.severity === filter);

  const issueCounts = {
    critical: issues.filter((i) => i.severity === 'critical').length,
    high: issues.filter((i) => i.severity === 'high').length,
    medium: issues.filter((i) => i.severity === 'medium').length,
    low: issues.filter((i) => i.severity === 'low').length,
  };

  if (compact) {
    if (issues.length === 0) {
      return (
        <div className="flex items-center gap-2 text-sm text-emerald-600">
          <Info className="h-4 w-4" />
          No issues detected
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          {issueCounts.critical > 0 && (
            <Badge variant="destructive">{issueCounts.critical} critical</Badge>
          )}
          {issueCounts.high > 0 && (
            <Badge className="bg-orange-500">{issueCounts.high} high</Badge>
          )}
          {issueCounts.medium > 0 && (
            <Badge variant="secondary">{issueCounts.medium} medium</Badge>
          )}
          {issueCounts.low > 0 && (
            <Badge variant="outline">{issueCounts.low} low</Badge>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Quality Issues
            <Badge variant="outline" className="ml-2">
              {issues.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="text-sm border rounded px-2 py-1 bg-background"
            >
              <option value="all">All</option>
              <option value="critical">Critical ({issueCounts.critical})</option>
              <option value="high">High ({issueCounts.high})</option>
              <option value="medium">Medium ({issueCounts.medium})</option>
              <option value="low">Low ({issueCounts.low})</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredIssues.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {issues.length === 0 ? (
              <>
                <Info className="h-12 w-12 mx-auto mb-2 text-emerald-500" />
                <p>No quality issues detected</p>
              </>
            ) : (
              <p>No issues match the current filter</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredIssues.map((issue) => {
              const config = getSeverityConfig(issue.severity);
              const Icon = config.icon;
              const isExpanded = expandedId === issue.id;

              return (
                <div
                  key={issue.id}
                  className={cn(
                    'rounded-lg border p-3 transition-all',
                    config.bgColor,
                    isExpanded && 'ring-2 ring-primary/20'
                  )}
                >
                  <div
                    className="flex items-start gap-3 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                  >
                    <Icon className={cn('h-5 w-5 mt-0.5', config.color)} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={config.badgeVariant} className="text-xs">
                          {issue.severity}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {issue.category.replace('_', ' ')}
                        </Badge>
                        {issue.facilityName && (
                          <span className="text-xs text-muted-foreground">
                            {issue.facilityName}
                          </span>
                        )}
                      </div>
                      <p className={cn('mt-1 text-sm font-medium', config.color)}>
                        {issue.message}
                      </p>
                    </div>
                    {issue.suggestedAction && (
                      isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )
                    )}
                  </div>
                  {isExpanded && issue.suggestedAction && (
                    <div className="mt-3 ml-8 pt-3 border-t border-border/50">
                      <p className="text-sm text-muted-foreground mb-2">
                        <strong>Suggested Action:</strong> {issue.suggestedAction}
                      </p>
                      {onResolve && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onResolve(issue.id);
                          }}
                        >
                          Mark Resolved
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
