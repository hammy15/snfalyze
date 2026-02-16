/**
 * LLM Router Singleton
 *
 * Provides a lazily-initialized, globally shared router instance.
 * Import getRouter() anywhere to access the multi-provider orchestration.
 */

import { LLMRouter } from './llm-router';

let router: LLMRouter | null = null;

export function getRouter(): LLMRouter {
  if (!router) {
    router = new LLMRouter();
  }
  return router;
}

/** Reset the singleton (useful for testing or config changes) */
export function resetRouter(): void {
  router = null;
}
