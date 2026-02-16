/**
 * FRED (Federal Reserve Economic Data) API Service
 *
 * Free API providing Treasury rates, Fed funds rate, CPI, and other
 * economic indicators critical for healthcare real estate valuation.
 *
 * Used for: Debt service calculations, cap rate spread analysis,
 * recession stress testing, and market condition assessment.
 *
 * API Docs: https://fred.stlouisfed.org/docs/api/fred/
 * No API key required for basic access via alternative endpoints.
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FREDSeriesObservation {
  date: string;
  value: string;
}

export interface EconomicIndicators {
  treasuryRate10Y: number | null;
  treasuryRate5Y: number | null;
  treasuryRate2Y: number | null;
  fedFundsRate: number | null;
  cpiYoY: number | null;
  unemploymentRate: number | null;
  fetchedAt: Date;
  source: 'fred' | 'fallback';
}

export interface DebtServiceContext {
  currentRate: number;
  rateEnvironment: 'low' | 'moderate' | 'high';
  spread: number;
  estimatedBorrowingRate: number;
  yieldCurveInverted: boolean;
  rateDirection: 'rising' | 'stable' | 'falling';
}

// ============================================================================
// FRED SERIES IDS
// ============================================================================

const SERIES = {
  TREASURY_10Y: 'DGS10',       // 10-Year Treasury Constant Maturity Rate
  TREASURY_5Y: 'DGS5',         // 5-Year Treasury
  TREASURY_2Y: 'DGS2',         // 2-Year Treasury
  FED_FUNDS: 'FEDFUNDS',       // Federal Funds Effective Rate
  CPI_YOY: 'CPIAUCSL',         // Consumer Price Index (All Urban)
  UNEMPLOYMENT: 'UNRATE',       // Unemployment Rate
} as const;

// ============================================================================
// CACHE
// ============================================================================

let cachedIndicators: EconomicIndicators | null = null;
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

// ============================================================================
// FRED API CLIENT
// ============================================================================

const FRED_BASE_URL = 'https://api.stlouisfed.org/fred/series/observations';

async function fetchFREDSeries(
  seriesId: string,
  apiKey?: string,
): Promise<number | null> {
  const key = apiKey || process.env.FRED_API_KEY;

  if (!key) {
    // Use FRED's public web data as fallback
    return fetchFREDPublic(seriesId);
  }

  try {
    const url = new URL(FRED_BASE_URL);
    url.searchParams.set('series_id', seriesId);
    url.searchParams.set('api_key', key);
    url.searchParams.set('file_type', 'json');
    url.searchParams.set('sort_order', 'desc');
    url.searchParams.set('limit', '5');

    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      console.warn(`[FRED] API error for ${seriesId}: ${response.status}`);
      return fetchFREDPublic(seriesId);
    }

    const data = await response.json();
    const observations: FREDSeriesObservation[] = data.observations || [];

    // Find most recent non-missing value
    for (const obs of observations) {
      if (obs.value !== '.' && obs.value !== '') {
        const value = parseFloat(obs.value);
        if (!isNaN(value)) return value;
      }
    }

    return null;
  } catch (err) {
    console.warn(`[FRED] Failed to fetch ${seriesId}:`, err);
    return fetchFREDPublic(seriesId);
  }
}

/**
 * Fallback: Fetch from FRED's public observation API without key
 * This uses a slightly different endpoint that doesn't require auth
 */
async function fetchFREDPublic(seriesId: string): Promise<number | null> {
  try {
    // FRED public JSON endpoint (no API key needed for limited access)
    const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${seriesId}&cosd=${getRecentDate()}&coed=${getTodayDate()}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: {
        'User-Agent': 'SNFalyze/1.0 (Healthcare Real Estate Analysis)',
      },
    });

    if (!response.ok) return null;

    const csv = await response.text();
    const lines = csv.trim().split('\n');

    // Parse last line (most recent data point)
    for (let i = lines.length - 1; i >= 1; i--) {
      const parts = lines[i].split(',');
      if (parts.length >= 2) {
        const value = parseFloat(parts[1]);
        if (!isNaN(value) && parts[1] !== '.') return value;
      }
    }

    return null;
  } catch {
    return null;
  }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Fetch current economic indicators from FRED
 * Results are cached for 4 hours.
 */
