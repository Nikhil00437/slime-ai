import { ProviderType } from '../types';

// Pricing per 1K tokens (approximate, in USD)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // OpenAI
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-32k': { input: 0.06, output: 0.12 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'o1': { input: 0.015, output: 0.06 },
  'o1-mini': { input: 0.003, output: 0.012 },
  'o3-mini': { input: 0.003, output: 0.015 },

  // Anthropic
  'claude-3-5-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-5-haiku': { input: 0.0008, output: 0.004 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 },

  // OpenRouter (use a default since models vary widely)
  'openrouter': { input: 0.001, output: 0.002 },

  // Google Gemini
  'gemini-pro': { input: 0.00125, output: 0.005 },
  'gemini-pro-vision': { input: 0.00125, output: 0.005 },

  // Grok
  'grok-2': { input: 0.002, output: 0.01 },
  'grok-2-vision': { input: 0.002, output: 0.01 },
  'grok-beta': { input: 0.005, output: 0.015 },

  // Ollama / LM Studio - local models, no cost
  'ollama': { input: 0, output: 0 },
  'lmstudio': { input: 0, output: 0 },
};

// Default pricing for unknown models
const DEFAULT_PRICING = { input: 0.001, output: 0.002 };

export function getModelPricing(provider: ProviderType, modelId: string): { input: number; output: number } {
  // Check exact match first
  if (MODEL_PRICING[modelId]) {
    return MODEL_PRICING[modelId];
  }

  // Check prefix match for known model families
  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (modelId.includes(key) || key.includes(modelId.split('-')[0])) {
      return pricing;
    }
  }

  // Local models have no cost
  if (provider === 'ollama' || provider === 'lmstudio') {
    return { input: 0, output: 0 };
  }

  // Default for unknown cloud models
  return DEFAULT_PRICING;
}

export function calculateMessageCost(
  provider: ProviderType,
  modelId: string,
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number }
): number {
  if (!usage) return 0;

  const pricing = getModelPricing(provider, modelId);
  const inputCost = (usage.inputTokens / 1000) * pricing.input;
  const outputCost = (usage.outputTokens / 1000) * pricing.output;

  return inputCost + outputCost;
}

export function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.001) return '<$0.001';
  return `$${cost.toFixed(4)}`;
}

export function formatTokenCount(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
}