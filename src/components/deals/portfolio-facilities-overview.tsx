'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  AlertTriangle,
  DollarSign,
  Users,
  Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FacilityData {
  id: string;
  name: string;
  beds: number;
  occupancy: number;
  ebitda: number;
  cmsRating?: number;
  healthRating?: number;
  staffingRating?: number;
  qualityRating?: number;
  isSff?: boolean;
}

interface PortfolioFacilitiesOverviewProps {
  facilities: FacilityData[];
  portfolioRevenue?: number;
  portfolioNoi?: number;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function StarRating({ rating, size = 'sm' }: { rating?: number; size?: 'sm' | 'md' }) {
  if (!rating) return <span className="text-muted-foreground text-xs">N/A</span>;

  const sizeClass = size === 'sm' ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={cn(
            sizeClass,
            star <= rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
          )}
        />
      ))}
    </div>
  );
}

export function PortfolioFacilitiesOverview({
  facilities,
  portfolioRevenue,
  portfolioNoi,
}: PortfolioFacilitiesOverviewProps) {
  // Calculate portfolio totals
  const totalBeds = facilities.reduce((sum, f) => sum + f.beds, 0);
  const totalEbitda = facilities.reduce((sum, f) => sum + (f.ebitda || 0), 0);
  const avgOccupancy = facilities.length > 0
    ? facilities.reduce((sum, f) => sum + (f.occupancy || 0), 0) / facilities.length
    : 0;
  const avgCmsRating = facilities.filter(f => f.cmsRating).length > 0
    ? facilities.reduce((sum, f) => sum + (f.cmsRating || 0), 0) / facilities.filter(f => f.cmsRating).length
    : 0;
  const hasSff = facilities.some(f => f.isSff);

  return (
    <div className="space-y-4">
      {/* Portfolio Summary */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Portfolio Summary
              </CardTitle>
              <CardDescription>
                {facilities.length} facilities · {totalBeds} total beds
              </CardDescription>
            </div>
            {hasSff && (
              <Badge variant="destructive" className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                SFF Facility
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Total Beds</p>
              <p className="text-2xl font-bold">{totalBeds}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg Occupancy</p>
              <p className="text-2xl font-bold">
                {avgOccupancy > 0 ? formatPercent(avgOccupancy) : '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Portfolio EBITDA</p>
              <p className="text-2xl font-bold text-green-600">
                {totalEbitda > 0 ? formatCurrency(totalEbitda) : '—'}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Avg CMS Rating</p>
              <div className="flex items-center gap-2">
                <StarRating rating={Math.round(avgCmsRating)} size="md" />
                {avgCmsRating > 0 && (
                  <span className="text-lg font-semibold">{avgCmsRating.toFixed(1)}</span>
                )}
              </div>
            </div>
          </div>

          {/* Portfolio Revenue/NOI if available */}
          {(portfolioRevenue || portfolioNoi) && (
            <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
              {portfolioRevenue && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Portfolio Revenue</p>
                  <p className="text-xl font-bold">{formatCurrency(portfolioRevenue)}</p>
                </div>
              )}
              {portfolioNoi && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Portfolio NOI</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(portfolioNoi)}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Facilities */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Facilities Breakdown</CardTitle>
          <CardDescription>Performance metrics by facility</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium text-muted-foreground">Facility</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">Beds</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">Occupancy</th>
                  <th className="text-right py-2 px-2 font-medium text-muted-foreground">EBITDA</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">CMS Rating</th>
                  <th className="text-center py-2 px-2 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((facility) => {
                  const occupancyColor = facility.occupancy >= 0.85
                    ? 'text-green-600'
                    : facility.occupancy >= 0.75
                    ? 'text-amber-600'
                    : facility.occupancy > 0
                    ? 'text-red-600'
                    : 'text-muted-foreground';

                  return (
                    <tr key={facility.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{facility.name}</span>
                          {facility.isSff && (
                            <Badge variant="destructive" className="text-xs px-1">SFF</Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">{facility.beds}</td>
                      <td className="py-3 px-2 text-center">
                        <span className={cn('font-medium', occupancyColor)}>
                          {facility.occupancy > 0 ? formatPercent(facility.occupancy) : '—'}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-right font-medium">
                        {facility.ebitda > 0 ? formatCurrency(facility.ebitda) : '—'}
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex justify-center">
                          <StarRating rating={facility.cmsRating} />
                        </div>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {facility.cmsRating ? (
                          facility.cmsRating >= 4 ? (
                            <Badge className="bg-green-100 text-green-800">Strong</Badge>
                          ) : facility.cmsRating >= 3 ? (
                            <Badge className="bg-amber-100 text-amber-800">Average</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">At Risk</Badge>
                          )
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Portfolio Total Row */}
              <tfoot>
                <tr className="bg-muted/50 font-medium">
                  <td className="py-3 px-2">Portfolio Total</td>
                  <td className="py-3 px-2 text-center">{totalBeds}</td>
                  <td className="py-3 px-2 text-center">
                    {avgOccupancy > 0 ? formatPercent(avgOccupancy) : '—'}
                  </td>
                  <td className="py-3 px-2 text-right text-green-600">
                    {totalEbitda > 0 ? formatCurrency(totalEbitda) : '—'}
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex justify-center">
                      <StarRating rating={Math.round(avgCmsRating)} />
                    </div>
                  </td>
                  <td className="py-3 px-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default PortfolioFacilitiesOverview;
