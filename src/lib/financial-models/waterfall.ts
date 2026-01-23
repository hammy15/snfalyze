/**
 * Waterfall Distribution Calculator
 * Models equity waterfall structures for JV/partnership deals
 */

export type WaterfallStructure = 'preferred_equity' | 'promote' | 'catch_up' | 'pari_passu';

export interface Partner {
  id: string;
  name: string;
  type: 'lp' | 'gp'; // Limited Partner or General Partner
  capitalCommitment: number;
  capitalContributed: number;
  ownershipPercent: number; // Base ownership before promotes
}

export interface WaterfallTier {
  tierId: string;
  tierName: string;
  returnThreshold: number; // IRR or multiple threshold
  thresholdType: 'irr' | 'multiple';
  lpShare: number; // LP share at this tier
  gpShare: number; // GP share at this tier (promote)
  isCatchUp?: boolean; // Is this a GP catch-up tier?
  catchUpTarget?: number; // GP catch-up to what percentage?
}

export interface WaterfallInput {
  partners: Partner[];
  tiers: WaterfallTier[];

  // Capital structure
  totalEquity: number;
  preferredReturn?: number; // Annual preferred return (e.g., 0.08 for 8%)

  // Cash flows
  cashFlows: {
    period: number;
    date?: Date;
    operatingCashFlow: number;
    capitalEvent?: number; // Sale/refinance proceeds
    capitalCall?: number; // Additional capital contributions
  }[];

  // Timing
  projectStartDate?: Date;
  holdPeriod: number;
}

export interface DistributionDetail {
  period: number;
  totalDistribution: number;
  preferredReturn: number;
  returnOfCapital: number;
  profitDistribution: number;

  // By partner
  partnerDistributions: {
    partnerId: string;
    partnerName: string;
    preferredReturn: number;
    returnOfCapital: number;
    profitDistribution: number;
    totalDistribution: number;
    cumulativeDistributions: number;
    remainingCapital: number;
  }[];

  // By tier
  tierDistributions: {
    tierId: string;
    tierName: string;
    amountDistributed: number;
    lpAmount: number;
    gpAmount: number;
  }[];

  // Running totals
  cumulativeDistributions: number;
  cumulativePreferred: number;
  cumulativeReturnOfCapital: number;
  cumulativeProfit: number;
}

export interface PartnerSummary {
  partnerId: string;
  partnerName: string;
  type: 'lp' | 'gp';

  // Contributions
  capitalCommitment: number;
  capitalContributed: number;

  // Distributions
  totalDistributions: number;
  preferredReturnReceived: number;
  returnOfCapitalReceived: number;
  profitShareReceived: number;
  promoteReceived: number;

  // Returns
  equityMultiple: number;
  irr: number;

  // Effective ownership
  baseOwnership: number;
  effectiveOwnership: number; // After promotes
}

export interface WaterfallResult {
  // Summary
  totalCapitalContributed: number;
  totalDistributions: number;
  totalProfit: number;
  projectIRR: number;
  projectMultiple: number;

  // Detailed distributions by period
  distributions: DistributionDetail[];

  // Partner summaries
  partnerSummaries: PartnerSummary[];

  // GP promote analysis
  gpPromoteTotal: number;
  gpPromoteAsPercentOfProfit: number;

  // LP returns
  lpTotalDistributions: number;
  lpEquityMultiple: number;
  lpIRR: number;

  // Waterfall tier analysis
  tierAnalysis: {
    tierId: string;
    tierName: string;
    totalDistributed: number;
    percentOfProfit: number;
  }[];
}

