export type Vibe = 'flirty' | 'bored' | 'curious' | 'venting' | 'playful' | 'calm' | 'chaotic';

export type EnergyTrait = 'calm' | 'funny' | 'direct' | 'low-key' | 'intense' | 'creative' | 'chill' | 'driven';

export interface User {
  id: string;
  first_name: string;
  age: number;
  city: string;
  energy_traits: EnergyTrait[];
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Mood {
  id: string;
  user_id: string;
  text: string;
  vibe: Vibe;
  tags: string[];
  created_at: string;
  expires_at: string;
  moderated: boolean;
  flagged: boolean;
}

export interface Resonate {
  id: string;
  from_user: string;
  to_mood: string;
  created_at: string;
}

export interface Match {
  id: string;
  user_a: string;
  user_b: string;
  created_at: string;
  expires_at: string;
  extended_by_a: boolean;
  extended_by_b: boolean;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  read: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface MatchingScore {
  mood_id: string;
  user_id: string;
  score: number;
  vibe_compatibility: number;
  recency: number;
  mutual_tags: number;
}

export interface ModerationResult {
  safe: boolean;
  reason?: string;
  severity?: 'warning' | 'block';
}
