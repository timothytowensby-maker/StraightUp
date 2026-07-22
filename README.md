# StraightUp 🎯

A vibe-based social connection app for straight men & women who want low-pressure, authentic interaction.

**Core Promise:** "Show up as a mood, not a résumé."

---

## 🎯 MVP Features

- **Mood Posting**: Post anonymous moods (max 180 chars) that auto-expire in 24 hours
- **Vibe Matching**: AI-powered compatibility matching based on mood + energy
- **Resonates**: One-tap vibe matching that unlocks DMs on mutual match
- **Minimalist DM**: Text-only messaging with 48-hour auto-lock
- **AI Moderation**: Safety-first content filtering
- **Lightweight Profiles**: Name, age, city, energy traits (no photos in MVP)

---

## 🛠 Tech Stack

- **Frontend**: Next.js 14+ (App Router), TailwindCSS, Vercel
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL (Supabase/Neon)
- **Cache**: Redis (real-time feed + rate limiting)
- **Auth**: JWT + email/password
- **AI Services**: Mood classification, matching, moderation, prompt generation

---

## 📁 Project Structure

```
StraightUp/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/          # Authentication endpoints
│   │   ├── moods/         # Mood CRUD
│   │   ├── matches/       # Matching engine
│   │   ├── messages/      # DM system
│   │   └── moderation/    # Content moderation
│   ├── (auth)/            # Auth pages
│   ├── (app)/             # Main app pages
│   └── layout.tsx         # Root layout
├── lib/
│   ├── db.ts              # Database client
│   ├── auth.ts            # JWT utilities
│   ├── ai.ts              # AI service integration
│   └── types.ts           # TypeScript types
├── components/            # Reusable React components
├── database/
│   └── schema.sql         # PostgreSQL schema
├── .env.local             # Environment variables (gitignored)
├── package.json
└── tailwind.config.ts
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase or Neon recommended)
- Redis (optional for local dev, required for production)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/timothytowensby-maker/StraightUp.git
cd StraightUp

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local

# 4. Run database migrations
npm run db:migrate

# 5. Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

---

## 📋 Database Schema

### Users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  first_name TEXT NOT NULL,
  age INT NOT NULL,
  city TEXT NOT NULL,
  energy_traits TEXT[] NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Moods
```sql
CREATE TABLE moods (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  text TEXT NOT NULL,
  vibe TEXT NOT NULL,
  tags TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
```

### Resonates
```sql
CREATE TABLE resonates (
  id UUID PRIMARY KEY,
  from_user UUID REFERENCES users(id),
  to_mood UUID REFERENCES moods(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Matches
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY,
  user_a UUID REFERENCES users(id),
  user_b UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
```

### Messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  match_id UUID REFERENCES matches(id),
  sender_id UUID REFERENCES users(id),
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🔄 User Flow

1. **Onboarding**: Sign up → Enter name, age, city → Choose 3 energy traits → Post first mood
2. **Main Loop**: Post mood → See vibe feed → Resonate → Match → DM → Repeat
3. **Expiration**: Moods auto-delete after 24h, matches expire after 48h unless both extend

---

## 🤖 AI Logic

### Mood Classification
Input: mood text → Output: `flirty | bored | curious | venting | playful | calm | chaotic`

### Matching Algorithm
```
Score = (vibe_compatibility × 0.4) + (recency × 0.3) + (mutual_tags × 0.2) + (randomness × 0.1)
```

### Moderation
Rejects: explicit content, hate speech, threats, doxxing, spam, bot behavior

---

## 📅 MVP Build Timeline

- **Week 1**: Auth, profiles, mood posting, feed, expiration
- **Week 2**: Vibe classifier, matching, resonates, DM system
- **Week 3**: Moderation, prompt generator, UI polish
- **Week 4**: Beta testing, fixes, launch

---

## 📝 Environment Variables

Create `.env.local`:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/straightup

# Redis
REDIS_URL=redis://localhost:6379

# Auth
JWT_SECRET=your-super-secret-jwt-key-here

# AI Services (OpenAI, etc.)
OPENAI_API_KEY=sk-...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

---

## 🔒 Security

- JWT-based authentication
- Password hashing (bcrypt)
- AI moderation on all user content
- Rate limiting on API endpoints
- Anonymous mood posting (user ID not exposed)
- Auto-expiring messages and matches

---

## 🎨 Design System

- **Colors**: Minimalist, vibe-driven (TailwindCSS)
- **Typography**: Clean, readable
- **UX**: Mobile-first, low-friction interactions

---

## 🐛 Contributing

This is an MVP. Issues and PRs welcome.

---

## 📄 License

MIT

---

**Ready to vibe?** Let's build. 🚀
