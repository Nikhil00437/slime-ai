import { SlimeSkill } from '../slime/types';
import { nonStreamChatCompletion } from './providers';
import { ProviderType } from '../types';

export interface SkillRatingResult {
  rating: number;
  reason: string;
  thumbsUp: boolean;
}

export async function rateSkillPerformance(
  skill: SlimeSkill,
  userMessage: string,
  assistantResponse: string,
  provider: ProviderType,
  baseUrl: string,
  modelId: string,
  apiKey?: string
): Promise<SkillRatingResult> {
  const prompt = `You are evaluating how well a skill performed in a conversation.

Skill: ${skill.name}
Description: ${skill.description}
System Prompt: ${skill.systemPrompt}
Abilities: ${skill.abilities.join(', ')}

User message: "${userMessage}"
Assistant response: "${assistantResponse}"

Evaluate how well the skill guided the response on a scale of 0 to 1, where:
- 0 = Completely failed to apply the skill, wrong or harmful response
- 0.5 = Skill partially applied, response okay but could be better
- 1 = Skill perfectly applied, excellent response exceeding expectations

Respond ONLY with a JSON object like this:
{"rating": 0.85, "reason": "Brief explanation of why you gave this rating"}`;

  try {
    const result = await nonStreamChatCompletion(
      provider,
      baseUrl,
      modelId,
      [],
      prompt,
      0.3,
      500,
      apiKey
    );

    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { rating: 0.5, reason: 'Could not parse rating', thumbsUp: false };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const rating = Math.max(0, Math.min(1, parsed.rating || 0.5));
    
    return {
      rating,
      reason: parsed.reason || 'Rating based on skill application',
      thumbsUp: rating >= 0.75,
    };
  } catch (err) {
    console.error('Skill rating failed:', err);
    return { rating: 0.5, reason: 'Rating failed', thumbsUp: false };
  }
}

export function calculateNewLevel(thumbsUp: number): number {
  const thresholds = [0, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (thumbsUp >= thresholds[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function shouldLevelUp(thumbsUp: number): boolean {
  const thresholds = [0, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000];
  const currentLevel = calculateNewLevel(thumbsUp);
  
  if (currentLevel >= 10) return false;
  
  const nextThreshold = thresholds[currentLevel];
  return thumbsUp >= nextThreshold;
}
