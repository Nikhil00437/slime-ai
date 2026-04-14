import { SlimeSkill, SkillRank, CompatibilityResult, RANK_GENERATION_RATES } from './types';

const SUPERIOR_MODELS = [
  'gpt-4o', 'gpt-4-turbo', 'o1', 'o3',
  'claude-3-5-sonnet', 'claude-3-7-sonnet', 'claude-3-opus',
  'gemini-2.0-pro', 'gemini-1.5-pro',
];

const LOCAL_OR_FREE_PATTERNS = [
  'llama', 'mistral', 'phi', 'gemma', 'qwen', 'deepseek',
  'orca', 'vicuna', 'falcon', 'tinyllama', 'ollama', 'lmstudio',
];

export function canGenerateUltimate(modelId: string, provider: string): boolean {
  const id = modelId.toLowerCase();
  const isLocal = provider === 'ollama' || provider === 'lmstudio';
  if (isLocal) return false;
  if (LOCAL_OR_FREE_PATTERNS.some(p => id.includes(p))) return false;
  return SUPERIOR_MODELS.some(m => id.includes(m.replace(/-/g, '')));
}

export function canGenerateTerminal(modelId: string, provider: string): boolean {
  const id = modelId.toLowerCase();
  const isLocal = provider === 'ollama' || provider === 'lmstudio';
  return isLocal || LOCAL_OR_FREE_PATTERNS.some(p => id.includes(p));
}

export function rollRank(modelId: string, provider: string): SkillRank {
  const canUltimate = canGenerateUltimate(modelId, provider);
  const canTerminal = canGenerateTerminal(modelId, provider);
  const r = Math.random();

  if (canTerminal && r < 0.0000001) return 'terminal';
  if (canUltimate && r < 0.001) return 'ultimate';

  const normalThreshold = RANK_GENERATION_RATES.normal;
  const rareThreshold = normalThreshold + RANK_GENERATION_RATES.rare;
  const uniqueThreshold = rareThreshold + RANK_GENERATION_RATES.unique;

  if (r < normalThreshold) return 'normal';
  if (r < rareThreshold) return 'rare';
  if (r < uniqueThreshold) return 'unique';
  return 'normal';
}

export function buildSkillGenerationPrompt(description: string, rolledRank: SkillRank): string {
  const rankInstructions: Record<SkillRank, string> = {
    normal: `Generate a skill that performs EXACTLY as described, possibly slightly simplified. 
      It should be reliable and do its core function well, nothing more.`,
    rare: `Generate a skill that performs as described AND adds 1-2 enhanced features or bonus abilities 
      not explicitly requested but logically complementary.`,
    unique: `Generate a superior version of the described skill. It should transcend the description 
      with exceptional depth, breadth, or emergent capabilities. Specify which types of AI models 
      (by capability tier) can wield this skill effectively.`,
    ultimate: `Generate a pinnacle skill — perfect, complete, and unreproducible by lesser models. 
      It represents the absolute ceiling of what this concept can achieve. No further improvement 
      is conceivable. It must be genuinely revolutionary for the current era of AI.`,
    terminal: `Generate a void skill — born from local models, transcending their limitations. 
      It stands at the pinnacle alongside ultimate skills but is created by humble local models. 
      Dark, mysterious, and beyond conventional ranking. This is the NULL rank — Terminal.`,
  };

  return `You are a JSON API. You output ONLY raw JSON with no explanation, no markdown, no preamble, no code fences.

Task: Create an AI assistant skill for the Slime universe.

User description: "${description}"
Assigned rank: ${rolledRank.toUpperCase()}

Rank requirement: ${rankInstructions[rolledRank]}

Output exactly this JSON structure and nothing else:
{"name":"<2-4 word evocative skill name>","systemPrompt":"<2-4 sentences: the system prompt injected when this skill is active>","abilities":["<ability 1>","<ability 2>","<ability 3>"],"limitations":["<limitation 1>","<limitation 2>"],"rankReason":"<1-2 sentences explaining why this skill earned ${rolledRank} rank>"${rolledRank === 'unique' || rolledRank === 'ultimate' ? ',"compatibleModels":["<model tier 1>","<model tier 2>"]' : ''},"icon":"<single emoji>"}`;
}

