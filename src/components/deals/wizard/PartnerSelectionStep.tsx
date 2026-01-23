'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Building2, Users, CheckCircle, AlertCircle, TrendingUp, Clock, Percent } from 'lucide-react';
import type { WizardData } from './DealSetupWizard';

interface Partner {
  id: string;
  name: string;
  type: string;
  minimumCoverageRatio?: number;
  targetYield?: number;
  leaseTermPreference?: string;
  rentEscalation?: number;
  minDealSize?: number;
  maxDealSize?: number;
}

interface PartnerSelectionStepProps {
  data: WizardData;
  partners: Partner[];
  onUpdate: (updates: Partial<WizardData>) => void;
}

export function PartnerSelectionStep({ data, partners, onUpdate }: PartnerSelectionStepProps) {
  const isSaleLeaseback = data.dealStructure === 'sale_leaseback';

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  if (!isSaleLeaseback) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 mx-auto text-surface-400 mb-4" />
        <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-100">
          Partner Selection Optional
        </h3>
        <p className="text-surface-500 mt-2 max-w-md mx-auto">
          Partner selection is primarily used for sale-leaseback transactions.
          You can skip this step for {data.dealStructure.replace('_', ' ')} deals.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Select Buyer Partner (Optional)</h3>
        <p className="text-sm text-surface-500 mt-1">
          Choose a capital partner as the buyer/lessor for this sale-leaseback transaction.
          Their requirements will be used for coverage analysis.
        </p>
      </div>

      {/* Skip Partner Option */}
      <Card
        hover
        className={`cursor-pointer transition-all ${
          !data.buyerPartnerId
            ? 'ring-2 ring-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
            : 'hover:border-emerald-300'
        }`}
        onClick={() => onUpdate({ buyerPartnerId: undefined })}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                !data.buyerPartnerId
                  ? 'bg-emerald-600 text-white'
                  : 'bg-surface-100 text-surface-600'
              }`}
            >
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-surface-900 dark:text-surface-100">
                No Partner Selected
              </h4>
              <p className="text-sm text-surface-500">
                Use default coverage requirements (1.4x for SNF, 1.35x for ALF)
              </p>
            </div>
            {!data.buyerPartnerId && (
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Partner List */}
      {partners.length > 0 ? (
        <div className="space-y-3">
          <Label className="text-sm font-medium text-surface-600">
            Available Sale-Leaseback Partners
          </Label>
          {partners.map((partner) => {
            const isSelected = data.buyerPartnerId === partner.id;

            return (
              <Card
                key={partner.id}
                hover
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'hover:border-emerald-300'
                }`}
                onClick={() => onUpdate({ buyerPartnerId: partner.id })}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-3 rounded-lg ${
                        isSelected
                          ? 'bg-emerald-600 text-white'
                          : 'bg-surface-100 text-surface-600'
                      }`}
                    >
                      <Building2 className="h-6 w-6" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-surface-900 dark:text-surface-100">
                          {partner.name}
                        </h4>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-emerald-600" />
                        )}
                      </div>
                      <p className="text-sm text-surface-500 capitalize">
                        {partner.type}
                      </p>

                      {/* Partner Metrics */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        {partner.minimumCoverageRatio && (
                          <div className="flex items-center gap-2 text-sm">
                            <TrendingUp className="h-4 w-4 text-surface-400" />
                            <div>
                              <span className="text-surface-500">Min Coverage</span>
                              <p className="font-semibold">
                                {partner.minimumCoverageRatio}x
                              </p>
                            </div>
                          </div>
                        )}

                        {partner.targetYield && (
                          <div className="flex items-center gap-2 text-sm">
                            <Percent className="h-4 w-4 text-surface-400" />
                            <div>
                              <span className="text-surface-500">Target Yield</span>
                              <p className="font-semibold">
                                {formatPercent(partner.targetYield)}
                              </p>
                            </div>
                          </div>
                        )}

                        {partner.leaseTermPreference && (
                          <div className="flex items-center gap-2 text-sm">
                            <Clock className="h-4 w-4 text-surface-400" />
                            <div>
                              <span className="text-surface-500">Lease Term</span>
                              <p className="font-semibold">
                                {partner.leaseTermPreference}
                              </p>
                            </div>
                          </div>
                        )}

                        {(partner.minDealSize || partner.maxDealSize) && (
                          <div className="flex items-center gap-2 text-sm">
                            <Building2 className="h-4 w-4 text-surface-400" />
                            <div>
                              <span className="text-surface-500">Deal Size</span>
                              <p className="font-semibold text-xs">
                                {partner.minDealSize
                                  ? formatCurrency(partner.minDealSize)
                                  : '$0'}{' '}
                                -{' '}
                                {partner.maxDealSize
                                  ? formatCurrency(partner.maxDealSize)
                                  : 'No max'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-surface-50 dark:bg-surface-800 rounded-lg">
          <Users className="h-10 w-10 mx-auto text-surface-400 mb-3" />
          <p className="text-surface-500">No sale-leaseback partners configured</p>
          <p className="text-sm text-surface-400 mt-1">
            Default coverage requirements will be used
          </p>
        </div>
      )}

      {/* Summary */}
      {data.buyerPartnerId && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <h4 className="font-medium text-emerald-800 dark:text-emerald-200 mb-2">
            Selected Partner
          </h4>
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {partners.find((p) => p.id === data.buyerPartnerId)?.name}
          </p>
          <p className="text-xs text-emerald-500 mt-2">
            Partner coverage and yield requirements will be applied to the analysis
          </p>
        </div>
      )}
    </div>
  );
}
