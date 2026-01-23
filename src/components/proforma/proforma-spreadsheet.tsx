'use client';

import { useRef, useEffect, useState, useCallback, ElementRef } from 'react';
import { HotTable } from '@handsontable/react-wrapper';
import { registerAllModules } from 'handsontable/registry';
import Handsontable from 'handsontable';
import { HyperFormula } from 'hyperformula';
import 'handsontable/dist/handsontable.full.min.css';
import { FacilityType, ProformaAssumptions, defaultAssumptions } from '@/lib/proforma/types';
import { SNF_CHART_OF_ACCOUNTS, getIndentLevel } from '@/lib/coa/snf-coa';
import { COAAccount } from '@/lib/coa/types';

// Register all Handsontable modules
registerAllModules();

export type ScenarioType = 'prior_actuals' | 'budget' | 'forecast' | 'acquisition';

interface ProformaSpreadsheetProps {
  facilityType: FacilityType;
  facilityName: string;
  initialAssumptions?: ProformaAssumptions;
  scenario: ScenarioType;
  startDate: Date;
  onDataChange?: (data: any[][]) => void;
  coaMappedData?: Record<string, Record<string, number>>; // COA code -> month -> value
}

// Extended row configuration with COA integration
interface RowConfig {
  coaCode: string;
  label: string;
  type: 'header' | 'subheader' | 'input' | 'formula' | 'spacer' | 'kpi';
  key?: string;
  formula?: string;
  format?: 'currency' | 'percent' | 'number' | 'days';
  indent?: number;
  bold?: boolean;
  bg?: string;
  ppdDenominator?: 'total_days' | 'skilled_days' | 'non_skilled_days' | 'vent_days';
  ppdEligible?: boolean;
}

// Build row configuration from COA
function buildRowConfigFromCOA(): RowConfig[] {
  const rows: RowConfig[] = [];

  // Filter out certain codes we'll handle specially or skip
  const skipCodes = new Set<string>();

  SNF_CHART_OF_ACCOUNTS.forEach(account => {
    const indent = getIndentLevel(account.code);

    let type: RowConfig['type'] = 'input';
    let bg: string | undefined;

    if (account.isHeader) {
      type = 'header';
      bg = getCategoryColor(account.category);
    } else if (account.isTotal) {
      type = 'formula';
      bg = account.code === '4999' || account.code === '6600' || account.code === '7100' || account.code === '9000'
        ? '#d1fae5' // Green for key totals
        : undefined;
    }

    // Add spacer before major sections
    if (['4000', '5100', '5200', '5300', '5400', '5500', '5600', '5700', '5800', '5900', '6000', '6100', '6200', '6300', '6500', '7000', '8000', '9100', '9200'].includes(account.code)) {
      rows.push({
        coaCode: '',
        label: '',
        type: 'spacer',
        format: 'currency',
      });
    }

    rows.push({
      coaCode: account.code,
      label: account.name,
      type,
      key: account.code,
      format: account.formatType,
      indent,
      bold: account.isTotal || account.isHeader,
      bg,
      ppdDenominator: account.ppdDenominator,
      ppdEligible: account.ppdEligible,
    });

    // Add margins after key metrics
    if (account.code === '4999') {
      // Revenue % of total (placeholder for reference)
    }
    if (account.code === '6600') {
      rows.push({
        coaCode: '6600.M',
        label: 'EBITDAR Margin %',
        type: 'formula',
        format: 'percent',
        bold: true,
        ppdEligible: false,
      });
    }
    if (account.code === '7100') {
      rows.push({
        coaCode: '7100.M',
        label: 'EBITDA Margin %',
        type: 'formula',
        format: 'percent',
        bold: true,
        ppdEligible: false,
      });
    }
    if (account.code === '9000') {
      rows.push({
        coaCode: '9000.M',
        label: 'Net Income Margin %',
        type: 'formula',
        format: 'percent',
        bold: true,
        ppdEligible: false,
      });
    }
  });

  return rows;
}

