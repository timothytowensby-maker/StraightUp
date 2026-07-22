-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  age INT NOT NULL CHECK (age >= 18 AND age <= 120),
  city TEXT NOT NULL,
  energy_traits TEXT[] NOT NULL DEFAULT '{}',
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_city ON users(city);

-- Moods table
CREATE TABLE IF NOT EXISTS moods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  vibe TEXT NOT NULL CHECK (vibe IN ('flirty', 'bored', 'curious', 'venting', 'playful', 'calm', 'chaotic')),
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  moderated BOOLEAN DEFAULT FALSE,
  flagged BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_moods_user_id ON moods(user_id);
CREATE INDEX idx_moods_expires_at ON moods(expires_at);
CREATE INDEX idx_moods_vibe ON moods(vibe);
CREATE INDEX idx_moods_created_at ON moods(created_at DESC);

-- Resonates table (one-way interest)
CREATE TABLE IF NOT EXISTS resonates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_mood UUID NOT NULL REFERENCES moods(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(from_user, to_mood)
);

CREATE INDEX idx_resonates_from_user ON resonates(from_user);
CREATE INDEX idx_resonates_to_mood ON resonates(to_mood);

-- Matches table (mutual connection)
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  extended_by_a BOOLEAN DEFAULT FALSE,
  extended_by_b BOOLEAN DEFAULT FALSE,
  UNIQUE(user_a, user_b)
);

CREATE INDEX idx_matches_user_a ON matches(user_a);
CREATE INDEX idx_matches_user_b ON matches(user_b);
CREATE INDEX idx_matches_expires_at ON matches(expires_at);

-- Messages table (DMs)
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_messages_match_id ON messages(match_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);

-- Moderation flags table
CREATE TABLE IF NOT EXISTS moderation_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type TEXT NOT NULL CHECK (content_type IN ('mood', 'message')),
  content_id UUID NOT NULL,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('warning', 'block')),
  created_at TIMESTAMP DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_moderation_flags_created_at ON moderation_flags(created_at DESC);
CREATE INDEX idx_moderation_flags_content ON moderation_flags(content_type, content_id);
