'use client';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2, AlertTriangle } from 'lucide-react';

interface StageConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'warning';
}

export function StageConfirmation({
  open,
  onOpenChange,
  title,
  message,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
}: StageConfirmationProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-surface-900 border border-surface-200 dark:border-surface-700">
        <DialogHeader>
          <div className="flex items-center gap-3">
            {variant === 'warning' ? (
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
            )}
            <DialogTitle className="text-surface-900 dark:text-surface-100">{title}</DialogTitle>
          </div>
          {/* Use a regular p tag instead of DialogDescription for better contrast */}
          <p className="pt-3 text-base text-surface-700 dark:text-surface-300 leading-relaxed">
            {message}
          </p>
        </DialogHeader>
        <DialogFooter className="flex gap-3 sm:gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'warning' ? 'destructive' : 'default'}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
