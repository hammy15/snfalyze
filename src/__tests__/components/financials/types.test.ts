import { describe, it, expect } from 'vitest';
import {
  getTotalDays,
  formatCurrency,
  formatPercent,
  formatNumber,
  formatPPD,
  DEFAULT_PPD_RATES,
  PAYER_LABELS,
  SKILLED_PAYERS,
  NON_SKILLED_PAYERS,
  type CensusByPayer,
  type PayerType,
} from '@/components/financials/types';

describe('Financial Utility Functions', () => {
  describe('getTotalDays', () => {
    it('should calculate total days from census data', () => {
      const census: CensusByPayer = {
        medicarePartADays: 100,
        medicareAdvantageDays: 50,
        managedCareDays: 75,
        medicaidDays: 200,
        managedMedicaidDays: 30,
        privateDays: 45,
        vaContractDays: 20,
        hospiceDays: 10,
        otherDays: 5,
      };

      expect(getTotalDays(census)).toBe(535);
    });

    it('should return 0 for empty census', () => {
      const census: CensusByPayer = {
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

      expect(getTotalDays(census)).toBe(0);
    });

    it('should handle single payer type', () => {
      const census: CensusByPayer = {
        medicarePartADays: 365,
        medicareAdvantageDays: 0,
        managedCareDays: 0,
        medicaidDays: 0,
        managedMedicaidDays: 0,
        privateDays: 0,
        vaContractDays: 0,
        hospiceDays: 0,
        otherDays: 0,
      };

      expect(getTotalDays(census)).toBe(365);
    });

    it('should handle large numbers correctly', () => {
      const census: CensusByPayer = {
        medicarePartADays: 10000,
        medicareAdvantageDays: 10000,
        managedCareDays: 10000,
        medicaidDays: 10000,
        managedMedicaidDays: 10000,
        privateDays: 10000,
        vaContractDays: 10000,
        hospiceDays: 10000,
        otherDays: 10000,
      };

      expect(getTotalDays(census)).toBe(90000);
    });
  });

  describe('formatCurrency', () => {
    it('should format positive numbers as USD', () => {
      expect(formatCurrency(1000)).toBe('$1,000');
      expect(formatCurrency(1500000)).toBe('$1,500,000');
    });

    it('should format zero', () => {
      expect(formatCurrency(0)).toBe('$0');
    });

    it('should format negative numbers', () => {
      expect(formatCurrency(-500)).toBe('-$500');
    });

    it('should round decimal values', () => {
      expect(formatCurrency(1234.56)).toBe('$1,235');
      expect(formatCurrency(1234.49)).toBe('$1,234');
    });

    it('should handle large numbers', () => {
      expect(formatCurrency(1000000000)).toBe('$1,000,000,000');
    });
  });

  describe('formatPercent', () => {
    it('should format decimal as percentage', () => {
      expect(formatPercent(0.85)).toBe('85.0%');
      expect(formatPercent(0.123)).toBe('12.3%');
    });

    it('should format zero', () => {
      expect(formatPercent(0)).toBe('0.0%');
    });

    it('should format 100%', () => {
      expect(formatPercent(1)).toBe('100.0%');
    });

    it('should handle values over 100%', () => {
      expect(formatPercent(1.5)).toBe('150.0%');
    });

    it('should handle negative percentages', () => {
      expect(formatPercent(-0.25)).toBe('-25.0%');
    });

    it('should round to one decimal place', () => {
      expect(formatPercent(0.8567)).toBe('85.7%');
      expect(formatPercent(0.8561)).toBe('85.6%');
    });
  });

  describe('formatNumber', () => {
    it('should format numbers with thousand separators', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
    });

    it('should format zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should round decimal values', () => {
      expect(formatNumber(1234.56)).toBe('1,235');
      expect(formatNumber(1234.49)).toBe('1,234');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-5000)).toBe('-5,000');
    });
  });

  describe('formatPPD', () => {
    it('should format PPD with two decimal places', () => {
      expect(formatPPD(625)).toBe('$625.00');
      expect(formatPPD(185.5)).toBe('$185.50');
    });

    it('should format zero', () => {
      expect(formatPPD(0)).toBe('$0.00');
    });

    it('should round to two decimal places', () => {
      expect(formatPPD(185.567)).toBe('$185.57');
      expect(formatPPD(185.561)).toBe('$185.56');
    });

    it('should handle large PPD values', () => {
      expect(formatPPD(1000.00)).toBe('$1,000.00');
    });
  });
});

