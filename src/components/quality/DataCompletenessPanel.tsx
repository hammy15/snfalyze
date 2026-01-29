'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { CheckCircle2, Circle, AlertCircle } from 'lucide-react';

interface DataField {
  name: string;
  present: boolean;
  required: boolean;
}

interface CompletenessCategory {
  revenue: { present: boolean; fields: DataField[] };
  expenses: { present: boolean; fields: DataField[] };
  census: { present: boolean; fields: DataField[] };
  rates: { present: boolean; fields: DataField[] };
  facilityInfo: { present: boolean; fields: DataField[] };
}

interface DataCompletenessPanelProps {
  completeness: CompletenessCategory;
  compact?: boolean;
}

export function DataCompletenessPanel({ completeness, compact = false }: DataCompletenessPanelProps) {
  const categories = [
    { key: 'revenue', label: 'Revenue Data', icon: '💰', data: completeness.revenue },
    { key: 'expenses', label: 'Expense Data', icon: '📊', data: completeness.expenses },
    { key: 'census', label: 'Census/Occupancy', icon: '🛏️', data: completeness.census },
    { key: 'rates', label: 'Payer Rates', icon: '💵', data: completeness.rates },
    { key: 'facilityInfo', label: 'Facility Info', icon: '🏥', data: completeness.facilityInfo },
  ];

  // Calculate overall completeness
  const totalRequired = categories.reduce(
    (acc, cat) => acc + cat.data.fields.filter((f) => f.required).length,
    0
  );
  const presentRequired = categories.reduce(
    (acc, cat) => acc + cat.data.fields.filter((f) => f.required && f.present).length,
    0
  );
  const completenessPercent = totalRequired > 0 ? Math.round((presentRequired / totalRequired) * 100) : 0;

  if (compact) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Data Completeness</span>
          <span className="font-medium">{completenessPercent}%</span>
        </div>
        <div className="flex gap-1">
          {categories.map((cat) => (
            <div
              key={cat.key}
              className={cn(
                'flex-1 h-2 rounded',
                cat.data.present ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
              )}
              title={`${cat.label}: ${cat.data.present ? 'Present' : 'Missing'}`}
            />
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          {categories.map((cat) => (
            <span key={cat.key} title={cat.label}>
              {cat.icon}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Data Completeness
          </CardTitle>
          <span
            className={cn(
              'text-lg font-bold',
              completenessPercent >= 80
                ? 'text-emerald-600'
                : completenessPercent >= 50
                  ? 'text-amber-600'
                  : 'text-red-600'
            )}
          >
            {completenessPercent}%
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {categories.map((category) => (
            <div key={category.key} className="space-y-2">
              <div className="flex items-center gap-2">
                <span>{category.icon}</span>
                <span className="font-medium text-sm">{category.label}</span>
                {category.data.present ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 ml-auto" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-orange-500 ml-auto" />
                )}
              </div>
              <div className="ml-6 space-y-1">
                {category.data.fields.map((field) => (
                  <div
                    key={field.name}
                    className="flex items-center gap-2 text-sm text-muted-foreground"
                  >
                    {field.present ? (
                      <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <Circle
                        className={cn(
                          'h-3 w-3',
                          field.required ? 'text-red-400' : 'text-gray-400'
                        )}
                      />
                    )}
                    <span className={cn(!field.present && field.required && 'text-red-500')}>
                      {field.name}
                      {field.required && !field.present && ' (required)'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
