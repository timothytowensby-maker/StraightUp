# StraightUp

Vibe-based connection app built with Next.js, PostgreSQL, and OpenAI.

## Features

- **Express Your Vibe**: Post moods that expire in 24 hours
- **Find Matches**: Resonate with people who share your energy
- **Direct Messaging**: Message matches securely
- **AI-Powered**: Automatic vibe classification & content moderation
- **Real-Time**: Live-updating feed and messages

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- OpenAI API key

### Setup

```bash
# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Run migrations
npm run db:migrate

# Seed demo data (optional)
npm run db:seed

# Start development server
npm run dev
```

Visit `http://localhost:3000` to get started.

## API Routes

### Auth
- `POST /api/auth/signup` - Register
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Moods
- `POST /api/moods` - Create mood
- `GET /api/moods` - Get mood feed

### Interactions
- `POST /api/resonates` - Resonate with mood
- `GET /api/matches` - Get active matches
- `POST /api/messages` - Send message
- `GET /api/messages` - Get conversation

### Jokes
- `GET /api/jokes/random` - Get a random joke (vibe-aware category + cache fallback)
- `GET /api/jokes/category/:category` - Get a random joke from a specific category
- `GET /api/jokes/categories` - List categories and vibe-based suggestions
- `POST /api/jokes/favorite` - Save a joke as favorite
- `GET /api/jokes/favorites` - Get favorite jokes
- `POST /api/jokes/reaction` - Like/dislike a joke
- `GET /api/jokes/trending` - Get trending jokes across users

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL
- **Auth**: JWT
- **AI**: OpenAI GPT-3.5

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Auth pages
│   └── app/               # Protected pages
├── components/            # Reusable React components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities & helpers
├── database/              # SQL schema
├── scripts/               # Migration & seeding scripts
└── package.json
```

## Development

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Database
npm run db:migrate
npm run db:seed
```

## Environment Variables

See `.env.example` for all required variables:

- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection
- `JWT_SECRET` - JWT signing key
- `OPENAI_API_KEY` - OpenAI API key
- `NEXT_PUBLIC_APP_URL` - Frontend URL

## License

MIT