// Common waterfall structures
export const STANDARD_WATERFALL_STRUCTURES: Record<string, WaterfallTier[]> = {
  // Simple preferred with 80/20 promote after 8% pref
  simple_preferred: [
    { tierId: '1', tierName: 'Return of Capital', returnThreshold: 1.0, thresholdType: 'multiple', lpShare: 1.0, gpShare: 0 },
    { tierId: '2', tierName: 'Preferred Return (8%)', returnThreshold: 0.08, thresholdType: 'irr', lpShare: 1.0, gpShare: 0 },
    { tierId: '3', tierName: 'Profit Split', returnThreshold: 999, thresholdType: 'irr', lpShare: 0.80, gpShare: 0.20 },
  ],

  // Institutional with catch-up
  institutional: [
    { tierId: '1', tierName: 'Return of Capital', returnThreshold: 1.0, thresholdType: 'multiple', lpShare: 1.0, gpShare: 0 },
    { tierId: '2', tierName: 'Preferred Return (8%)', returnThreshold: 0.08, thresholdType: 'irr', lpShare: 1.0, gpShare: 0 },
    { tierId: '3', tierName: 'GP Catch-Up', returnThreshold: 0.10, thresholdType: 'irr', lpShare: 0, gpShare: 1.0, isCatchUp: true, catchUpTarget: 0.20 },
    { tierId: '4', tierName: '80/20 Split', returnThreshold: 0.15, thresholdType: 'irr', lpShare: 0.80, gpShare: 0.20 },
    { tierId: '5', tierName: '70/30 Above 15%', returnThreshold: 999, thresholdType: 'irr', lpShare: 0.70, gpShare: 0.30 },
  ],

  // Aggressive promote structure
  aggressive: [
    { tierId: '1', tierName: 'Return of Capital', returnThreshold: 1.0, thresholdType: 'multiple', lpShare: 1.0, gpShare: 0 },
    { tierId: '2', tierName: 'Preferred Return (6%)', returnThreshold: 0.06, thresholdType: 'irr', lpShare: 1.0, gpShare: 0 },
    { tierId: '3', tierName: '85/15 to 1.5x', returnThreshold: 1.5, thresholdType: 'multiple', lpShare: 0.85, gpShare: 0.15 },
    { tierId: '4', tierName: '75/25 to 2.0x', returnThreshold: 2.0, thresholdType: 'multiple', lpShare: 0.75, gpShare: 0.25 },
    { tierId: '5', tierName: '65/35 Above 2.0x', returnThreshold: 999, thresholdType: 'multiple', lpShare: 0.65, gpShare: 0.35 },
  ],
};

export class WaterfallCalculator {
  /**
   * Calculate IRR from cash flows
   */
  private calculateIRR(cashFlows: number[]): number {
    let rate = 0.15;
    const maxIterations = 1000;
    const tolerance = 0.0000001;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let derivativeNpv = 0;

      for (let j = 0; j < cashFlows.length; j++) {
        npv += cashFlows[j] / Math.pow(1 + rate, j);
        if (j > 0) {
          derivativeNpv -= j * cashFlows[j] / Math.pow(1 + rate, j + 1);
        }
      }

      if (Math.abs(npv) < tolerance) return rate;

      if (derivativeNpv === 0) {
        rate += 0.01;
      } else {
        rate = Math.max(-0.99, Math.min(10, rate - npv / derivativeNpv));
      }
    }

