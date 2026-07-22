export type Vibe = 'flirty' | 'bored' | 'curious' | 'venting' | 'playful' | 'calm' | 'chaotic';

export type EnergyTrait = 'calm' | 'funny' | 'direct' | 'low-key' | 'intense' | 'creative' | 'chill' | 'driven';

export interface User {
  id: string;
  first_name: string;
  age: number;
  city: string;
  latitude?: number | null;
  longitude?: number | null;
  share_location?: boolean;
  location_updated_at?: string | null;
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
  reactions?: string[];
  boosted?: boolean;
  created_at: string;
  expires_at: string;
  moderated: boolean;
  flagged: boolean;
  first_name?: string;
  age?: number;
  city?: string;
  distance_km?: number | null;
  relative_x?: number | null;
  relative_y?: number | null;
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
  matched_user_name?: string;
  matched_user_age?: number;
  matched_user_city?: string;
  matched_user_traits?: string[];
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  text: string;
  created_at: string;
  read: boolean;
  first_name?: string;
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

export interface Joke {
  external_id: string;
  category: string;
  type: 'single' | 'twopart';
  setup: string | null;
  delivery: string | null;
  joke: string | null;
  safe: boolean;
  source: string;
}