// Get background color for category headers
function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    revenue: '#dbeafe', // Blue
    ancillary_expense: '#fef3c7', // Amber
    nursing_expense: '#fef3c7',
    vent_expense: '#fef3c7',
    plant_expense: '#fef3c7',
    housekeeping_expense: '#fef3c7',
    laundry_expense: '#fef3c7',
    dietary_expense: '#fef3c7',
    social_services_expense: '#fef3c7',
    activities_expense: '#fef3c7',
    medical_records_expense: '#fef3c7',
    administration_expense: '#fef3c7',
    bad_debt: '#fef3c7',
    bed_tax: '#fef3c7',
    management_fee: '#fef3c7',
    property_expense: '#fce7f3', // Pink
    other_expense: '#e5e7eb', // Gray
    patient_days: '#e0f2fe', // Light blue
    census: '#f3e8ff', // Purple
  };
  return colors[category] || '#f3f4f6';
}

// Get scenario display name
function getScenarioName(scenario: ScenarioType): string {
  const names: Record<ScenarioType, string> = {
    prior_actuals: 'Prior Owner Actuals',
    budget: 'Budget',
    forecast: 'Forecast',
    acquisition: 'Acquisition Pro Forma',
  };
  return names[scenario];
}

// Get days in month
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

// Generate T12 months from start date
function getT12Months(startDate: Date): { month: Date; label: string; days: number }[] {
  const months: { month: Date; label: string; days: number }[] = [];
  for (let i = 0; i < 12; i++) {
    const date = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
    months.push({
      month: date,
      label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      days: getDaysInMonth(date.getFullYear(), date.getMonth()),
    });
  }
  return months;
}

// Build the comprehensive row config
const rowConfig = buildRowConfigFromCOA();

// Create a map of COA code to row index for formula references
function buildRowIndexMap(config: RowConfig[]): Map<string, number> {
  const map = new Map<string, number>();
  config.forEach((row, index) => {
    if (row.coaCode) {
      map.set(row.coaCode, index + 3); // +3 for header rows offset
    }
  });
  return map;
}

const rowIndexMap = buildRowIndexMap(rowConfig);

