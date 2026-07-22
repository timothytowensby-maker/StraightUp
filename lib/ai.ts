import { OpenAI } from 'openai';
import { Vibe, ModerationResult } from './types';

let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openai;
}

export async function classifyMood(text: string): Promise<Vibe> {
  try {
    const client = getOpenAI();
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a vibe classifier. Classify the mood text into ONE of these vibes: flirty, bored, curious, venting, playful, calm, chaotic. Respond ONLY with the vibe word, nothing else.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.5,
      max_tokens: 10,
    });

    const vibe = response.choices[0]?.message?.content?.toLowerCase().trim() as Vibe;
    const validVibes: Vibe[] = ['flirty', 'bored', 'curious', 'venting', 'playful', 'calm', 'chaotic'];
    return validVibes.includes(vibe) ? vibe : 'playful';
  } catch (error) {
    console.error('Error classifying mood:', error);
    return 'playful';
  }
}

export async function generatePrompt(): Promise<string> {
  const prompts = [
    "What's something you wish people asked you more?",
    "Describe your current vibe in one sentence.",
    "What's on your mind right now?",
    "If your mood was a song, what would it be?",
    "What's your unpopular opinion today?",
    "What's making you laugh lately?",
    "What's something you're curious about?",
    "What's the vibe right now?",
    "How are you REALLY doing?",
    "What would make today better?",
  ];
  return prompts[Math.floor(Math.random() * prompts.length)];
}

export async function moderateContent(text: string): Promise<ModerationResult> {
  try {
    const client = getOpenAI();
    const response = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `You are a content safety moderator. Check if text contains: explicit sexual content, hate speech, threats, doxxing, spam, bot behavior, or harassment. Respond ONLY with valid JSON: {"safe": true/false, "reason": "explanation", "severity": "warning|block"}. If safe, reason can be empty.`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { safe: true };

    try {
      const parsed = JSON.parse(content);
      return {
        safe: parsed.safe !== false,
        reason: parsed.reason,
        severity: parsed.severity || 'warning',
      };
    } catch (parseError) {
      console.error('Failed to parse moderation response:', parseError);
      return { safe: true };
    }
  } catch (error) {
    console.error('Error moderating content:', error);
    return { safe: true };
  }
}

export function calculateVibeCompatibility(vibe1: Vibe, vibe2: Vibe): number {
  const compatibility: Record<Vibe, Record<Vibe, number>> = {
    flirty: { flirty: 0.95, playful: 0.9, curious: 0.8, calm: 0.6, bored: 0.4, venting: 0.3, chaotic: 0.5 },
    playful: { playful: 0.95, flirty: 0.9, curious: 0.85, calm: 0.5, bored: 0.3, venting: 0.2, chaotic: 0.7 },
    curious: { curious: 0.9, playful: 0.85, flirty: 0.8, calm: 0.7, bored: 0.5, venting: 0.4, chaotic: 0.6 },
    calm: { calm: 0.95, curious: 0.7, playful: 0.5, flirty: 0.6, venting: 0.8, bored: 0.6, chaotic: 0.2 },
    venting: { venting: 0.9, calm: 0.8, curious: 0.5, playful: 0.2, flirty: 0.3, bored: 0.3, chaotic: 0.5 },
    bored: { bored: 0.85, playful: 0.3, curious: 0.5, calm: 0.6, flirty: 0.4, venting: 0.3, chaotic: 0.7 },
    chaotic: { chaotic: 0.9, playful: 0.7, curious: 0.6, calm: 0.2, flirty: 0.5, venting: 0.5, bored: 0.7 },
  };

  return compatibility[vibe1]?.[vibe2] || 0.5;
}

export async function generateMatchScore(
  userVibe: Vibe,
  targetVibe: Vibe,
  recencyMinutes: number,
  sharedTags: number
): Promise<number> {
  const vibeCompat = calculateVibeCompatibility(userVibe, targetVibe);
  const recencyScore = Math.max(0, 1 - recencyMinutes / 1440); // 24h window
  const tagScore = Math.min(1, sharedTags / 3);
  const randomness = Math.random() * 0.1;

  return (vibeCompat * 0.4) + (recencyScore * 0.3) + (tagScore * 0.2) + randomness;
}
