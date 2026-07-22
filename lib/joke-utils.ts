import { Vibe } from './types';

export type JokeType = 'single' | 'twopart';

export interface JokePayload {
  external_id: string;
  category: string;
  type: JokeType;
  setup: string | null;
  delivery: string | null;
  joke: string | null;
  safe: boolean;
  source: string;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  Programming: '💻',
  Misc: '🎲',
  Pun: '😄',
  Spooky: '👻',
  Christmas: '🎄',
  Dark: '🖤',
  Any: '🎉',
};

export function formatJoke(text: string | null): string {
  if (!text) return '';
  return text.replace(/\s+/g, ' ').trim();
}

export function detectJokeType(joke: Partial<JokePayload>): JokeType {
  return joke.delivery ? 'twopart' : 'single';
}

export function getJokeEmoji(category: string): string {
  return CATEGORY_EMOJIS[category] || '😂';
}

export function getSuggestionsByVibe(vibe?: Vibe | null): string[] {
  switch (vibe) {
    case 'playful':
      return ['Pun', 'Misc', 'Programming'];
    case 'chaotic':
      return ['Dark', 'Pun', 'Misc'];
    case 'curious':
      return ['Programming', 'Misc', 'Pun'];
    case 'calm':
      return ['Misc', 'Christmas', 'Pun'];
    case 'venting':
      return ['Dark', 'Misc'];
    case 'flirty':
      return ['Pun', 'Misc'];
    case 'bored':
      return ['Any', 'Misc', 'Pun'];
    default:
      return ['Any', 'Programming', 'Pun'];
  }
}