    return rate;
  }

  /**
   * Calculate equity multiple
   */
  private calculateMultiple(totalDistributions: number, totalContributions: number): number {
    if (totalContributions <= 0) return 0;
    return totalDistributions / totalContributions;
  }

  /**
   * Calculate preferred return accrual
   */
  private calculatePreferredAccrual(
    capitalBalance: number,
    preferredRate: number,
    periods: number = 1
  ): number {
    return capitalBalance * preferredRate * (periods / 12); // Assumes monthly periods
  }

  /**
   * Distribute cash through waterfall tiers
   */
  private distributeCash(
    availableCash: number,
    partners: Partner[],
    tiers: WaterfallTier[],
    capitalBalances: Map<string, number>,
    preferredAccruals: Map<string, number>,
    cumulativeDistributions: Map<string, number>,
    totalCapital: number
  ): {
    partnerDistributions: Map<string, { preferred: number; returnOfCapital: number; profit: number }>;
    tierDistributions: Map<string, { lp: number; gp: number }>;
    remainingCash: number;
  } {
    const partnerDistributions = new Map<string, { preferred: number; returnOfCapital: number; profit: number }>();
    const tierDistributions = new Map<string, { lp: number; gp: number }>();

    // Initialize partner distributions
    partners.forEach(p => {
      partnerDistributions.set(p.id, { preferred: 0, returnOfCapital: 0, profit: 0 });
    });

    // Initialize tier distributions
    tiers.forEach(t => {
      tierDistributions.set(t.tierId, { lp: 0, gp: 0 });
    });

    let remainingCash = availableCash;

    // Process each tier
    for (const tier of tiers) {
      if (remainingCash <= 0) break;

      // Calculate current position relative to threshold
      const totalDistributed = Array.from(cumulativeDistributions.values()).reduce((sum, d) => sum + d, 0);
      const currentMultiple = this.calculateMultiple(totalDistributed, totalCapital);

      // Determine amount to distribute at this tier
      let tierAmount = 0;

      if (tier.thresholdType === 'multiple') {
        const targetAmount = tier.returnThreshold * totalCapital;
        const neededForThreshold = Math.max(0, targetAmount - totalDistributed);
        tierAmount = Math.min(remainingCash, neededForThreshold);
      } else {
        // IRR-based threshold - simplified, distribute remaining
        tierAmount = remainingCash;
      }

      if (tierAmount <= 0) continue;

      // Distribute according to tier split
      const lpAmount = tierAmount * tier.lpShare;
      const gpAmount = tierAmount * tier.gpShare;

      // Distribute to LPs proportionally
      const lpPartners = partners.filter(p => p.type === 'lp');
      const totalLpOwnership = lpPartners.reduce((sum, p) => sum + p.ownershipPercent, 0);

      lpPartners.forEach(p => {
        const share = p.ownershipPercent / totalLpOwnership;
        const distribution = lpAmount * share;
        const current = partnerDistributions.get(p.id)!;

        // Allocate to preferred, ROC, or profit
        const preferredOwed = preferredAccruals.get(p.id) ?? 0;
        const capitalOwed = capitalBalances.get(p.id) ?? 0;

        if (preferredOwed > 0) {
          const prefPaid = Math.min(distribution, preferredOwed);
          current.preferred += prefPaid;
          preferredAccruals.set(p.id, preferredOwed - prefPaid);
        } else if (capitalOwed > 0) {
          const rocPaid = Math.min(distribution, capitalOwed);
          current.returnOfCapital += rocPaid;
          capitalBalances.set(p.id, capitalOwed - rocPaid);
        } else {
          current.profit += distribution;
        }

        partnerDistributions.set(p.id, current);
      });

      // Distribute GP promote
      const gpPartners = partners.filter(p => p.type === 'gp');
      const totalGpOwnership = gpPartners.reduce((sum, p) => sum + p.ownershipPercent, 0) || 1;

      gpPartners.forEach(p => {
        const share = p.ownershipPercent / totalGpOwnership;
        const distribution = gpAmount * share;
        const current = partnerDistributions.get(p.id)!;
        current.profit += distribution; // GP promote is always profit
        partnerDistributions.set(p.id, current);
      });

      tierDistributions.set(tier.tierId, { lp: lpAmount, gp: gpAmount });
      remainingCash -= tierAmount;
    }

    return { partnerDistributions, tierDistributions, remainingCash };
  }

  /**
   * Run full waterfall calculation
   */
  runFullAnalysis(input: WaterfallInput): WaterfallResult {
    const { partners, tiers, cashFlows, preferredReturn = 0.08, totalEquity } = input;

    // Initialize tracking
    const capitalBalances = new Map<string, number>();
    const preferredAccruals = new Map<string, number>();
    const cumulativeDistributions = new Map<string, number>();
    const partnerCashFlows = new Map<string, number[]>();

    partners.forEach(p => {
      capitalBalances.set(p.id, p.capitalContributed);
      preferredAccruals.set(p.id, 0);
      cumulativeDistributions.set(p.id, 0);
      partnerCashFlows.set(p.id, [-p.capitalContributed]); // Initial investment
    });

    const distributions: DistributionDetail[] = [];
    let runningCumulativeDistributions = 0;
    let runningCumulativePreferred = 0;
    let runningCumulativeROC = 0;
    let runningCumulativeProfit = 0;

    // Process each cash flow period
    for (const cf of cashFlows) {
      // Accrue preferred return
      partners.forEach(p => {
        if (p.type === 'lp') {
          const balance = capitalBalances.get(p.id) ?? 0;
          const accrual = this.calculatePreferredAccrual(balance, preferredReturn);
          preferredAccruals.set(p.id, (preferredAccruals.get(p.id) ?? 0) + accrual);
        }
      });

      // Handle capital calls
      if (cf.capitalCall && cf.capitalCall > 0) {
        partners.forEach(p => {
          const callAmount = cf.capitalCall! * p.ownershipPercent;
          capitalBalances.set(p.id, (capitalBalances.get(p.id) ?? 0) + callAmount);
          const flows = partnerCashFlows.get(p.id) ?? [];
          flows.push(-callAmount);
          partnerCashFlows.set(p.id, flows);
        });
        continue;
      }

      // Calculate total distributable cash
      const totalDistributable = cf.operatingCashFlow + (cf.capitalEvent ?? 0);

      if (totalDistributable <= 0) {
        // No distribution this period
        partners.forEach(p => {
          const flows = partnerCashFlows.get(p.id) ?? [];
          flows.push(0);
          partnerCashFlows.set(p.id, flows);
        });
        continue;
      }

      // Distribute through waterfall
      const { partnerDistributions, tierDistributions } = this.distributeCash(
        totalDistributable,
        partners,
        tiers,
        capitalBalances,
        preferredAccruals,
        cumulativeDistributions,
        totalEquity
      );

      // Build period distribution detail
      let periodPreferred = 0;
      let periodROC = 0;
      let periodProfit = 0;

      const periodPartnerDistributions = partners.map(p => {
        const dist = partnerDistributions.get(p.id)!;
        const totalDist = dist.preferred + dist.returnOfCapital + dist.profit;

        periodPreferred += dist.preferred;
        periodROC += dist.returnOfCapital;
        periodProfit += dist.profit;

        // Update cumulative
        const prevCumulative = cumulativeDistributions.get(p.id) ?? 0;
        cumulativeDistributions.set(p.id, prevCumulative + totalDist);

        // Update partner cash flows
        const flows = partnerCashFlows.get(p.id) ?? [];
        flows.push(totalDist);
        partnerCashFlows.set(p.id, flows);

        return {
          partnerId: p.id,
          partnerName: p.name,
          preferredReturn: dist.preferred,
          returnOfCapital: dist.returnOfCapital,
          profitDistribution: dist.profit,
          totalDistribution: totalDist,
          cumulativeDistributions: prevCumulative + totalDist,
          remainingCapital: capitalBalances.get(p.id) ?? 0,
        };
      });

      const periodTierDistributions = tiers.map(t => {
        const tierDist = tierDistributions.get(t.tierId) ?? { lp: 0, gp: 0 };
        return {
          tierId: t.tierId,
          tierName: t.tierName,
          amountDistributed: tierDist.lp + tierDist.gp,
          lpAmount: tierDist.lp,
          gpAmount: tierDist.gp,
        };
      });

      runningCumulativeDistributions += totalDistributable;
      runningCumulativePreferred += periodPreferred;
      runningCumulativeROC += periodROC;
      runningCumulativeProfit += periodProfit;

      distributions.push({
        period: cf.period,
        totalDistribution: totalDistributable,
        preferredReturn: periodPreferred,
        returnOfCapital: periodROC,
        profitDistribution: periodProfit,
        partnerDistributions: periodPartnerDistributions,
        tierDistributions: periodTierDistributions,
        cumulativeDistributions: runningCumulativeDistributions,
        cumulativePreferred: runningCumulativePreferred,
        cumulativeReturnOfCapital: runningCumulativeROC,
        cumulativeProfit: runningCumulativeProfit,
      });
    }

    // Build partner summaries
    const partnerSummaries: PartnerSummary[] = partners.map(p => {
      const flows = partnerCashFlows.get(p.id) ?? [];
      const totalDistributions = flows.slice(1).reduce((sum, f) => sum + Math.max(0, f), 0);
      const totalContributions = Math.abs(flows[0]);

      // Parse distribution types from accumulated data
      let preferredReceived = 0;
      let rocReceived = 0;
      let profitReceived = 0;
      let promoteReceived = 0;

      distributions.forEach(d => {
        const pd = d.partnerDistributions.find(pd => pd.partnerId === p.id);
        if (pd) {
          preferredReceived += pd.preferredReturn;
          rocReceived += pd.returnOfCapital;
          if (p.type === 'gp') {
            promoteReceived += pd.profitDistribution;
          } else {
            profitReceived += pd.profitDistribution;
          }
        }
      });

      const equityMultiple = this.calculateMultiple(totalDistributions, totalContributions);
      const irr = this.calculateIRR(flows);

      const effectiveOwnership = totalDistributions / runningCumulativeDistributions;

      return {
        partnerId: p.id,
        partnerName: p.name,
        type: p.type,
        capitalCommitment: p.capitalCommitment,
        capitalContributed: totalContributions,
        totalDistributions,
        preferredReturnReceived: preferredReceived,
        returnOfCapitalReceived: rocReceived,
        profitShareReceived: profitReceived,
        promoteReceived,
        equityMultiple,
        irr,
        baseOwnership: p.ownershipPercent,
        effectiveOwnership,
      };
    });

    // Calculate summary metrics
    const totalCapitalContributed = partners.reduce((sum, p) => sum + p.capitalContributed, 0);
    const totalDistributions = runningCumulativeDistributions;
    const totalProfit = runningCumulativeProfit;

    // Project cash flows for IRR
    const projectCashFlows = [-totalCapitalContributed];
    cashFlows.forEach(cf => {
      projectCashFlows.push(cf.operatingCashFlow + (cf.capitalEvent ?? 0) - (cf.capitalCall ?? 0));
    });

    const projectIRR = this.calculateIRR(projectCashFlows);
    const projectMultiple = this.calculateMultiple(totalDistributions, totalCapitalContributed);

    // GP promote analysis
    const gpPromoteTotal = partnerSummaries
      .filter(p => p.type === 'gp')
      .reduce((sum, p) => sum + p.promoteReceived, 0);
    const gpPromoteAsPercentOfProfit = totalProfit > 0 ? gpPromoteTotal / totalProfit : 0;

    // LP analysis
    const lpSummaries = partnerSummaries.filter(p => p.type === 'lp');
    const lpTotalDistributions = lpSummaries.reduce((sum, p) => sum + p.totalDistributions, 0);
    const lpTotalContributions = lpSummaries.reduce((sum, p) => sum + p.capitalContributed, 0);
    const lpEquityMultiple = this.calculateMultiple(lpTotalDistributions, lpTotalContributions);

    // LP IRR (aggregate)
    const lpFlows = [-lpTotalContributions];
    distributions.forEach(d => {
      const lpDist = d.partnerDistributions
        .filter(pd => lpSummaries.some(lp => lp.partnerId === pd.partnerId))
        .reduce((sum, pd) => sum + pd.totalDistribution, 0);
      lpFlows.push(lpDist);
    });
    const lpIRR = this.calculateIRR(lpFlows);

    // Tier analysis
    const tierAnalysis = tiers.map(t => {
      const totalDistributed = distributions.reduce((sum, d) => {
        const tierDist = d.tierDistributions.find(td => td.tierId === t.tierId);
        return sum + (tierDist?.amountDistributed ?? 0);
      }, 0);

      return {
        tierId: t.tierId,
        tierName: t.tierName,
        totalDistributed,
        percentOfProfit: totalProfit > 0 ? totalDistributed / totalProfit : 0,
      };
    });

    return {
      totalCapitalContributed,
      totalDistributions,
      totalProfit,
      projectIRR,
      projectMultiple,
      distributions,
      partnerSummaries,
      gpPromoteTotal,
      gpPromoteAsPercentOfProfit,
      lpTotalDistributions,
      lpEquityMultiple,
      lpIRR,
      tierAnalysis,
    };
  }
}

// Export singleton instance
export const waterfallCalculator = new WaterfallCalculator();