describe('Financial Constants', () => {
  describe('DEFAULT_PPD_RATES', () => {
    it('should have all payer types defined', () => {
      const expectedPayerTypes: PayerType[] = [
        'medicare_part_a',
        'medicare_advantage',
        'managed_care',
        'medicaid',
        'managed_medicaid',
        'private',
        'va_contract',
        'hospice',
        'other',
      ];

      expectedPayerTypes.forEach((payerType) => {
        expect(DEFAULT_PPD_RATES[payerType]).toBeDefined();
        expect(typeof DEFAULT_PPD_RATES[payerType]).toBe('number');
      });
    });

    it('should have correct benchmark rates', () => {
      expect(DEFAULT_PPD_RATES.medicare_part_a).toBe(625);
      expect(DEFAULT_PPD_RATES.medicare_advantage).toBe(480);
      expect(DEFAULT_PPD_RATES.managed_care).toBe(420);
      expect(DEFAULT_PPD_RATES.medicaid).toBe(185);
      expect(DEFAULT_PPD_RATES.managed_medicaid).toBe(195);
      expect(DEFAULT_PPD_RATES.private).toBe(285);
      expect(DEFAULT_PPD_RATES.va_contract).toBe(310);
      expect(DEFAULT_PPD_RATES.hospice).toBe(175);
      expect(DEFAULT_PPD_RATES.other).toBe(200);
    });

    it('should have skilled payers with higher rates than non-skilled', () => {
      const skilledMinRate = Math.min(
        DEFAULT_PPD_RATES.medicare_part_a,
        DEFAULT_PPD_RATES.medicare_advantage,
        DEFAULT_PPD_RATES.managed_care
      );
      const nonSkilledMaxRate = Math.max(
        DEFAULT_PPD_RATES.medicaid,
        DEFAULT_PPD_RATES.managed_medicaid,
        DEFAULT_PPD_RATES.private,
        DEFAULT_PPD_RATES.hospice
      );

      expect(skilledMinRate).toBeGreaterThan(nonSkilledMaxRate);
    });
  });

  describe('PAYER_LABELS', () => {
    it('should have labels for all payer types', () => {
      const expectedPayerTypes: PayerType[] = [
        'medicare_part_a',
        'medicare_advantage',
        'managed_care',
        'medicaid',
        'managed_medicaid',
        'private',
        'va_contract',
        'hospice',
        'other',
      ];

      expectedPayerTypes.forEach((payerType) => {
        expect(PAYER_LABELS[payerType]).toBeDefined();
        expect(typeof PAYER_LABELS[payerType]).toBe('string');
        expect(PAYER_LABELS[payerType].length).toBeGreaterThan(0);
      });
    });

    it('should have human-readable labels', () => {
      expect(PAYER_LABELS.medicare_part_a).toBe('Medicare Part A');
      expect(PAYER_LABELS.medicare_advantage).toBe('Medicare Advantage');
      expect(PAYER_LABELS.managed_care).toBe('Managed Care');
      expect(PAYER_LABELS.medicaid).toBe('Medicaid');
      expect(PAYER_LABELS.private).toBe('Private Pay');
    });
  });

  describe('Payer Categorization', () => {
    it('should have correct skilled payers', () => {
      expect(SKILLED_PAYERS).toContain('medicare_part_a');
      expect(SKILLED_PAYERS).toContain('medicare_advantage');
      expect(SKILLED_PAYERS).toContain('managed_care');
      expect(SKILLED_PAYERS).toHaveLength(3);
    });

    it('should have correct non-skilled payers', () => {
      expect(NON_SKILLED_PAYERS).toContain('medicaid');
      expect(NON_SKILLED_PAYERS).toContain('managed_medicaid');
      expect(NON_SKILLED_PAYERS).toContain('private');
      expect(NON_SKILLED_PAYERS).toContain('va_contract');
      expect(NON_SKILLED_PAYERS).toContain('hospice');
      expect(NON_SKILLED_PAYERS).toContain('other');
      expect(NON_SKILLED_PAYERS).toHaveLength(6);
    });

    it('should not have overlapping payers', () => {
      const overlap = SKILLED_PAYERS.filter((payer) =>
        NON_SKILLED_PAYERS.includes(payer)
      );
      expect(overlap).toHaveLength(0);
    });

    it('should cover all payer types', () => {
      const allPayers = [...SKILLED_PAYERS, ...NON_SKILLED_PAYERS];
      expect(allPayers).toHaveLength(9);
    });
  });
});
