'use client';

import { useState } from 'react';
import { Image, RefreshCw, Download, Maximize2, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VisualType } from '@/lib/learning/types';

interface VisualCardProps {
  type: VisualType;
  data: Record<string, unknown>;
  title?: string;
  style?: 'professional' | 'executive' | 'detailed';
  className?: string;
}

const TYPE_LABELS: Record<VisualType, string> = {
  deal_summary: 'Deal Summary',
  valuation_breakdown: 'Valuation Breakdown',
  portfolio_map: 'Portfolio Map',
  proforma_chart: 'Proforma Projection',
  comparison_diff: 'Raw vs Proforma',
  learned_preferences: 'Learned Preferences',
};

export function VisualCard({ type, data, title, style = 'professional', className }: VisualCardProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/visuals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, data, style }),
      });
      const result = await res.json();
      if (result.success && result.data?.imageUrl) {
        setImageUrl(result.data.imageUrl);
      } else {
        setError(result.error || 'Failed to generate visual');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!imageUrl) return;
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = `${type}-${Date.now()}.png`;
    a.click();
  };

  return (
    <>
      <div className={cn(
        'neu-card !p-0 overflow-hidden',
        className
      )}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-primary-500" />
            <h4 className="text-sm font-semibold text-surface-800">
              {title || TYPE_LABELS[type]}
            </h4>
          </div>
          <div className="flex items-center gap-1">
            {imageUrl && (
              <>
                <button
                  onClick={() => setFullscreen(true)}
                  className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDownload}
                  className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
              </>
            )}
            <button
              onClick={generate}
              disabled={loading}
              className="p-1.5 rounded-lg hover:bg-surface-100 text-surface-400 hover:text-surface-600 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            </button>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-surface-400">
              <Loader2 className="w-8 h-8 animate-spin mb-3" />
              <p className="text-sm">Generating infographic...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-red-500 mb-2">{error}</p>
              <button
                onClick={generate}
                className="text-xs text-primary-500 hover:text-primary-600 font-medium"
              >
                Try again
              </button>
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={TYPE_LABELS[type]}
              className="w-full rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => setFullscreen(true)}
            />
          ) : (
            <button
              onClick={generate}
              className="w-full flex flex-col items-center justify-center py-12 rounded-lg border-2 border-dashed border-surface-200 hover:border-primary-300 hover:bg-primary-50/30 transition-all group cursor-pointer"
            >
              <Image className="w-10 h-10 text-surface-300 group-hover:text-primary-400 mb-3 transition-colors" />
              <span className="text-sm font-medium text-surface-500 group-hover:text-primary-600 transition-colors">
                Generate {TYPE_LABELS[type]}
              </span>
              <span className="text-xs text-surface-400 mt-1">Powered by Nano Banana Pro</span>
            </button>
          )}
        </div>
      </div>

      {/* Fullscreen Modal */}
      {fullscreen && imageUrl && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-8"
          onClick={() => setFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            onClick={() => setFullscreen(false)}
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={imageUrl}
            alt={TYPE_LABELS[type]}
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
