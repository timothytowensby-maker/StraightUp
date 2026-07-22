import { query, queryOne } from './db';
import { Vibe } from './types';
import { JOKE_CACHE_TTL_MINUTES, JokePayload, detectJokeType, formatJoke, getSuggestionsByVibe } from './joke-utils';

const JOKE_API_BASE = 'https://v2.jokeapi.dev/joke';

export const JOKE_CATEGORIES = ['Any', 'Programming', 'Misc', 'Pun', 'Spooky', 'Christmas', 'Dark'] as const;

type JokeApiResponse = {
  error?: boolean;
  id?: number;
  category?: string;
  type?: 'single' | 'twopart';
  joke?: string;
  setup?: string;
  delivery?: string;
  safe?: boolean;
  message?: string;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeCategory(category?: string | null) {
  if (!category) return 'Any';
  const found = JOKE_CATEGORIES.find((item) => item.toLowerCase() === category.toLowerCase());
  return found || 'Any';
}

function isKnownCategory(category?: string | null) {
  if (!category) return true;
  return JOKE_CATEGORIES.some((item) => item.toLowerCase() === category.toLowerCase());
}

function shouldUseSafeMode(vibe?: Vibe | null): boolean {
  return vibe === 'calm' || vibe === 'curious' || vibe === 'flirty';
}

async function fetchWithRetry(url: string, maxRetries = 3): Promise<JokeApiResponse> {
  let attempt = 0;
  let waitMs = 250;

  while (attempt < maxRetries) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`JokeAPI request failed: ${response.status}`);
      }

      const payload = (await response.json()) as JokeApiResponse;
      if (payload.error) {
        throw new Error(payload.message || 'JokeAPI returned an error');
      }

      return payload;
    } catch (error) {
      attempt += 1;
      if (attempt >= maxRetries) {
        throw error;
      }
      await delay(waitMs);
      waitMs *= 2;
    }
  }

  throw new Error('Unable to fetch joke');
}

function toJokePayload(payload: JokeApiResponse, requestedCategory: string): JokePayload {
  if (typeof payload.id !== 'number') {
    throw new Error('JokeAPI returned an invalid joke id');
  }

  const category = normalizeCategory(payload.category || requestedCategory);
  const joke: JokePayload = {
    external_id: String(payload.id),
    category,
    type: payload.type === 'twopart' ? 'twopart' : 'single',
    setup: formatJoke(payload.setup || null) || null,
    delivery: formatJoke(payload.delivery || null) || null,
    joke: formatJoke(payload.joke || null) || null,
    safe: payload.safe === true,
    source: 'jokeapi',
  };

  joke.type = detectJokeType(joke);
  return joke;
}

async function saveJokeToCache(joke: JokePayload) {
  await query(
    `INSERT INTO jokes_cache (external_id, category, joke_type, setup, delivery, joke, safe, source, fetched_at, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW() + ($9 * INTERVAL '1 minute'))
     ON CONFLICT (external_id)
     DO UPDATE SET
       category = EXCLUDED.category,
       joke_type = EXCLUDED.joke_type,
       setup = EXCLUDED.setup,
       delivery = EXCLUDED.delivery,
       joke = EXCLUDED.joke,
       safe = EXCLUDED.safe,
       source = EXCLUDED.source,
       fetched_at = NOW(),
       expires_at = NOW() + ($9 * INTERVAL '1 minute')`,
    [joke.external_id, joke.category, joke.type, joke.setup, joke.delivery, joke.joke, joke.safe, joke.source, JOKE_CACHE_TTL_MINUTES]
  );
}

async function getCachedJoke(category: string, safeOnly: boolean): Promise<JokePayload | null> {
  const rows = await query(
    `SELECT external_id, category, joke_type as type, setup, delivery, joke, safe, source
     FROM jokes_cache
     WHERE expires_at > NOW()
       AND ($1 = 'Any' OR category = $1)
       AND ($2::boolean = FALSE OR safe = TRUE)
     ORDER BY RANDOM()
     LIMIT 1`,
    [category, safeOnly]
  );

  return rows[0] || null;
}

async function getUserVibe(userId: string): Promise<Vibe | null> {
  const recentMood = await queryOne(
    `SELECT vibe
     FROM moods
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );

  return (recentMood?.vibe as Vibe | undefined) || null;
}

function pickCategory(inputCategory: string | null, vibe: Vibe | null) {
  if (inputCategory) {
    return normalizeCategory(inputCategory);
  }

  const suggestions = getSuggestionsByVibe(vibe);
  const randomIndex = Math.floor(Math.random() * suggestions.length);
  return normalizeCategory(suggestions[randomIndex]);
}

async function recordPreference(userId: string, category: string) {
  await query(
    `INSERT INTO user_joke_preferences (user_id, category)
     VALUES ($1, $2)
     ON CONFLICT (user_id, category) DO NOTHING`,
    [userId, category]
  );
}

export async function getRandomJokeForUser(userId: string, category?: string | null) {
  const vibe = await getUserVibe(userId);
  const selectedCategory = pickCategory(category || null, vibe);
  const safeOnly = shouldUseSafeMode(vibe);

  const categorySegment = selectedCategory === 'Any' ? 'Any' : encodeURIComponent(selectedCategory);
  const searchParams = new URLSearchParams();
  searchParams.set('type', 'single,twopart');
  if (safeOnly) {
    searchParams.set('safe-mode', 'true');
  }

  const url = `${JOKE_API_BASE}/${categorySegment}?${searchParams.toString()}`;

  try {
    const apiJoke = await fetchWithRetry(url, 3);
    const joke = toJokePayload(apiJoke, selectedCategory);
    await saveJokeToCache(joke);
    await recordPreference(userId, joke.category);

    return {
      joke,
      vibe,
      suggested_categories: getSuggestionsByVibe(vibe),
      from_cache: false,
    };
  } catch {
    const cachedJoke = await getCachedJoke(selectedCategory, safeOnly);
    if (!cachedJoke) {
      throw new Error('Unable to load a joke right now. Please try again shortly.');
    }

    await recordPreference(userId, cachedJoke.category);

    return {
      joke: cachedJoke,
      vibe,
      suggested_categories: getSuggestionsByVibe(vibe),
      from_cache: true,
    };
  }
}

export async function cacheProvidedJoke(joke: JokePayload) {
  await saveJokeToCache(joke);
}

export async function listJokeCategories(userId: string) {
  const vibe = await getUserVibe(userId);
  const suggestions = getSuggestionsByVibe(vibe);

  return {
    vibe,
    categories: JOKE_CATEGORIES.map((category) => ({
      name: category,
      suggested: suggestions.includes(category),
    })),
  };
}

export function validateCategory(category: string) {
  if (!isKnownCategory(category)) {
    throw new Error('Invalid joke category');
  }

  return normalizeCategory(category);
}
