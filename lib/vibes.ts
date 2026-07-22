import { Vibe, EnergyTrait } from './types';

const VIBE_COLORS: Record<Vibe, string> = {
  flirty: 'from-pink-500 to-red-500',
  playful: 'from-purple-500 to-pink-500',
  curious: 'from-blue-500 to-cyan-500',
  calm: 'from-green-500 to-teal-500',
  venting: 'from-orange-500 to-red-500',
  bored: 'from-gray-500 to-slate-500',
  chaotic: 'from-red-500 to-yellow-500',
};

const VIBE_EMOJIS: Record<Vibe, string> = {
  flirty: '😏',
  playful: '🎭',
  curious: '🔍',
  calm: '😌',
  venting: '😤',
  bored: '😑',
  chaotic: '🌀',
};

const TRAIT_EMOJIS: Record<EnergyTrait, string> = {
  calm: '🧘',
  funny: '😂',
  direct: '🎯',
  'low-key': '🤐',
  intense: '⚡',
  creative: '🎨',
  chill: '🌊',
  driven: '🚀',
};

export function getVibeColor(vibe: Vibe): string {
  return VIBE_COLORS[vibe] || 'from-vibe-500 to-vibe-600';
}

export function getVibeEmoji(vibe: Vibe): string {
  return VIBE_EMOJIS[vibe] || '✨';
}

export function getTraitEmoji(trait: EnergyTrait): string {
  return TRAIT_EMOJIS[trait] || '•';
}

export function getVibeDescription(vibe: Vibe): string {
  const descriptions: Record<Vibe, string> = {
    flirty: 'Feeling romantic and playful',
    playful: 'Fun and light-hearted',
    curious: 'Wanting to explore and learn',
    calm: 'Peaceful and grounded',
    venting: 'Need to express frustration',
    bored: 'Seeking entertainment',
    chaotic: 'Wild and unpredictable',
  };
  return descriptions[vibe] || 'Expressing how you feel';
}
