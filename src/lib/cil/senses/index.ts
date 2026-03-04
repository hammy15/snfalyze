// =============================================================================
// SENSES INDEX — All 5 senses of the CIL
// =============================================================================

import type { Sense } from '../types';
import { cmsSense } from './cms-sense';
import { financialSense } from './financial-sense';
import { marketSense } from './market-sense';
import { regulatorySense } from './regulatory-sense';
import { dealSense } from './deal-sense';

export const ALL_SENSES: Sense[] = [
  cmsSense,
  financialSense,
  marketSense,
  regulatorySense,
  dealSense,
];

export const SENSE_MAP: Record<string, Sense> = Object.fromEntries(
  ALL_SENSES.map((s) => [s.id, s])
);

export function getSense(id: string): Sense | undefined {
  return SENSE_MAP[id];
}

export function getSenseList(): Array<{ id: string; name: string; icon: string; description: string }> {
  return ALL_SENSES.map((s) => ({
    id: s.id,
    name: s.name,
    icon: s.icon,
    description: s.description,
  }));
}

export { cmsSense, financialSense, marketSense, regulatorySense, dealSense };
