'use client';

import { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  MessageCircle,
  Clock,
  Send,
  CheckCircle2,
  FileText,
  AlertTriangle,
  Database,
  Brain,
  ArrowRight,
  Loader2,
  X,
} from 'lucide-react';
import type { WorkspaceStageType } from '@/types/workspace';

interface Activity {
  id: string;
  type: string;
  title: string;
  description: string | null;
  userName: string;
  createdAt: string;
  metadata: Record<string, unknown>;
}

interface Comment {
  id: string;
  dealId: string;
  stage: WorkspaceStageType | null;
  content: string;
  userName: string;
  parentId: string | null;
  isResolved: boolean;
  createdAt: string;
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  comment: MessageCircle,
  stage_change: ArrowRight,
  data_update: FileText,
  document_upload: FileText,
  risk_flag: AlertTriangle,
  cms_sync: Database,
  memo_generated: Brain,
  status_change: CheckCircle2,
};

const ACTIVITY_COLORS: Record<string, string> = {
  comment: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
  stage_change: 'text-primary-500 bg-primary-50 dark:bg-primary-900/20',
  data_update: 'text-surface-500 bg-surface-100 dark:bg-surface-800',
  document_upload: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
  risk_flag: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20',
  cms_sync: 'text-purple-500 bg-purple-50 dark:bg-purple-900/20',
  memo_generated: 'text-primary-500 bg-primary-50 dark:bg-primary-900/20',
  status_change: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20',
};

interface ActivityPanelProps {
  dealId: string;
  currentStage?: WorkspaceStageType;
  isOpen: boolean;
  onClose: () => void;
}

export function ActivityPanel({ dealId, currentStage, isOpen, onClose }: ActivityPanelProps) {
  const [activeTab, setActiveTab] = useState<'activity' | 'comments'>('activity');
  const [activities, setActivities] = useState<Activity[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, dealId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/deals/${dealId}/activities`);
      if (res.ok) {
        const data = await res.json();
        setActivities(data.data?.activities || []);
        setComments(data.data?.comments || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const postComment = async () => {
    if (!newComment.trim() || posting) return;
    setPosting(true);

    try {
      const res = await fetch(`/api/deals/${dealId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'comment',
          content: newComment.trim(),
          stage: currentStage,
          userName: 'Analyst',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setComments(prev => [data.data, ...prev]);
        setNewComment('');
        // Refresh activities to show the new comment activity
        fetchData();
      }
    } catch {
      // Silently fail
    } finally {
      setPosting(false);
      inputRef.current?.focus();
    }
  };

  const resolveComment = async (commentId: string) => {
    try {
      await fetch(`/api/deals/${dealId}/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resolve', commentId }),
      });
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, isResolved: true } : c));
    } catch {
      // Silently fail
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-surface-900 border-l border-surface-200 dark:border-surface-700 shadow-xl z-40 flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-surface-800 dark:text-surface-200">Activity</h3>
        <button onClick={onClose} className="p-1 hover:bg-surface-100 dark:hover:bg-surface-800 rounded">
          <X className="w-4 h-4 text-surface-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-surface-200 dark:border-surface-700">
        <button
          onClick={() => setActiveTab('activity')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors relative',
            activeTab === 'activity'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          )}
        >
          Activity Feed
          {activeTab === 'activity' && (
            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-500 rounded-full" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('comments')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors relative',
            activeTab === 'comments'
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
          )}
        >
          Comments
          {comments.filter(c => !c.isResolved).length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
              {comments.filter(c => !c.isResolved).length}
            </span>
          )}
          {activeTab === 'comments' && (
            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary-500 rounded-full" />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-primary-500" />
          </div>
        ) : activeTab === 'activity' ? (
          activities.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-2" />
              <p className="text-xs text-surface-500">No activity yet</p>
            </div>
          ) : (
            activities.map(activity => {
              const Icon = ACTIVITY_ICONS[activity.type] || Clock;
              const colorClass = ACTIVITY_COLORS[activity.type] || ACTIVITY_COLORS.data_update;

              return (
                <div key={activity.id} className="flex gap-2.5 py-2">
                  <div className={cn('w-7 h-7 rounded-full flex items-center justify-center shrink-0', colorClass)}>
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-surface-800 dark:text-surface-200 leading-tight">
                      {activity.title}
                    </p>
                    {activity.description && (
                      <p className="text-[11px] text-surface-500 mt-0.5 line-clamp-2">{activity.description}</p>
                    )}
                    <p className="text-[10px] text-surface-400 mt-1">
                      {activity.userName} · {formatTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })
          )
        ) : (
          /* Comments tab */
          comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageCircle className="w-8 h-8 text-surface-300 dark:text-surface-600 mx-auto mb-2" />
              <p className="text-xs text-surface-500">No comments yet</p>
              <p className="text-[10px] text-surface-400 mt-1">Add a comment to discuss this deal</p>
            </div>
          ) : (
            comments.map(comment => (
              <div
                key={comment.id}
                className={cn(
                  'rounded-lg p-3 text-xs',
                  comment.isResolved
                    ? 'bg-surface-50 dark:bg-surface-800/30 opacity-60'
                    : 'bg-surface-100 dark:bg-surface-800'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-surface-700 dark:text-surface-300">
                    {comment.userName}
                  </span>
                  <span className="text-[10px] text-surface-400">
                    {formatTime(comment.createdAt)}
                  </span>
                </div>
                <p className="text-surface-600 dark:text-surface-400 leading-relaxed">{comment.content}</p>
                {comment.stage && (
                  <span className="inline-block mt-1.5 px-1.5 py-0.5 rounded text-[9px] bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                    {comment.stage.replace('_', ' ')}
                  </span>
                )}
                {!comment.isResolved && (
                  <button
                    onClick={() => resolveComment(comment.id)}
                    className="block mt-1.5 text-[10px] text-surface-400 hover:text-emerald-500 transition-colors"
                  >
                    Mark resolved
                  </button>
                )}
              </div>
            ))
          )
        )}
      </div>

      {/* Comment input — visible on comments tab */}
      {activeTab === 'comments' && (
        <div className="border-t border-surface-200 dark:border-surface-700 px-3 py-3">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && postComment()}
              placeholder={currentStage ? `Comment on ${currentStage.replace('_', ' ')}...` : 'Add a comment...'}
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-white dark:bg-surface-900 text-surface-800 dark:text-surface-200 placeholder-surface-400 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              onClick={postComment}
              disabled={posting || !newComment.trim()}
              className="p-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-40 transition-colors"
            >
              {posting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
