/**
 * Deal Patterns API
 *
 * Aggregates comparable sale data to surface transaction patterns
 * by state, asset type, and bed count range.
 */

import { NextRequest, NextResponse } from 'next/server';
import { db, comparableSales } from '@/db';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state');
    const assetType = searchParams.get('assetType');
    const minBeds = searchParams.get('minBeds');
    const maxBeds = searchParams.get('maxBeds');

    // Build filter conditions
    const conditions = [];

    if (state) {
      conditions.push(eq(comparableSales.state, state.toUpperCase()));
    }

    if (assetType) {
      conditions.push(
        eq(
          comparableSales.assetType,
          assetType as typeof comparableSales.assetType.enumValues[number]
        )
      );
    }

    if (minBeds) {
      conditions.push(gte(comparableSales.beds, parseInt(minBeds, 10)));
    }

    if (maxBeds) {
      conditions.push(lte(comparableSales.beds, parseInt(maxBeds, 10)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Fetch all matching sales for JS-based percentile calculation
    const allSales = await db
      .select({
        id: comparableSales.id,
        propertyName: comparableSales.propertyName,
        city: comparableSales.city,
        state: comparableSales.state,
        assetType: comparableSales.assetType,
        beds: comparableSales.beds,
        saleDate: comparableSales.saleDate,
        salePrice: comparableSales.salePrice,
        pricePerBed: comparableSales.pricePerBed,
        buyer: comparableSales.buyer,
        seller: comparableSales.seller,
      })
      .from(comparableSales)
      .where(whereClause)
      .orderBy(desc(comparableSales.saleDate));

    if (allSales.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          transactionCount: 0,
          pricePerBed: null,
          salePrice: null,
          dateRange: null,
          recentTransactions: [],
          stateBreakdown: [],
        },
      });
    }

    // Extract numeric arrays for percentile calculations
    const pricesPerBed = allSales
      .map((s) => parseFloat(s.pricePerBed ?? '0'))
      .filter((v) => v > 0)
      .sort((a, b) => a - b);

    const salePrices = allSales
      .map((s) => parseFloat(s.salePrice ?? '0'))
      .filter((v) => v > 0)
      .sort((a, b) => a - b);

    const saleDates = allSales
      .map((s) => s.saleDate)
      .filter(Boolean)
      .sort();

    // Percentile helper (linear interpolation)
    function percentile(sorted: number[], p: number): number {
      if (sorted.length === 0) return 0;
      if (sorted.length === 1) return sorted[0];
      const idx = (p / 100) * (sorted.length - 1);
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx);
      if (lower === upper) return sorted[lower];
      return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
    }

    // Price per bed stats
    const pricePerBedStats =
      pricesPerBed.length > 0
        ? {
            min: Math.round(pricesPerBed[0]),
            max: Math.round(pricesPerBed[pricesPerBed.length - 1]),
            median: Math.round(percentile(pricesPerBed, 50)),
            p25: Math.round(percentile(pricesPerBed, 25)),
            p75: Math.round(percentile(pricesPerBed, 75)),
          }
        : null;

    // Sale price stats
    const salePriceStats =
      salePrices.length > 0
        ? {
            min: Math.round(salePrices[0]),
            max: Math.round(salePrices[salePrices.length - 1]),
            median: Math.round(percentile(salePrices, 50)),
          }
        : null;

    // Date range
    const dateRange =
      saleDates.length > 0
        ? {
            earliest: saleDates[0],
            latest: saleDates[saleDates.length - 1],
          }
        : null;

    // Recent transactions (last 10)
    const recentTransactions = allSales.slice(0, 10).map((s) => ({
      propertyName: s.propertyName,
      state: s.state,
      beds: s.beds,
      salePrice: s.salePrice ? Math.round(parseFloat(s.salePrice)) : null,
      pricePerBed: s.pricePerBed ? Math.round(parseFloat(s.pricePerBed)) : null,
      saleDate: s.saleDate,
      buyer: s.buyer,
      seller: s.seller,
    }));

    // State breakdown aggregation
    const stateMap = new Map<
      string,
      { count: number; totalPricePerBed: number; validCount: number }
    >();

    for (const sale of allSales) {
      const st = sale.state ?? 'Unknown';
      const entry = stateMap.get(st) ?? { count: 0, totalPricePerBed: 0, validCount: 0 };
      entry.count++;
      const ppb = parseFloat(sale.pricePerBed ?? '0');
      if (ppb > 0) {
        entry.totalPricePerBed += ppb;
        entry.validCount++;
      }
      stateMap.set(st, entry);
    }

    const stateBreakdown = Array.from(stateMap.entries())
      .map(([st, data]) => ({
        state: st,
        count: data.count,
        avgPricePerBed:
          data.validCount > 0
            ? Math.round(data.totalPricePerBed / data.validCount)
            : null,
      }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      success: true,
      data: {
        transactionCount: allSales.length,
        pricePerBed: pricePerBedStats,
        salePrice: salePriceStats,
        dateRange,
        recentTransactions,
        stateBreakdown,
      },
    });
  } catch (error) {
    console.error('Deal patterns API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch deal patterns' },
      { status: 500 }
    );
  }
}
