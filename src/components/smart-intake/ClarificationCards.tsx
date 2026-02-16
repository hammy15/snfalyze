'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  HelpCircle,
  ArrowRight,
  Check,
  X,
  Edit3,
} from 'lucide-react';
import type { ClarificationRequest, ClarificationAnswer } from '@/lib/pipeline/types';

interface ClarificationCardsProps {
  clarifications: ClarificationRequest[];
  onSubmit: (answers: ClarificationAnswer[]) => void;
}

export function ClarificationCards({ clarifications, onSubmit }: ClarificationCardsProps) {
  const [answers, setAnswers] = useState<Map<string, ClarificationAnswer>>(new Map());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const setAnswer = (clarificationId: string, answer: ClarificationAnswer) => {
    setAnswers((prev) => {
      const next = new Map(prev);
      next.set(clarificationId, answer);
      return next;
    });
  };

  const allAnswered = clarifications.every((c) => answers.has(c.id));

  const handleSubmit = () => {
    const answerList: ClarificationAnswer[] = clarifications.map((c) => {
      const answer = answers.get(c.id);
      return answer || { clarificationId: c.id, action: 'skip' };
    });
    onSubmit(answerList);
  };

  const typeIcons: Record<string, typeof AlertTriangle> = {
    low_confidence: HelpCircle,
    out_of_range: AlertTriangle,
    conflict: X,
    missing: AlertTriangle,
    validation_error: AlertTriangle,
  };

  const typeColors: Record<string, string> = {
    low_confidence: 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/5',
    out_of_range: 'border-rose-300 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/5',
    conflict: 'border-violet-300 bg-violet-50 dark:border-violet-500/30 dark:bg-violet-500/5',
    missing: 'border-amber-300 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/5',
    validation_error: 'border-rose-300 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/5',
  };

  return (
    <div className="space-y-4">
      <div className="text-center pb-2">
        <h3 className="text-lg font-semibold text-surface-800 dark:text-surface-200">
          {clarifications.length} question{clarifications.length !== 1 ? 's' : ''} need your input
        </h3>
        <p className="text-xs text-surface-500 mt-1">
          Review the extracted data below and confirm, override, or skip each item.
        </p>
      </div>

      <div className="space-y-3 max-h-[50vh] overflow-y-auto px-1">
        {clarifications.map((c) => {
          const Icon = typeIcons[c.type] || HelpCircle;
          const answer = answers.get(c.id);
          const isAnswered = !!answer;

          return (
            <div
              key={c.id}
              className={cn(
                'rounded-xl border p-4 transition-all',
                isAnswered
                  ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/5'
                  : typeColors[c.type] || 'border-surface-200 bg-white dark:border-surface-700/50 dark:bg-surface-800/30'
              )}
            >
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-800 flex items-center justify-center flex-shrink-0">
                  <Icon className={cn('w-4 h-4', isAnswered ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-surface-800 dark:text-surface-200">{c.fieldLabel}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400">
                      {c.type.replace(/_/g, ' ')}
                    </span>
                    {c.priority >= 8 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-300">
                        Critical
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">{c.reason}</p>

                  {/* Current value */}
                  {c.extractedValue !== null && c.extractedValue !== undefined && (
                    <div className="text-xs mb-2">
                      <span className="text-surface-500">Extracted: </span>
                      <span className="text-surface-700 dark:text-surface-300 font-mono">
                        {typeof c.extractedValue === 'object'
                          ? JSON.stringify(c.extractedValue)
                          : String(c.extractedValue)}
                      </span>
                    </div>
                  )}

                  {/* Benchmark range */}
                  {c.benchmarkRange && (
                    <div className="text-xs mb-3 px-2 py-1 rounded bg-surface-100 dark:bg-surface-800/50">
                      <span className="text-surface-500">Benchmark: </span>
                      <span className="text-primary-600 dark:text-primary-300">
                        {c.benchmarkRange.min}–{c.benchmarkRange.max} (median: {c.benchmarkRange.median})
                      </span>
                    </div>
                  )}

                  {/* Edit mode */}
                  {editingId === c.id && (
                    <div className="flex items-center gap-2 mb-3">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="flex-1 bg-white dark:bg-surface-800 border border-surface-300 dark:border-surface-600 rounded-lg px-3 py-1.5 text-xs text-surface-800 dark:text-surface-200 outline-none focus:border-primary-500 dark:focus:border-primary-500/50"
                        placeholder="Enter corrected value"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          setAnswer(c.id, {
                            clarificationId: c.id,
                            action: 'override',
                            value: editValue,
                          });
                          setEditingId(null);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-500/20 dark:text-primary-300 text-xs hover:bg-primary-200 dark:hover:bg-primary-500/30 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    {!isAnswered ? (
                      <>
                        <button
                          onClick={() => setAnswer(c.id, { clarificationId: c.id, action: 'accept' })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 text-xs hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors border border-emerald-200 dark:border-emerald-500/20"
                        >
                          <Check className="w-3 h-3" />
                          Accept
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(c.id);
                            setEditValue(String(c.extractedValue || c.suggestedValue || ''));
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-500/10 dark:text-primary-300 text-xs hover:bg-primary-200 dark:hover:bg-primary-500/20 transition-colors border border-primary-200 dark:border-primary-500/20"
                        >
                          <Edit3 className="w-3 h-3" />
                          Override
                        </button>
                        <button
                          onClick={() => setAnswer(c.id, { clarificationId: c.id, action: 'skip' })}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400 text-xs hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors border border-surface-200 dark:border-surface-700/50"
                        >
                          Skip
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-xs">
                        <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span className="text-emerald-700 dark:text-emerald-300">
                          {answer?.action === 'accept'
                            ? 'Accepted'
                            : answer?.action === 'override'
                              ? `Overridden: ${answer.value}`
                              : 'Skipped'}
                        </span>
                        <button
                          onClick={() => {
                            setAnswers((prev) => {
                              const next = new Map(prev);
                              next.delete(c.id);
                              return next;
                            });
                          }}
                          className="text-surface-400 hover:text-surface-600 dark:text-surface-500 dark:hover:text-surface-300 ml-2"
                        >
                          Undo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-between pt-3 border-t border-surface-200 dark:border-surface-800/50">
        <p className="text-xs text-surface-500">
          {answers.size} of {clarifications.length} answered
        </p>
        <button
          onClick={handleSubmit}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all',
            allAnswered || answers.size > 0
              ? 'bg-primary-500 text-white hover:bg-primary-600 shadow-lg shadow-primary-500/30'
              : 'bg-surface-200 text-surface-400 dark:bg-surface-800 dark:text-surface-500 cursor-not-allowed'
          )}
          disabled={answers.size === 0}
        >
          Continue Pipeline
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
