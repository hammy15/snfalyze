'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Bell,
  FileText,
  AlertTriangle,
  CheckCircle,
  MessageSquare,
  Upload,
  ArrowRight,
  X,
  Sparkles,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface Notification {
  id: string;
  type: 'document' | 'risk' | 'stage' | 'clarification' | 'ai_suggestion';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  action?: string;
  actionTab?: string;
  timestamp: Date;
  read: boolean;
}

interface DealNotificationsProps {
  dealId: string;
  documentCount: number;
  riskCount: number;
  completedStages: number;
  totalStages: number;
  hasFinancials: boolean;
  onNavigate: (tab: string) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function DealNotifications({
  dealId,
  documentCount,
  riskCount,
  completedStages,
  totalStages,
  hasFinancials,
  onNavigate,
}: DealNotificationsProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);

  // Generate contextual notifications based on deal state
  useEffect(() => {
    const generated: Notification[] = [];

    if (documentCount === 0) {
      generated.push({
        id: 'no-docs',
        type: 'document',
        title: 'No documents uploaded',
        description: 'Upload broker packages, P&Ls, or census data to begin analysis',
        priority: 'high',
        action: 'Upload Documents',
        actionTab: 'documents',
        timestamp: new Date(),
        read: false,
      });
    }

    if (!hasFinancials && documentCount > 0) {
      generated.push({
        id: 'no-financials',
        type: 'clarification',
        title: 'Financial data missing',
        description: 'No financial documents detected. Upload P&L or income statements for valuation',
        priority: 'high',
        action: 'Upload Financials',
        actionTab: 'documents',
        timestamp: new Date(),
        read: false,
      });
    }

    if (completedStages === 0) {
      generated.push({
        id: 'start-analysis',
        type: 'ai_suggestion',
        title: 'Ready to begin analysis',
        description: 'AI can auto-analyze your documents and start the underwriting process',
        priority: 'medium',
        action: 'Start AI Analysis',
        actionTab: 'overview',
        timestamp: new Date(),
        read: false,
      });
    }

    if (completedStages >= 2 && completedStages < totalStages) {
      generated.push({
        id: 'continue-analysis',
        type: 'stage',
        title: `${completedStages} of ${totalStages} stages complete`,
        description: 'Continue the analysis to get a full valuation and recommendation',
        priority: 'low',
        action: 'View Progress',
        actionTab: 'overview',
        timestamp: new Date(),
        read: false,
      });
    }

    if (riskCount > 0) {
      generated.push({
        id: 'risks-found',
        type: 'risk',
        title: `${riskCount} risk${riskCount > 1 ? 's' : ''} identified`,
        description: 'Review identified risks and add mitigations',
        priority: riskCount >= 3 ? 'high' : 'medium',
        action: 'Review Risks',
        actionTab: 'risks',
        timestamp: new Date(),
        read: false,
      });
    }

    setNotifications(generated);
  }, [dealId, documentCount, riskCount, completedStages, totalStages, hasFinancials]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const highPriorityCount = notifications.filter((n) => n.priority === 'high' && !n.read).length;

  const handleDismiss = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleAction = (notification: Notification) => {
    if (notification.actionTab) {
      onNavigate(notification.actionTab);
    }
    handleDismiss(notification.id);
  };

  const activeNotifications = notifications.filter((n) => !n.read);

  if (activeNotifications.length === 0) return null;

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'document':
        return FileText;
      case 'risk':
        return AlertTriangle;
      case 'stage':
        return CheckCircle;
      case 'clarification':
        return MessageSquare;
      case 'ai_suggestion':
        return Sparkles;
    }
  };

  const getIconColor = (type: Notification['type']) => {
    switch (type) {
      case 'document':
        return 'text-blue-500';
      case 'risk':
        return 'text-red-500';
      case 'stage':
        return 'text-emerald-500';
      case 'clarification':
        return 'text-amber-500';
      case 'ai_suggestion':
        return 'text-primary-500';
    }
  };

  return (
    <div className="neu-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-surface-500" />
          <span className="text-sm font-medium text-surface-900 dark:text-surface-50">
            Notifications
          </span>
          {unreadCount > 0 && (
            <span
              className={cn(
                'text-xs font-bold px-1.5 py-0.5 rounded-full',
                highPriorityCount > 0
                  ? 'bg-red-500 text-white'
                  : 'bg-primary-500 text-white'
              )}
            >
              {unreadCount}
            </span>
          )}
        </div>
        <ArrowRight
          className={cn(
            'w-4 h-4 text-surface-400 transition-transform',
            isExpanded && 'rotate-90'
          )}
        />
      </button>

      {/* Notification list */}
      {isExpanded && (
        <div className="border-t border-surface-200 dark:border-surface-700 divide-y divide-surface-100 dark:divide-surface-800">
          {activeNotifications.map((notification) => {
            const Icon = getIcon(notification.type);
            const iconColor = getIconColor(notification.type);

            return (
              <div
                key={notification.id}
                className="px-4 py-3 flex items-start gap-3 hover:bg-surface-50/50 dark:hover:bg-surface-800/30 transition-colors"
              >
                <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', iconColor)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-surface-900 dark:text-surface-50">
                    {notification.title}
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {notification.description}
                  </p>
                  {notification.action && (
                    <button
                      onClick={() => handleAction(notification)}
                      className="text-xs font-medium text-primary-500 hover:text-primary-600 mt-1.5 flex items-center gap-1"
                    >
                      {notification.action}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <button
                  onClick={() => handleDismiss(notification.id)}
                  className="p-1 hover:bg-surface-200 dark:hover:bg-surface-700 rounded transition-colors flex-shrink-0"
                >
                  <X className="w-3 h-3 text-surface-400" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
