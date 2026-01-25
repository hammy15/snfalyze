import { describe, it, expect } from 'vitest';
import {
  getDaysInMonth,
  calculatePayerRevenue,
  calculateBlendedPPD,
  calculateAllInPPD,
  calculatePortfolioMetrics,
  calculateYoYChange,
  calculateCAGR,
  projectWithGrowth,
  calculateSkilledMix,
} from '@/lib/proforma/calculations';
import type {
  CensusByPayer,
  PayerRates,
  FacilityFinancials,
} from '@/components/financials/types';

describe('Proforma Calculations', () => {
  describe('getDaysInMonth', () => {
    it('should return correct days for January', () => {
      expect(getDaysInMonth(2024, 0)).toBe(31); // January
    });

    it('should return correct days for February (leap year)', () => {
      expect(getDaysInMonth(2024, 1)).toBe(29); // 2024 is a leap year
    });

    it('should return correct days for February (non-leap year)', () => {
      expect(getDaysInMonth(2023, 1)).toBe(28);
    });

    it('should return correct days for April', () => {
      expect(getDaysInMonth(2024, 3)).toBe(30); // April
    });

    it('should return correct days for December', () => {
      expect(getDaysInMonth(2024, 11)).toBe(31); // December
    });
  });

  describe('calculatePayerRevenue', () => {
    const mockCensus: CensusByPayer = {
      medicarePartADays: 100,
      medicareAdvantageDays: 50,
      managedCareDays: 30,
      medicaidDays: 500,
      managedMedicaidDays: 100,
      privateDays: 80,
      vaContractDays: 20,
      hospiceDays: 10,
      otherDays: 10,
    };

    const mockRates: Partial<PayerRates> = {
      medicarePartAPpd: 625,
      medicareAdvantagePpd: 480,
      managedCarePpd: 420,
      medicaidPpd: 185,
      managedMedicaidPpd: 195,
      privatePpd: 285,
      vaContractPpd: 310,
      hospicePpd: 175,
      ancillaryRevenuePpd: 20,
      therapyRevenuePpd: 5,
    };

    it('should calculate Medicare Part A revenue correctly', () => {
      const revenue = calculatePayerRevenue(mockCensus, mockRates);
      expect(revenue.medicarePartA).toBe(100 * 625); // 62,500
    });

    it('should calculate Medicaid revenue correctly', () => {
      const revenue = calculatePayerRevenue(mockCensus, mockRates);
      expect(revenue.medicaid).toBe(500 * 185); // 92,500
    });

    it('should calculate ancillary revenue based on total days', () => {
      const revenue = calculatePayerRevenue(mockCensus, mockRates);
      const totalDays = 100 + 50 + 30 + 500 + 100 + 80 + 20 + 10 + 10; // 900
      expect(revenue.ancillary).toBe(totalDays * 20); // 18,000
    });

    it('should calculate total revenue correctly', () => {
      const revenue = calculatePayerRevenue(mockCensus, mockRates);
      expect(revenue.total).toBeGreaterThan(0);
      expect(revenue.total).toBe(
        revenue.medicarePartA +
        revenue.medicareAdvantage +
        revenue.managedCare +
        revenue.medicaid +
        revenue.managedMedicaid +
        revenue.private +
        revenue.vaContract +
        revenue.hospice +
        revenue.other +
        revenue.ancillary +
        revenue.therapy
      );
    });

    it('should handle missing rates', () => {
      const partialRates: Partial<PayerRates> = {
        medicarePartAPpd: 625,
      };
      const revenue = calculatePayerRevenue(mockCensus, partialRates);
      expect(revenue.medicarePartA).toBe(62500);
      expect(revenue.medicaid).toBe(0); // No rate provided
    });

    it('should return zero for zero census', () => {
      const zeroCensus: CensusByPayer = {
        medicarePartADays: 0,
        medicareAdvantageDays: 0,
        managedCareDays: 0,
        medicaidDays: 0,
        managedMedicaidDays: 0,
        privateDays: 0,
        vaContractDays: 0,
        hospiceDays: 0,
        otherDays: 0,
      };
      const revenue = calculatePayerRevenue(zeroCensus, mockRates);
      expect(revenue.total).toBe(0);
    });
  });

  describe('calculateBlendedPPD', () => {
    const mockCensus: CensusByPayer = {
      medicarePartADays: 100,
      medicareAdvantageDays: 0,
      managedCareDays: 0,
      medicaidDays: 900,
      managedMedicaidDays: 0,
      privateDays: 0,
      vaContractDays: 0,
      hospiceDays: 0,
      otherDays: 0,
    };

    const mockRates: Partial<PayerRates> = {
      medicarePartAPpd: 600,
      medicaidPpd: 200,
      ancillaryRevenuePpd: 20,
      therapyRevenuePpd: 5,
    };

    it('should calculate weighted average PPD', () => {
      const blendedPPD = calculateBlendedPPD(mockCensus, mockRates);
      // Medicare: 100 * 600 = 60,000
      // Medicaid: 900 * 200 = 180,000
      // Total R&B: 240,000
      // Total days: 1,000
      // Blended: 240,000 / 1,000 = 240
      expect(blendedPPD).toBe(240);
    });

    it('should exclude ancillary and therapy from blended PPD', () => {
      const blendedPPD = calculateBlendedPPD(mockCensus, mockRates);
      // Should be 240, not 265 (which would include ancillary/therapy)
      expect(blendedPPD).toBe(240);
    });

    it('should return 0 for zero census', () => {
      const zeroCensus: CensusByPayer = {
        medicarePartADays: 0,
        medicareAdvantageDays: 0,
        managedCareDays: 0,
        medicaidDays: 0,
        managedMedicaidDays: 0,
        privateDays: 0,
        vaContractDays: 0,
        hospiceDays: 0,
        otherDays: 0,
      };
      expect(calculateBlendedPPD(zeroCensus, mockRates)).toBe(0);
    });
  });

  describe('calculateAllInPPD', () => {
    const mockCensus: CensusByPayer = {
      medicarePartADays: 100,
      medicareAdvantageDays: 0,
      managedCareDays: 0,
      medicaidDays: 900,
      managedMedicaidDays: 0,
      privateDays: 0,
      vaContractDays: 0,
      hospiceDays: 0,
      otherDays: 0,
    };

    const mockRates: Partial<PayerRates> = {
      medicarePartAPpd: 600,
      medicaidPpd: 200,
      ancillaryRevenuePpd: 20,
      therapyRevenuePpd: 5,
    };

    it('should include ancillary and therapy in all-in PPD', () => {
      const allInPPD = calculateAllInPPD(mockCensus, mockRates);
      // Total revenue: 60,000 + 180,000 + 20,000 + 5,000 = 265,000
      // Total days: 1,000
      // All-in: 265
      expect(allInPPD).toBe(265);
    });
  });

  describe('calculateYoYChange', () => {
    it('should calculate positive year-over-year change', () => {
      const change = calculateYoYChange(110, 100);
      expect(change).toBeCloseTo(0.1, 5); // 10% increase
    });

    it('should calculate negative year-over-year change', () => {
      const change = calculateYoYChange(90, 100);
      expect(change).toBeCloseTo(-0.1, 5); // 10% decrease
    });

    it('should return 0 when prior value is 0', () => {
      expect(calculateYoYChange(100, 0)).toBe(0);
    });

    it('should handle no change', () => {
      expect(calculateYoYChange(100, 100)).toBe(0);
    });

    it('should handle large changes', () => {
      const change = calculateYoYChange(200, 100);
      expect(change).toBeCloseTo(1.0, 5); // 100% increase
    });
  });

  describe('calculateCAGR', () => {
    it('should calculate CAGR for growth', () => {
      // $100 growing to $121 over 2 years = 10% CAGR
      const cagr = calculateCAGR(100, 121, 2);
      expect(cagr).toBeCloseTo(0.1, 2);
    });

    it('should calculate CAGR for decline', () => {
      // $100 declining to $81 over 2 years = -10% CAGR
      const cagr = calculateCAGR(100, 81, 2);
      expect(cagr).toBeCloseTo(-0.1, 2);
    });

    it('should return 0 for 0 start value', () => {
      expect(calculateCAGR(0, 100, 2)).toBe(0);
    });

    it('should return 0 for 0 years', () => {
      expect(calculateCAGR(100, 200, 0)).toBe(0);
    });

    it('should handle 1 year', () => {
      const cagr = calculateCAGR(100, 110, 1);
      expect(cagr).toBeCloseTo(0.1, 5); // 10% in 1 year
    });

    it('should handle 5 years', () => {
      // $100 to $161.05 over 5 years = 10% CAGR
      const cagr = calculateCAGR(100, 161.051, 5);
      expect(cagr).toBeCloseTo(0.1, 2);
    });
  });

  describe('projectWithGrowth', () => {
    it('should project value with positive growth', () => {
      const projected = projectWithGrowth(100, 0.1, 2);
      expect(projected).toBeCloseTo(121, 0); // 100 * 1.1^2
    });

    it('should project value with negative growth', () => {
      const projected = projectWithGrowth(100, -0.1, 2);
      expect(projected).toBeCloseTo(81, 0); // 100 * 0.9^2
    });

    it('should handle 0 growth', () => {
      const projected = projectWithGrowth(100, 0, 5);
      expect(projected).toBe(100);
    });

    it('should handle 0 years', () => {
      const projected = projectWithGrowth(100, 0.1, 0);
      expect(projected).toBe(100); // 1.1^0 = 1
    });
  });

  describe('calculateSkilledMix', () => {
    it('should calculate skilled days correctly', () => {
      const census: CensusByPayer = {
        medicarePartADays: 100,
        medicareAdvantageDays: 50,
        managedCareDays: 30,
        medicaidDays: 500,
        managedMedicaidDays: 100,
        privateDays: 80,
        vaContractDays: 20,
        hospiceDays: 10,
        otherDays: 10,
      };

      const result = calculateSkilledMix(census);
      expect(result.skilledDays).toBe(180); // 100 + 50 + 30
    });

    it('should calculate non-skilled days correctly', () => {
      const census: CensusByPayer = {
        medicarePartADays: 100,
        medicareAdvantageDays: 50,
        managedCareDays: 30,
        medicaidDays: 500,
        managedMedicaidDays: 100,
        privateDays: 80,
        vaContractDays: 20,
        hospiceDays: 10,
        otherDays: 10,
      };

      const result = calculateSkilledMix(census);
      expect(result.nonSkilledDays).toBe(720); // 500 + 100 + 80 + 20 + 10 + 10
    });

    it('should calculate skilled percentage correctly', () => {
      const census: CensusByPayer = {
        medicarePartADays: 100,
        medicareAdvantageDays: 50,
        managedCareDays: 30,
        medicaidDays: 500,
        managedMedicaidDays: 100,
        privateDays: 80,
        vaContractDays: 20,
        hospiceDays: 10,
        otherDays: 10,
      };

      const result = calculateSkilledMix(census);
      expect(result.skilledPercent).toBeCloseTo(0.2, 2); // 180 / 900 = 20%
    });

    it('should return 0 skilled percent for 0 total days', () => {
      const zeroCensus: CensusByPayer = {
        medicarePartADays: 0,
        medicareAdvantageDays: 0,
        managedCareDays: 0,
        medicaidDays: 0,
        managedMedicaidDays: 0,
        privateDays: 0,
        vaContractDays: 0,
        hospiceDays: 0,
        otherDays: 0,
      };

      const result = calculateSkilledMix(zeroCensus);
      expect(result.skilledPercent).toBe(0);
    });

    it('should handle 100% skilled mix', () => {
      const skilledOnly: CensusByPayer = {
        medicarePartADays: 300,
        medicareAdvantageDays: 0,
        managedCareDays: 0,
        medicaidDays: 0,
        managedMedicaidDays: 0,
        privateDays: 0,
        vaContractDays: 0,
        hospiceDays: 0,
        otherDays: 0,
      };

      const result = calculateSkilledMix(skilledOnly);
      expect(result.skilledPercent).toBe(1);
      expect(result.nonSkilledDays).toBe(0);
    });
  });

  describe('calculatePortfolioMetrics', () => {
    const mockFacility1: FacilityFinancials = {
      facilityId: '1',
      facilityName: 'Facility A',
      beds: 100,
      totalDays: 30000,
      occupancy: 0.82,
      totalRevenue: 6000000,
      totalExpenses: 5000000,
      ebitdar: 1200000,
      ebitda: 1000000,
      blendedPPD: 200,
      censusByPayer: {
        medicarePartADays: 3000,
        medicareAdvantageDays: 1500,
        managedCareDays: 1000,
        medicaidDays: 18000,
        managedMedicaidDays: 3000,
        privateDays: 2500,
        vaContractDays: 500,
        hospiceDays: 300,
        otherDays: 200,
      },
      revenueByPayer: {
        medicarePartA: 1875000,
        medicareAdvantage: 720000,
        managedCare: 420000,
        medicaid: 3330000,
        managedMedicaid: 585000,
        private: 712500,
        vaContract: 155000,
        hospice: 52500,
        other: 40000,
        ancillary: 600000,
        therapy: 150000,
        total: 8640000,
      },
    };

    const mockFacility2: FacilityFinancials = {
      facilityId: '2',
      facilityName: 'Facility B',
      beds: 80,
      totalDays: 25000,
      occupancy: 0.85,
      totalRevenue: 5000000,
      totalExpenses: 4200000,
      ebitdar: 1000000,
      ebitda: 800000,
      blendedPPD: 200,
      censusByPayer: {
        medicarePartADays: 2500,
        medicareAdvantageDays: 1000,
        managedCareDays: 800,
        medicaidDays: 15000,
        managedMedicaidDays: 2500,
        privateDays: 2000,
        vaContractDays: 700,
        hospiceDays: 300,
        otherDays: 200,
      },
      revenueByPayer: {
        medicarePartA: 1562500,
        medicareAdvantage: 480000,
        managedCare: 336000,
        medicaid: 2775000,
        managedMedicaid: 487500,
        private: 570000,
        vaContract: 217000,
        hospice: 52500,
        other: 40000,
        ancillary: 500000,
        therapy: 125000,
        total: 7145500,
      },
    };

    it('should calculate total facilities', () => {
      const metrics = calculatePortfolioMetrics([mockFacility1, mockFacility2]);
      expect(metrics.totalFacilities).toBe(2);
    });

    it('should calculate total beds', () => {
      const metrics = calculatePortfolioMetrics([mockFacility1, mockFacility2]);
      expect(metrics.totalBeds).toBe(180); // 100 + 80
    });

    it('should calculate total days', () => {
      const metrics = calculatePortfolioMetrics([mockFacility1, mockFacility2]);
      expect(metrics.totalDays).toBe(55000); // 30000 + 25000
    });

    it('should calculate total revenue', () => {
      const metrics = calculatePortfolioMetrics([mockFacility1, mockFacility2]);
      expect(metrics.totalRevenue).toBe(11000000); // 6M + 5M
    });

    it('should calculate total EBITDA', () => {
      const metrics = calculatePortfolioMetrics([mockFacility1, mockFacility2]);
      expect(metrics.totalEbitda).toBe(1800000); // 1M + 800K
    });

    it('should calculate weighted occupancy by beds', () => {
      const metrics = calculatePortfolioMetrics([mockFacility1, mockFacility2]);
      // (100 * 0.82 + 80 * 0.85) / 180 = (82 + 68) / 180 = 0.833
      expect(metrics.weightedOccupancy).toBeCloseTo(0.833, 2);
    });

    it('should calculate weighted PPD by days', () => {
      const metrics = calculatePortfolioMetrics([mockFacility1, mockFacility2]);
      // Both have same blended PPD of 200
      expect(metrics.weightedPPD).toBe(200);
    });

    it('should rank facilities by EBITDA margin', () => {
      const metrics = calculatePortfolioMetrics([mockFacility1, mockFacility2]);
      // Facility A margin: 1M / 6M = 16.67%
      // Facility B margin: 800K / 5M = 16%
      // Facility A should be first
      expect(metrics.facilitiesRanked[0].facilityId).toBe('1');
    });

    it('should handle empty facilities array', () => {
      const metrics = calculatePortfolioMetrics([]);
      expect(metrics.totalFacilities).toBe(0);
      expect(metrics.totalBeds).toBe(0);
      expect(metrics.totalRevenue).toBe(0);
      expect(metrics.weightedOccupancy).toBe(0);
    });

    it('should calculate combined payer mix', () => {
      const metrics = calculatePortfolioMetrics([mockFacility1, mockFacility2]);
      expect(metrics.combinedPayerMix.length).toBeGreaterThan(0);

      // Find Medicare Part A in the mix
      const medicarePartA = metrics.combinedPayerMix.find(
        (p) => p.payerType === 'Medicare Part A'
      );
      expect(medicarePartA).toBeDefined();
      expect(medicarePartA!.totalDays).toBe(5500); // 3000 + 2500
    });
  });
});
