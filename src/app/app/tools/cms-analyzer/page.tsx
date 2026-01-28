'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, Star, TrendingUp, TrendingDown, Info, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingCategory {
  name: string;
  rating: number;
  stateAvg: number;
  nationalAvg: number;
  weight: number;
}

export default function CMSAnalyzerPage() {
  const [facilityName, setFacilityName] = useState<string>('Sample Skilled Nursing Facility');
  const [overallRating, setOverallRating] = useState<number>(3);

  const [ratings, setRatings] = useState<RatingCategory[]>([
    { name: 'Health Inspection', rating: 3, stateAvg: 2.8, nationalAvg: 3.0, weight: 0.50 },
    { name: 'Staffing', rating: 4, stateAvg: 3.2, nationalAvg: 3.1, weight: 0.25 },
    { name: 'Quality Measures', rating: 3, stateAvg: 3.0, nationalAvg: 3.0, weight: 0.25 },
  ]);

  // Quality measures breakdown
  const [qualityMeasures, setQualityMeasures] = useState({
    shortStay: {
      rehospitalization: 22.5,
      erVisits: 12.8,
      funcImprovement: 68.5,
    },
    longStay: {
      fallsWithInjury: 3.2,
      pressureUlcers: 5.8,
      utis: 4.5,
      antipsychotics: 18.2,
      restraints: 0.5,
    },
  });

  // Calculate weighted score
  const weightedScore = useMemo(() => {
    return ratings.reduce((sum, r) => sum + r.rating * r.weight, 0);
  }, [ratings]);

  const updateRating = (index: number, rating: number) => {
    setRatings(ratings.map((r, i) => (i === index ? { ...r, rating } : r)));
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 4) return 'text-green-600';
    if (rating >= 3) return 'text-yellow-600';
    if (rating >= 2) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRatingBg = (rating: number) => {
    if (rating >= 4) return 'bg-green-100 dark:bg-green-900/30';
    if (rating >= 3) return 'bg-yellow-100 dark:bg-yellow-900/30';
    if (rating >= 2) return 'bg-orange-100 dark:bg-orange-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
    const iconSize = size === 'lg' ? 'w-6 h-6' : 'w-4 h-4';
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              iconSize,
              star <= rating ? 'fill-amber-400 text-amber-400' : 'text-surface-300'
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/app/tools" className="neu-button p-2">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">CMS Star Rating Analyzer</h1>
          <p className="text-sm text-surface-500">Evaluate facility quality metrics and benchmarks</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Facility Info */}
          <div className="neu-card p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Building2 className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={facilityName}
                  onChange={(e) => setFacilityName(e.target.value)}
                  className="input text-lg font-semibold"
                  placeholder="Facility Name"
                />
              </div>
            </div>

            {/* Overall Rating */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20">
              <div>
                <div className="text-sm text-surface-500 mb-1">Overall CMS Rating</div>
                <div className="flex items-center gap-3">
                  <span className={cn('text-4xl font-bold', getRatingColor(overallRating))}>
                    {overallRating}
                  </span>
                  {renderStars(overallRating, 'lg')}
                </div>
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((r) => (
                  <button
                    key={r}
                    onClick={() => setOverallRating(r)}
                    className={cn(
                      'w-8 h-8 rounded-full font-medium transition-all',
                      overallRating === r
                        ? 'bg-amber-500 text-white'
                        : 'bg-surface-100 dark:bg-surface-800 hover:bg-surface-200'
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Category Ratings */}
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Rating Categories</h3>
            <div className="space-y-4">
              {ratings.map((category, idx) => (
                <div key={category.name} className={cn('p-3 rounded-lg', getRatingBg(category.rating))}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{category.name}</div>
                    <div className="flex items-center gap-2">
                      {renderStars(category.rating)}
                      <span className={cn('font-bold', getRatingColor(category.rating))}>
                        {category.rating}/5
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((r) => (
                      <button
                        key={r}
                        onClick={() => updateRating(idx, r)}
                        className={cn(
                          'flex-1 py-1 rounded text-sm font-medium transition-all',
                          category.rating === r
                            ? 'bg-white dark:bg-surface-700 shadow-sm'
                            : 'hover:bg-white/50 dark:hover:bg-surface-700/50'
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <div className="flex justify-between text-xs text-surface-500">
                    <span>State Avg: {category.stateAvg.toFixed(1)}</span>
                    <span>National Avg: {category.nationalAvg.toFixed(1)}</span>
                    <span>Weight: {(category.weight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs">
                    {category.rating > category.stateAvg ? (
                      <>
                        <TrendingUp className="w-3 h-3 text-green-500" />
                        <span className="text-green-600">Above state average</span>
                      </>
                    ) : category.rating < category.stateAvg ? (
                      <>
                        <TrendingDown className="w-3 h-3 text-red-500" />
                        <span className="text-red-600">Below state average</span>
                      </>
                    ) : (
                      <span className="text-surface-500">At state average</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quality Measures Detail */}
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Quality Measures Detail</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Short Stay */}
              <div>
                <h4 className="text-xs font-medium text-surface-500 uppercase mb-2">Short Stay Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Rehospitalization Rate</span>
                    <span className={cn('font-medium', qualityMeasures.shortStay.rehospitalization < 20 ? 'text-green-600' : 'text-amber-600')}>
                      {qualityMeasures.shortStay.rehospitalization}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>ER Visits</span>
                    <span className={cn('font-medium', qualityMeasures.shortStay.erVisits < 15 ? 'text-green-600' : 'text-amber-600')}>
                      {qualityMeasures.shortStay.erVisits}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Functional Improvement</span>
                    <span className={cn('font-medium', qualityMeasures.shortStay.funcImprovement > 65 ? 'text-green-600' : 'text-amber-600')}>
                      {qualityMeasures.shortStay.funcImprovement}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Long Stay */}
              <div>
                <h4 className="text-xs font-medium text-surface-500 uppercase mb-2">Long Stay Metrics</h4>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Falls with Injury</span>
                    <span className={cn('font-medium', qualityMeasures.longStay.fallsWithInjury < 3.5 ? 'text-green-600' : 'text-amber-600')}>
                      {qualityMeasures.longStay.fallsWithInjury}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Pressure Ulcers</span>
                    <span className={cn('font-medium', qualityMeasures.longStay.pressureUlcers < 5 ? 'text-green-600' : 'text-red-600')}>
                      {qualityMeasures.longStay.pressureUlcers}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>UTIs</span>
                    <span className={cn('font-medium', qualityMeasures.longStay.utis < 5 ? 'text-green-600' : 'text-amber-600')}>
                      {qualityMeasures.longStay.utis}%
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Antipsychotic Use</span>
                    <span className={cn('font-medium', qualityMeasures.longStay.antipsychotics < 15 ? 'text-green-600' : 'text-red-600')}>
                      {qualityMeasures.longStay.antipsychotics}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Analysis Summary</h3>
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-surface-50 dark:bg-surface-800">
                <div className="text-xs text-surface-500">Weighted Score</div>
                <div className="text-2xl font-bold">{weightedScore.toFixed(2)}</div>
              </div>

              <div className="p-3 rounded-lg bg-surface-50 dark:bg-surface-800">
                <div className="text-xs text-surface-500">Risk Level</div>
                <div className={cn(
                  'text-lg font-bold',
                  weightedScore >= 3.5 ? 'text-green-600' : weightedScore >= 2.5 ? 'text-amber-600' : 'text-red-600'
                )}>
                  {weightedScore >= 3.5 ? 'Low' : weightedScore >= 2.5 ? 'Medium' : 'High'}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-surface-50 dark:bg-surface-800">
                <div className="text-xs text-surface-500">SFF Status</div>
                <div className={cn('text-lg font-bold', overallRating >= 2 ? 'text-green-600' : 'text-red-600')}>
                  {overallRating >= 2 ? 'Not SFF' : 'SFF Candidate'}
                </div>
              </div>
            </div>
          </div>

          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-primary-500" />
              Rating Guide
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span><strong>5 Stars:</strong> Much above average</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span><strong>4 Stars:</strong> Above average</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span><strong>3 Stars:</strong> Average</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span><strong>2 Stars:</strong> Below average</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span><strong>1 Star:</strong> Much below average</span>
              </div>
            </div>
          </div>

          <div className="neu-card p-4">
            <h3 className="text-sm font-semibold mb-3">Acquisition Considerations</h3>
            <ul className="space-y-2 text-xs text-surface-600 dark:text-surface-400">
              {overallRating <= 2 && (
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  Low rating may indicate operational challenges
                </li>
              )}
              {ratings[0].rating <= 2 && (
                <li className="flex items-start gap-2">
                  <span className="text-red-500">•</span>
                  Health inspection issues require immediate attention
                </li>
              )}
              {ratings[1].rating <= 2 && (
                <li className="flex items-start gap-2">
                  <span className="text-amber-500">•</span>
                  Staffing concerns may affect reimbursement
                </li>
              )}
              {overallRating >= 4 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-500">•</span>
                  Strong ratings support premium valuation
                </li>
              )}
              <li className="flex items-start gap-2">
                <span className="text-blue-500">•</span>
                Review survey history for trends
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
