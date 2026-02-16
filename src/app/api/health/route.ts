import { NextResponse } from 'next/server';
import { getRouter } from '@/lib/ai';

/**
 * GET /api/health
 *
 * Diagnostic endpoint to check AI provider connectivity from Vercel.
 */
export async function GET() {
  const router = getRouter();
  const available = router.getAvailableProviders();

  // Test each provider with healthCheck (tiny ping request)
  const health = await router.healthCheck();

  // Also check env var presence (not values)
  const envCheck: Record<string, boolean> = {
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
    GOOGLE_AI_API_KEY: !!process.env.GOOGLE_AI_API_KEY,
    XAI_API_KEY: !!process.env.XAI_API_KEY,
    PERPLEXITY_API_KEY: !!process.env.PERPLEXITY_API_KEY,
  };

  return NextResponse.json({
    providers: available,
    health,
    envVarsSet: envCheck,
    nodeVersion: process.version,
    timestamp: new Date().toISOString(),
  });
}
