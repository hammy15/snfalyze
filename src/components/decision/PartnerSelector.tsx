'use client';

import { Partner } from '@/hooks/usePartners';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, TrendingUp, Shield } from 'lucide-react';

interface PartnerSelectorProps {
  partners: Partner[];
  selectedPartnerId: string | null;
  onSelectPartner: (partnerId: string) => void;
  loading?: boolean;
}

export function PartnerSelector({
  partners,
  selectedPartnerId,
  onSelectPartner,
  loading,
}: PartnerSelectorProps) {
  const selectedPartner = partners.find((p) => p.id === selectedPartnerId);

  const formatPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-muted-foreground">
        Investment Partner
      </label>
      <Select
        value={selectedPartnerId || ''}
        onValueChange={onSelectPartner}
        disabled={loading}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a partner..." />
        </SelectTrigger>
        <SelectContent>
          {partners.map((partner) => (
            <SelectItem key={partner.id} value={partner.id}>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span>{partner.name}</span>
                <Badge variant="outline" className="ml-2 text-xs">
                  {partner.type}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {selectedPartner && (
        <Card variant="flat" className="mt-3">
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-muted-foreground text-xs">Target Cap Rate</p>
                  <p className="font-semibold">
                    {formatPercent(selectedPartner.economics.targetCapRate)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <div>
                  <p className="text-muted-foreground text-xs">Target Yield</p>
                  <p className="font-semibold">
                    {formatPercent(selectedPartner.economics.targetYield)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                <div>
                  <p className="text-muted-foreground text-xs">Min Coverage</p>
                  <p className="font-semibold">
                    {selectedPartner.economics.minCoverage.toFixed(2)}x
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Lease Structure:</span>
                <Badge variant="secondary" className="text-xs">
                  {selectedPartner.leaseTerms.structure}
                </Badge>
                <span>·</span>
                <span>
                  {selectedPartner.leaseTerms.initialTermYears}yr initial +{' '}
                  {selectedPartner.leaseTerms.renewalOptions}×
                  {selectedPartner.leaseTerms.renewalTermYears}yr renewals
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