export function ProformaSpreadsheet({
  facilityType,
  facilityName,
  initialAssumptions,
  scenario,
  startDate,
  onDataChange,
  coaMappedData,
}: ProformaSpreadsheetProps) {
  const hotRef = useRef<ElementRef<typeof HotTable>>(null);
  const [isReady, setIsReady] = useState(false);

  // Get T12 months
  const t12Months = getT12Months(startDate);
  const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 11, 1);
  const dateRangeLabel = `${startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

  // Get default values based on facility type
  const assumptions = initialAssumptions || defaultAssumptions[facilityType];

  // Generate sample/default values for a COA code
  const getDefaultValue = useCallback((coaCode: string, format: string | undefined, monthIndex: number): number => {
    // Check if we have mapped data from document extraction
    if (coaMappedData && coaMappedData[coaCode]) {
      const monthKey = t12Months[monthIndex].label;
      if (coaMappedData[coaCode][monthKey] !== undefined) {
        return coaMappedData[coaCode][monthKey];
      }
    }

    const beds = assumptions.licensedBeds;
    const occupancy = assumptions.targetOccupancy;
    const patientDays = Math.round(beds * occupancy * t12Months[monthIndex].days);
    const skilledDays = Math.round(patientDays * 0.35);
    const nonSkilledDays = Math.round(patientDays * 0.55);
    const ventDays = Math.round(patientDays * 0.10);

    // Revenue values
    const revenueMap: Record<string, number> = {
      '4110': Math.round(nonSkilledDays * 0.55 * assumptions.medicaidPPD),
      '4120': Math.round(nonSkilledDays * 0.15 * assumptions.managedMedicaidPPD),
      '4130': Math.round(nonSkilledDays * 0.15 * assumptions.privatePPD),
      '4140': Math.round(nonSkilledDays * 0.05 * assumptions.veteransPPD),
      '4150': Math.round(nonSkilledDays * 0.10 * assumptions.hospicePPD),
      '4210': Math.round(skilledDays * 0.40 * assumptions.medicarePPD),
      '4215': Math.round(skilledDays * 0.15 * 480),
      '4220': Math.round(skilledDays * 0.15 * assumptions.managedMedicaidPPD * 1.3),
      '4230': Math.round(skilledDays * 0.10 * 320),
      '4235': Math.round(skilledDays * 0.05 * 380),
      '4240': Math.round(skilledDays * 0.05 * assumptions.veteransPPD * 1.2),
      '4250': Math.round(skilledDays * 0.07 * assumptions.hmoPPD),
      '4260': Math.round(skilledDays * 0.03 * assumptions.isnpPPD),
      '4310': Math.round(ventDays * 0.40 * 650),
      '4320': Math.round(ventDays * 0.20 * 600),
      '4330': Math.round(ventDays * 0.15 * 800),
      '4340': Math.round(ventDays * 0.10 * 580),
      '4350': Math.round(ventDays * 0.05 * 420),
      '4360': Math.round(ventDays * 0.08 * 720),
      '4370': Math.round(ventDays * 0.02 * 550),
      '4410': Math.round(patientDays * 8),
      '4415': Math.round(patientDays * 2),
      '4420': 8000,
      '4430': 15000,
      '4440': 0,
      '4450': 0,
      '4460': 500,
      '4470': 3000,
      '4480': 1500,
    };

    // Expense values (PPD based)
    const expenseMap: Record<string, number> = {
      // Therapy
      '5111': Math.round(skilledDays * 12),
      '5112': Math.round(skilledDays * 10),
      '5113': Math.round(skilledDays * 6),
      '5114': Math.round(skilledDays * 8),
      '5115': Math.round(skilledDays * 7),
      '5116': Math.round(skilledDays * 5),
      '5117': Math.round(skilledDays * 2),
      '5118': Math.round(skilledDays * 1),
      // Non-therapy ancillary
      '5151': Math.round(patientDays * 12),
      '5152': Math.round(patientDays * 2),
      '5153': Math.round(patientDays * 1.5),
      '5154': Math.round(patientDays * 3),
      '5155': Math.round(beds * 150),
      '5156': Math.round(patientDays * 2),
      '5157': Math.round(patientDays * 1),
      '5158': Math.round(patientDays * 0.5),
      // Nursing
      '5210': Math.round(patientDays * 28),
      '5211': Math.round(patientDays * 22),
      '5212': Math.round(patientDays * 35),
      '5213': Math.round(beds * 200),
      '5214': Math.round(beds * 50),
      '5220': Math.round(patientDays * 18),
      '5221': Math.round(patientDays * 8),
      '5230': Math.round(patientDays * 8),
      '5231': Math.round(patientDays * 5),
      '5232': Math.round(patientDays * 6),
      '5240': Math.round(beds * 30),
      '5250': Math.round(patientDays * 4),
      '5251': Math.round(patientDays * 3),
      '5252': Math.round(patientDays * 2),
      '5253': Math.round(patientDays * 2),
      '5260': Math.round(beds * 25),
      '5270': Math.round(beds * 15),
      '5280': Math.round(beds * 10),
      // Vent
      '5310': Math.round(ventDays * 45),
      '5311': Math.round(ventDays * 35),
      '5312': Math.round(ventDays * 15),
      '5320': Math.round(ventDays * 20),
      '5330': Math.round(ventDays * 10),
      '5340': Math.round(ventDays * 25),
      '5350': Math.round(ventDays * 15),
      '5360': Math.round(ventDays * 5),
      // Plant
      '5410': Math.round(beds * 200),
      '5420': Math.round(beds * 44),
      '5430': Math.round(beds * 80),
      '5431': Math.round(beds * 40),
      '5432': Math.round(beds * 25),
      '5433': Math.round(beds * 10),
      '5440': Math.round(beds * 15),
      '5441': Math.round(beds * 30),
      '5442': Math.round(beds * 20),
      '5443': Math.round(beds * 10),
      '5450': Math.round(beds * 25),
      '5460': Math.round(beds * 10),
      '5470': Math.round(beds * 5),
      // Housekeeping
      '5510': Math.round(beds * 180),
      '5520': Math.round(beds * 40),
      '5530': Math.round(beds * 25),
      '5540': Math.round(beds * 15),
      '5550': Math.round(beds * 5),
      // Laundry
      '5610': Math.round(beds * 100),
      '5620': Math.round(beds * 22),
      '5630': Math.round(beds * 15),
      '5640': Math.round(beds * 30),
      '5650': Math.round(beds * 5),
      // Dietary
      '5710': Math.round(beds * 350),
      '5720': Math.round(beds * 77),
      '5730': Math.round(beds * 20),
      '5740': Math.round(patientDays * 12),
      '5741': Math.round(patientDays * 3),
      '5750': Math.round(beds * 15),
      '5760': Math.round(beds * 10),
      '5770': Math.round(beds * 5),
      // Social Services
      '5810': Math.round(beds * 80),
      '5820': Math.round(beds * 18),
      '5830': Math.round(beds * 5),
      // Activities
      '5910': Math.round(beds * 100),
      '5920': Math.round(beds * 22),
      '5930': Math.round(beds * 15),
      '5940': Math.round(beds * 5),
      // Medical Records
      '6010': Math.round(beds * 70),
      '6020': Math.round(beds * 15),
      '6030': Math.round(beds * 5),
      '6040': Math.round(beds * 3),
      // Administration
      '6110': Math.round(beds * 150),
      '6111': Math.round(beds * 120),
      '6112': Math.round(beds * 60),
      '6113': Math.round(beds * 50),
      '6114': Math.round(beds * 80),
      '6120': Math.round(beds * 100),
      '6130': Math.round(beds * 40),
      '6140': Math.round(beds * 50),
      '6141': Math.round(beds * 35),
      '6150': Math.round(beds * 60),
      '6151': Math.round(beds * 80),
      '6152': Math.round(beds * 120),
      '6153': Math.round(beds * 40),
      '6154': Math.round(beds * 20),
      '6160': Math.round(beds * 25),
      '6170': Math.round(beds * 30),
      '6171': Math.round(beds * 20),
      '6180': Math.round(beds * 35),
      '6181': Math.round(beds * 25),
      '6182': Math.round(beds * 15),
      '6183': Math.round(beds * 10),
      '6184': Math.round(beds * 8),
      '6185': Math.round(beds * 10),
      '6186': Math.round(beds * 15),
      '6187': Math.round(beds * 12),
      '6188': Math.round(beds * 20),
      '6190': Math.round(beds * 10),
      // Bad Debt & Bed Tax
      '6200': Math.round(patientDays * assumptions.medicaidPPD * 0.35 * 0.015),
      '6300': Math.round(patientDays * 15),
      // Management Fee
      '6500': Math.round(patientDays * assumptions.medicaidPPD * 0.35 * 0.05),
      // Property
      '7010': Math.round(beds * assumptions.rentRate),
      '7020': Math.round(assumptions.propertyTaxes / 12),
      '7030': Math.round(beds * 25),
      // Other
      '8010': Math.round(beds * 120),
      '8020': Math.round(beds * 30),
      '8030': Math.round(beds * 80),
      '8040': 0,
      '8050': Math.round(beds * 10),
    };

    // Patient Days
    const daysMap: Record<string, number> = {
      '9111': Math.round(nonSkilledDays * 0.55),
      '9112': Math.round(nonSkilledDays * 0.15),
      '9113': Math.round(nonSkilledDays * 0.15),
      '9114': Math.round(nonSkilledDays * 0.05),
      '9115': Math.round(nonSkilledDays * 0.10),
      '9121': Math.round(skilledDays * 0.40),
      '9122': Math.round(skilledDays * 0.15),
      '9123': Math.round(skilledDays * 0.15),
      '9124': Math.round(skilledDays * 0.10),
      '9125': Math.round(skilledDays * 0.05),
      '9126': Math.round(skilledDays * 0.05),
      '9127': Math.round(skilledDays * 0.07),
      '9128': Math.round(skilledDays * 0.03),
      '9131': ventDays,
      '9210': beds,
      '9211': Math.round(beds * 0.95),
    };

    return revenueMap[coaCode] ?? expenseMap[coaCode] ?? daysMap[coaCode] ?? 0;
  }, [assumptions, t12Months, coaMappedData]);

  // Generate formula for total rows
  const generateTotalFormula = useCallback((coaCode: string, colLetter: string): string => {
    // Find all child accounts to sum
    const account = SNF_CHART_OF_ACCOUNTS.find(a => a.code === coaCode);
    if (!account) return '0';

    // Define sum ranges for each total code
    const sumRanges: Record<string, string[]> = {
      // Revenue totals
      '4199': ['4110', '4120', '4130', '4140', '4150'],
      '4299': ['4210', '4215', '4220', '4230', '4235', '4240', '4250', '4260'],
      '4399': ['4310', '4320', '4330', '4340', '4350', '4360', '4370'],
      '4499': ['4410', '4415', '4420', '4430', '4440', '4450', '4460', '4470', '4480'],
      '4999': ['4199', '4299', '4399', '4499'],
      // Expense totals
      '5119': ['5111', '5112', '5113', '5114', '5115', '5116', '5117', '5118'],
      '5159': ['5151', '5152', '5153', '5154', '5155', '5156', '5157', '5158'],
      '5199': ['5119', '5159'],
      '5299': ['5210', '5211', '5212', '5213', '5214', '5220', '5221', '5230', '5231', '5232', '5240', '5250', '5251', '5252', '5253', '5260', '5270', '5280'],
      '5399': ['5310', '5311', '5312', '5320', '5330', '5340', '5350', '5360'],
      '5499': ['5410', '5420', '5430', '5431', '5432', '5433', '5440', '5441', '5442', '5443', '5450', '5460', '5470'],
      '5599': ['5510', '5520', '5530', '5540', '5550'],
      '5699': ['5610', '5620', '5630', '5640', '5650'],
      '5799': ['5710', '5720', '5730', '5740', '5741', '5750', '5760', '5770'],
      '5899': ['5810', '5820', '5830'],
      '5999': ['5910', '5920', '5930', '5940'],
      '6099': ['6010', '6020', '6030', '6040'],
      '6199': ['6110', '6111', '6112', '6113', '6114', '6120', '6130', '6140', '6141', '6150', '6151', '6152', '6153', '6154', '6160', '6170', '6171', '6180', '6181', '6182', '6183', '6184', '6185', '6186', '6187', '6188', '6190'],
      '6499': ['5199', '5299', '5399', '5499', '5599', '5699', '5799', '5899', '5999', '6099', '6199', '6200', '6300'],
      '7099': ['7010', '7020', '7030'],
      '8099': ['8010', '8020', '8030', '8040', '8050'],
      // Calculated metrics
      '6600': [], // EBITDAR = Revenue - OpEx - MgmtFee (special formula)
      '7100': [], // EBITDA = EBITDAR - Property (special formula)
      '9000': [], // Net Income = EBITDA - Other (special formula)
      // Patient day totals
      '9119': ['9111', '9112', '9113', '9114', '9115'],
      '9129': ['9121', '9122', '9123', '9124', '9125', '9126', '9127', '9128'],
      '9139': ['9131'],
      '9199': ['9119', '9129', '9139'],
    };

    // Special formulas for key metrics
    if (coaCode === '6600') {
      const revRow = rowIndexMap.get('4999');
      const opExRow = rowIndexMap.get('6499');
      const mgmtRow = rowIndexMap.get('6500');
      return `${colLetter}${revRow}-${colLetter}${opExRow}-${colLetter}${mgmtRow}`;
    }
    if (coaCode === '7100') {
      const ebitdarRow = rowIndexMap.get('6600');
      const propRow = rowIndexMap.get('7099');
      return `${colLetter}${ebitdarRow}-${colLetter}${propRow}`;
    }
    if (coaCode === '9000') {
      const ebitdaRow = rowIndexMap.get('7100');
      const otherRow = rowIndexMap.get('8099');
      return `${colLetter}${ebitdaRow}-${colLetter}${otherRow}`;
    }
    // Margin formulas
    if (coaCode === '6600.M') {
      const ebitdarRow = rowIndexMap.get('6600');
      const revRow = rowIndexMap.get('4999');
      return `${colLetter}${ebitdarRow}/${colLetter}${revRow}`;
    }
    if (coaCode === '7100.M') {
      const ebitdaRow = rowIndexMap.get('7100');
      const revRow = rowIndexMap.get('4999');
      return `${colLetter}${ebitdaRow}/${colLetter}${revRow}`;
    }
    if (coaCode === '9000.M') {
      const niRow = rowIndexMap.get('9000');
      const revRow = rowIndexMap.get('4999');
      return `${colLetter}${niRow}/${colLetter}${revRow}`;
    }
    // Census calculations
    if (coaCode === '9220') {
      const totalDaysRow = rowIndexMap.get('9199');
      return `${colLetter}${totalDaysRow}/30`;
    }
    if (coaCode === '9230') {
      const totalDaysRow = rowIndexMap.get('9199');
      const bedsRow = rowIndexMap.get('9210');
      return `${colLetter}${totalDaysRow}/(${colLetter}${bedsRow}*30)`;
    }
    if (coaCode === '9231') {
      const totalDaysRow = rowIndexMap.get('9199');
      const opBedsRow = rowIndexMap.get('9211');
      return `${colLetter}${totalDaysRow}/(${colLetter}${opBedsRow}*30)`;
    }
    if (coaCode === '9240') {
      const skilledRow = rowIndexMap.get('9129');
      const totalDaysRow = rowIndexMap.get('9199');
      return `${colLetter}${skilledRow}/${colLetter}${totalDaysRow}`;
    }
    if (coaCode === '9241') {
      const mcrRow = rowIndexMap.get('9121');
      const maRow = rowIndexMap.get('9122');
      const totalDaysRow = rowIndexMap.get('9199');
      return `(${colLetter}${mcrRow}+${colLetter}${maRow})/${colLetter}${totalDaysRow}`;
    }

    const childCodes = sumRanges[coaCode];
    if (!childCodes || childCodes.length === 0) return '0';

    const cellRefs = childCodes
      .map(code => {
        const row = rowIndexMap.get(code);
        return row ? `${colLetter}${row}` : null;
      })
      .filter(Boolean);

    return cellRefs.length > 0 ? cellRefs.join('+') : '0';
  }, []);

  // Generate initial data
  const generateInitialData = useCallback(() => {
    const data: any[][] = [];

    // Row 0: Scenario header
    const scenarioRow = ['', '', getScenarioName(scenario)];
    for (let i = 0; i < 12; i++) scenarioRow.push(getScenarioName(scenario));
    scenarioRow.push('T12 Total', 'T12 PPD');
    data.push(scenarioRow);

    // Row 1: Column headers
    const headerRow = ['COA', 'Line Item'];
    t12Months.forEach(m => headerRow.push(m.label));
    headerRow.push(dateRangeLabel, 'Per Day');
    data.push(headerRow);

    // Generate data for each row
    rowConfig.forEach((row, rowIndex) => {
      const actualRowNum = rowIndex + 3;
      const rowData: any[] = [row.coaCode, row.label];

      if (row.type === 'header' || row.type === 'subheader' || row.type === 'spacer') {
        for (let i = 0; i < 14; i++) rowData.push('');
      } else if (row.type === 'input') {
        // Input cells with values
        for (let i = 0; i < 12; i++) {
          const value = getDefaultValue(row.coaCode, row.format, i);
          rowData.push(value);
        }
        // T12 Total formula
        const colC = 'C';
        const colN = 'N';
        if (row.format === 'percent') {
          rowData.push(`=AVERAGE(${colC}${actualRowNum}:${colN}${actualRowNum})`);
        } else {
          rowData.push(`=SUM(${colC}${actualRowNum}:${colN}${actualRowNum})`);
        }
        // PPD formula
        if (row.ppdEligible && row.ppdDenominator) {
          const t12Col = 'O';
          let daysRowCode = '9199'; // Default to total days
          if (row.ppdDenominator === 'skilled_days') daysRowCode = '9129';
          else if (row.ppdDenominator === 'non_skilled_days') daysRowCode = '9119';
          else if (row.ppdDenominator === 'vent_days') daysRowCode = '9139';
          const daysRow = rowIndexMap.get(daysRowCode);
          rowData.push(daysRow ? `=${t12Col}${actualRowNum}/${t12Col}${daysRow}` : '');
        } else {
          rowData.push('');
        }
      } else if (row.type === 'formula') {
        // Formula cells - generate formulas for each month
        for (let colIndex = 0; colIndex < 12; colIndex++) {
          const colLetter = String.fromCharCode(67 + colIndex); // C, D, E, ...
          const formula = generateTotalFormula(row.coaCode, colLetter);
          rowData.push(formula ? `=${formula}` : '');
        }
        // T12 Total
        const t12Col = 'O';
        if (row.format === 'percent') {
          rowData.push(`=AVERAGE(C${actualRowNum}:N${actualRowNum})`);
        } else {
          rowData.push(`=SUM(C${actualRowNum}:N${actualRowNum})`);
        }
        // PPD
        if (row.ppdEligible && row.ppdDenominator) {
          let daysRowCode = '9199';
          if (row.ppdDenominator === 'skilled_days') daysRowCode = '9129';
          else if (row.ppdDenominator === 'non_skilled_days') daysRowCode = '9119';
          else if (row.ppdDenominator === 'vent_days') daysRowCode = '9139';
          const daysRow = rowIndexMap.get(daysRowCode);
          rowData.push(daysRow ? `=${t12Col}${actualRowNum}/${t12Col}${daysRow}` : '');
        } else {
          rowData.push('');
        }
      } else if (row.type === 'kpi') {
        // KPI rows (calculated)
        for (let i = 0; i < 14; i++) rowData.push('');
      } else {
        for (let i = 0; i < 14; i++) rowData.push('');
      }

      data.push(rowData);
    });

    return data;
  }, [assumptions, scenario, t12Months, dateRangeLabel, getDefaultValue, generateTotalFormula]);

  const [data, setData] = useState<any[][]>(() => generateInitialData());

  // Cell renderer for formatting
  const cellRenderer = useCallback((
    instance: Handsontable,
    td: HTMLTableCellElement,
    row: number,
    col: number,
    prop: string | number,
    value: any,
    cellProperties: Handsontable.CellProperties
  ) => {
    Handsontable.renderers.TextRenderer(instance, td, row, col, prop, value, cellProperties);

    // Header rows (0 and 1)
    if (row === 0) {
      td.style.fontWeight = 'bold';
      td.style.backgroundColor = '#1e40af';
      td.style.color = 'white';
      td.style.textAlign = col <= 1 ? 'left' : 'center';
      td.style.fontSize = '11px';
      return td;
    }

    if (row === 1) {
      td.style.fontWeight = 'bold';
      td.style.backgroundColor = '#f3f4f6';
      td.style.textAlign = col <= 1 ? 'left' : 'center';
      td.style.borderBottom = '2px solid #d1d5db';
      td.style.fontSize = '10px';
      return td;
    }

    const config = rowConfig[row - 2];
    if (!config) return td;

    // COA code column styling
    if (col === 0) {
      td.style.fontSize = '9px';
      td.style.color = '#6b7280';
      td.style.textAlign = 'left';
      td.style.paddingLeft = '4px';
      return td;
    }

    // Apply row-level styling
    if (config.bold) td.style.fontWeight = 'bold';
    if (config.bg) td.style.backgroundColor = config.bg;

    if (config.type === 'header') {
      td.style.fontWeight = 'bold';
      td.style.fontSize = '11px';
      td.style.borderTop = '2px solid #d1d5db';
    }

    if (config.type === 'subheader') {
      td.style.fontWeight = '600';
      td.style.fontStyle = 'italic';
      td.style.fontSize = '10px';
    }

    if (config.type === 'spacer') {
      td.style.height = '6px';
      td.style.backgroundColor = '#ffffff';
    }

    // Format values in data columns
    if (col > 1 && value !== '' && value !== null && value !== undefined) {
      const numValue = typeof value === 'string' && value.startsWith('=') ? null : Number(value);

      if (numValue !== null && !isNaN(numValue)) {
        if (config.format === 'currency') {
          td.textContent = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(numValue);
        } else if (config.format === 'percent') {
          td.textContent = new Intl.NumberFormat('en-US', {
            style: 'percent',
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          }).format(numValue);
        } else if (config.format === 'days' || config.format === 'number') {
          td.textContent = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: config.format === 'days' ? 0 : 2,
          }).format(numValue);
        }

        td.style.textAlign = 'right';

        // Color negative values red
        if (numValue < 0) {
          td.style.color = '#dc2626';
        }
      }
    }

    // Style the T12 Total column (col 14)
    if (col === 14) {
      td.style.backgroundColor = td.style.backgroundColor || '#f0fdf4';
      td.style.borderLeft = '2px solid #16a34a';
      td.style.fontWeight = 'bold';
    }

    // Style the PPD column (col 15)
    if (col === 15) {
      td.style.backgroundColor = '#fef3c7';
      td.style.borderLeft = '1px solid #fcd34d';
      td.style.fontWeight = '500';
      td.style.fontSize = '10px';

      // Format PPD values
      const numValue = typeof value === 'string' && value.startsWith('=') ? null : Number(value);
      if (numValue !== null && !isNaN(numValue) && numValue !== 0) {
        if (config.format === 'currency') {
          td.textContent = `$${numValue.toFixed(2)}`;
        }
      }
    }

    // Style the label column with indentation
    if (col === 1) {
      td.style.textAlign = 'left';
      const indent = config.indent || 0;
      td.style.paddingLeft = `${indent * 12 + 4}px`;
      td.style.fontSize = '10px';
    }

    return td;
  }, []);

  // Column widths - adjusted for COA column and PPD
  const colWidths = [55, 220, ...Array(12).fill(75), 90, 70];

  // Handle data changes
  const handleAfterChange = useCallback((changes: Handsontable.CellChange[] | null, source: string) => {
    if (source === 'loadData') return;

    if (hotRef.current && (hotRef.current as any).hotInstance) {
      const currentData = (hotRef.current as any).hotInstance.getData();
      setData(currentData);
      onDataChange?.(currentData);
    }
  }, [onDataChange]);

  useEffect(() => {
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <div className="card p-8 flex items-center justify-center">
        <div className="text-[var(--color-text-tertiary)]">Loading proforma spreadsheet...</div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="p-3 border-b border-[var(--color-border-muted)] bg-[var(--gray-50)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-[var(--color-text-primary)] text-sm">
              {facilityName} Proforma - Full P&L with COA & PPD
            </h3>
            <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
              T12: {dateRangeLabel} | Scenario: {getScenarioName(scenario)} | {rowConfig.length} line items
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800">
              PPD
            </span>
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-800">
              {facilityType.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
        <HotTable
          ref={hotRef}
          data={data}
          colWidths={colWidths}
          rowHeights={22}
          colHeaders={false}
          rowHeaders={false}
          manualColumnResize={true}
          manualRowResize={true}
          contextMenu={true}
          copyPaste={true}
          formulas={{
            engine: HyperFormula,
          }}
          afterChange={handleAfterChange}
          cells={(row, col) => {
            const cellProperties: Partial<Handsontable.CellMeta> = {};

            // Header rows are read-only
            if (row <= 1) {
              cellProperties.readOnly = true;
            }

            // COA and Label columns are read-only
            if (col <= 1) {
              cellProperties.readOnly = true;
            }

            // T12 Total and PPD columns are read-only (formulas)
            if (col >= 14) {
              cellProperties.readOnly = true;
            }

            // Check row config for read-only status
            const config = rowConfig[row - 2];
            if (config) {
              if (config.type === 'header' || config.type === 'subheader' ||
                  config.type === 'spacer' || config.type === 'formula' || config.type === 'kpi') {
                cellProperties.readOnly = true;
              }
            }

            cellProperties.renderer = cellRenderer;

            return cellProperties;
          }}
          licenseKey="non-commercial-and-evaluation"
          className="htCustomStyles"
        />
      </div>
      <div className="p-2 border-t border-[var(--color-border-muted)] bg-[var(--gray-50)] text-xs text-[var(--color-text-tertiary)] flex justify-between">
        <span>Click any editable cell to modify. Formulas auto-calculate. Copy/paste from Excel supported.</span>
        <span className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-green-100 border border-green-500 rounded"></span>
            T12 Total
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 bg-amber-100 border border-amber-400 rounded"></span>
            PPD
          </span>
        </span>
      </div>
    </div>
  );
}
