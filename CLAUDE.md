# SNFalyze — Cascadia Healthcare AI Underwriting Platform

## What This Is
SNFalyze is an AI-powered healthcare real estate underwriting platform for Cascadia Healthcare. It analyzes SNF, ALF, and hospice acquisitions.

## Institutional Knowledge
The /knowledge directory contains Cascadia's proprietary intelligence synced from the OpenClaw bot twice daily. ALWAYS reference these when working on analysis, valuation, or deal logic.

## Key Business Rules
- SNF-Owned: 12.5% cap rate on EBITDAR
- Leased: 2.0-3.0x multiplier on EBIT (midpoint 2.5x)
- ALF/SNC-Owned: EBITDAR / variable cap rate (8%/9%/12% by SNC%)
- ALF cap rates: 6.5-7.5% nationally
- Risk is priced, not avoided
- Dual view always: External (lender: 14% SNF, 2.0x leased) + Cascadia (execution: 12.5% SNF, 2.5x leased)
- Self-validate every analysis: recession stress test, seller manipulation check

## Tech Stack
Next.js 14, React 18, Tailwind, Neon PostgreSQL, Claude Sonnet 4, Vercel

## Important Paths
- src/lib/analysis/ — Core analysis engine and prompts
- src/lib/analysis/prompts.ts — System prompt with Cascadia intelligence
- src/lib/analysis/engine.ts — Valuation engine with national cap rates
- knowledge/ — 150+ institutional intelligence files from OpenClaw bot