export async function getEconomicIndicators(): Promise<EconomicIndicators> {
  // Check cache
  if (cachedIndicators && Date.now() - cachedIndicators.fetchedAt.getTime() < CACHE_TTL_MS) {
    return cachedIndicators;
  }

  console.log('[FRED] Fetching economic indicators...');

  // Fetch all series in parallel
  const [treasury10Y, treasury5Y, treasury2Y, fedFunds, unemployment] = await Promise.all([
    fetchFREDSeries(SERIES.TREASURY_10Y),
    fetchFREDSeries(SERIES.TREASURY_5Y),
    fetchFREDSeries(SERIES.TREASURY_2Y),
    fetchFREDSeries(SERIES.FED_FUNDS),
    fetchFREDSeries(SERIES.UNEMPLOYMENT),
  ]);

  const indicators: EconomicIndicators = {
    treasuryRate10Y: treasury10Y,
    treasuryRate5Y: treasury5Y,
    treasuryRate2Y: treasury2Y,
    fedFundsRate: fedFunds,
    cpiYoY: null, // CPI requires separate calculation (month-over-month)
    unemploymentRate: unemployment,
    fetchedAt: new Date(),
    source: treasury10Y !== null ? 'fred' : 'fallback',
  };

  cachedIndicators = indicators;
  console.log(`[FRED] Indicators fetched — 10Y: ${treasury10Y}%, Fed Funds: ${fedFunds}%`);

  return indicators;
}

/**
 * Get debt service context for deal analysis
 * Calculates estimated borrowing rates and rate environment assessment.
 */
export async function getDebtServiceContext(): Promise<DebtServiceContext> {
  const indicators = await getEconomicIndicators();

  // Use 10-year Treasury as base rate, or fallback to reasonable defaults
  const baseRate = indicators.treasuryRate10Y ?? 4.25;
  const rate5Y = indicators.treasuryRate5Y ?? baseRate;
  const rate2Y = indicators.treasuryRate2Y ?? baseRate;

  // Healthcare facility lending spread: typically 200-350 bps over Treasury
  const healthcareSpread = 2.75; // 275 bps — mid-market SNF/ALF spread
  const estimatedBorrowingRate = baseRate + healthcareSpread;

  // Rate environment classification
  let rateEnvironment: 'low' | 'moderate' | 'high';
  if (baseRate < 3.0) rateEnvironment = 'low';
  else if (baseRate < 4.5) rateEnvironment = 'moderate';
  else rateEnvironment = 'high';

  // Yield curve inversion check (2Y > 10Y = recession indicator)
  const yieldCurveInverted = rate2Y > baseRate;

  // Rate direction (compare 5Y vs 10Y as proxy)
  let rateDirection: 'rising' | 'stable' | 'falling';
  const shortLongSpread = baseRate - rate5Y;
  if (shortLongSpread > 0.25) rateDirection = 'rising';
  else if (shortLongSpread < -0.25) rateDirection = 'falling';
  else rateDirection = 'stable';

  return {
    currentRate: baseRate,
    rateEnvironment,
    spread: healthcareSpread,
    estimatedBorrowingRate,
    yieldCurveInverted,
    rateDirection,
  };
}

/**
 * Get a formatted market conditions summary for inclusion in deal analysis
 */
export async function getMarketConditionsSummary(): Promise<string> {
  try {
    const indicators = await getEconomicIndicators();
    const debtContext = await getDebtServiceContext();

    const lines: string[] = [
      '## Current Economic Environment (FRED Data)',
      '',
    ];

    if (indicators.treasuryRate10Y !== null) {
      lines.push(`- 10-Year Treasury: ${indicators.treasuryRate10Y.toFixed(2)}%`);
    }
    if (indicators.treasuryRate5Y !== null) {
      lines.push(`- 5-Year Treasury: ${indicators.treasuryRate5Y.toFixed(2)}%`);
    }
    if (indicators.fedFundsRate !== null) {
      lines.push(`- Fed Funds Rate: ${indicators.fedFundsRate.toFixed(2)}%`);
    }
    if (indicators.unemploymentRate !== null) {
      lines.push(`- Unemployment: ${indicators.unemploymentRate.toFixed(1)}%`);
    }

    lines.push(`- Estimated Borrowing Rate (SNF/ALF): ${debtContext.estimatedBorrowingRate.toFixed(2)}%`);
    lines.push(`- Rate Environment: ${debtContext.rateEnvironment}`);
    lines.push(`- Yield Curve: ${debtContext.yieldCurveInverted ? 'INVERTED (recession signal)' : 'Normal'}`);
    lines.push(`- Rate Direction: ${debtContext.rateDirection}`);

    return lines.join('\n');
  } catch (err) {
    console.warn('[FRED] Failed to generate market conditions summary:', err);
    return '## Economic data unavailable';
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getRecentDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - 30); // Look back 30 days
  return d.toISOString().split('T')[0];
}