export async function generateSkill(
  description: string,
  modelId: string,
  provider: string,
  apiKey: string | undefined,
  baseUrl: string,
  _streamCb: (chunk: string) => void,
  fetchFn: typeof fetch = fetch
): Promise<Omit<SlimeSkill, 'id' | 'createdAt'>> {
  const rank = rollRank(modelId, provider);
  const prompt = buildSkillGenerationPrompt(description, rank);

  let raw = '';

  if (provider === 'anthropic' && apiKey) {
    const res = await fetchFn(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    raw = data.content?.[0]?.text ?? '{}';

  } else if ((provider === 'openai' || provider === 'openrouter' || provider === 'grok') && apiKey) {
    const res = await fetchFn(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(provider === 'openrouter' ? { 'HTTP-Referer': 'localhost', 'X-Title': 'MultiModel' } : {}),
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 800,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    raw = data.choices?.[0]?.message?.content ?? '{}';

  } else if (provider === 'gemini' && apiKey) {
    const res = await fetchFn(
      `${baseUrl}/models/${modelId}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 800, temperature: 0.7 },
        }),
      }
    );
    const data = await res.json();
    raw = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';

  } else if (provider === 'ollama') {
    const res = await fetchFn(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        stream: false,
        format: 'json',
        messages: [
          { role: 'system', content: 'You are a JSON API. Output ONLY raw JSON, no markdown, no explanation.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    const data = await res.json();
    raw = data.message?.content ?? data.response ?? '{}';

  } else if (provider === 'lmstudio') {
    const res = await fetchFn(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
      }),
    });
    const data = await res.json();
    raw = data.choices?.[0]?.message?.content ?? '{}';

  } else {
    throw new Error(
      `Provider "${provider}" not supported or missing API key. ` +
      `Supported: ollama, lmstudio, openai, anthropic, gemini, openrouter, grok.`
    );
  }

  const parsed = extractJSON(raw);

  if (!parsed || !parsed.name || !parsed.systemPrompt) {
    throw new Error(
      `Model returned invalid JSON. Raw response preview: "${raw.slice(0, 120).replace(/\n/g, ' ')}..."\n\nTip: Try a different model — some local models ignore JSON-only instructions.`
    );
  }

  return {
    name: parsed.name,
    description,
    systemPrompt: parsed.systemPrompt,
    icon: parsed.icon ?? '✨',
    rank,
    rankReason: parsed.rankReason ?? `Classified as ${rank} based on description scope.`,
    abilities: Array.isArray(parsed.abilities) ? parsed.abilities : [],
    limitations: Array.isArray(parsed.limitations) ? parsed.limitations : [],
    compatibleModels: parsed.compatibleModels,
    level: 1,
    thumbsUp: 0,
    thumbsDown: 0,
    enabled: true,
    builtIn: false,
  };
}

/**
 * Robustly extract the first valid JSON object from a model response.
 * Handles: raw JSON, ```json fences, JSON buried in prose, partial wrapping.
 */
function extractJSON(raw: string): Record<string, any> | null {
  if (!raw || typeof raw !== 'string') return null;

  // 1. Strip markdown code fences
  let cleaned = raw
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // 2. Try direct parse first
  try { return JSON.parse(cleaned); } catch {}

  // 3. Find first { ... } block (handles prose before/after JSON)
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(cleaned.slice(start, end + 1)); } catch {}
  }

  // 4. Try to find JSON with balanced brace counting
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] !== '{') continue;
    let depth = 0;
    let inStr = false;
    let escape = false;
    for (let j = i; j < cleaned.length; j++) {
      const ch = cleaned[j];
      if (escape) { escape = false; continue; }
      if (ch === '\\' && inStr) { escape = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') depth++;
      if (ch === '}') {
        depth--;
        if (depth === 0) {
          try { return JSON.parse(cleaned.slice(i, j + 1)); } catch {}
          break;
        }
      }
    }
  }

  return null;
}

export function computeCompatibility(a: SlimeSkill, b: SlimeSkill): CompatibilityResult {
  const wordsA = new Set([
    ...a.description.toLowerCase().split(/\W+/),
    ...a.abilities.join(' ').toLowerCase().split(/\W+/),
    ...a.systemPrompt.toLowerCase().split(/\W+/),
  ]);
  const wordsB = new Set([
    ...b.description.toLowerCase().split(/\W+/),
    ...b.abilities.join(' ').toLowerCase().split(/\W+/),
    ...b.systemPrompt.toLowerCase().split(/\W+/),
  ]);

  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'and', 'or', 'to', 'of', 'in', 'you', 'your', 'that', 'for', 'with', 'be', 'will', 'can', 'as', 'it', 'this', 'by']);
  const filteredA = [...wordsA].filter(w => w.length > 3 && !stopWords.has(w));
  const filteredB = new Set([...wordsB].filter(w => w.length > 3 && !stopWords.has(w)));

  const intersection = filteredA.filter(w => filteredB.has(w)).length;
  const union = new Set([...filteredA, ...filteredB]).size;

  const jaccardBase = union > 0 ? intersection / union : 0;

  const rankValues: Record<SkillRank, number> = { normal: 1, rare: 2, unique: 3, ultimate: 4, terminal: 5 };
  const rankDiff = Math.abs(rankValues[a.rank] - rankValues[b.rank]);
  const rankBonus = rankDiff === 0 ? 0.05 : rankDiff === 1 ? 0.02 : 0;

  const raw = Math.min(1, jaccardBase * 3.5 + rankBonus + Math.random() * 0.12);
  const score = Math.round(raw * 100) / 100;

  let reason = '';
  if (score >= 0.95) reason = 'Synergistic — abilities reinforce each other directly.';
  else if (score >= 0.75) reason = 'Complementary — meaningful overlap in domain.';
  else if (score >= 0.5) reason = 'Compatible — some shared concepts.';
  else reason = 'Incompatible — divergent domains.';

  return { skillId: b.id, score, reason };
}

export function mergedRank(skills: SlimeSkill[]): SkillRank {
  const rankValues: Record<SkillRank, number> = { normal: 0, rare: 1, unique: 2, ultimate: 3, terminal: 4 };
  const rankOrder: SkillRank[] = ['normal', 'rare', 'unique', 'ultimate', 'terminal'];
  const maxVal = Math.max(...skills.map(s => rankValues[s.rank]));
  return rankOrder[maxVal];
}
