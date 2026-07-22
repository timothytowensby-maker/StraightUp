import { NextRequest } from 'next/server';
import { v4 as uuid } from 'uuid';
import { query } from '@/lib/db';
import { cacheProvidedJoke } from '@/lib/joke-service';
import { JokePayload } from '@/lib/joke-utils';
import { authenticateRequest, errorResponse, handleApiError, successResponse } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const body = await req.json();
    const joke = body?.joke as JokePayload | undefined;

    if (!joke?.external_id || !joke?.category) {
      return errorResponse('joke.external_id and joke.category are required', 400);
    }

    await cacheProvidedJoke(joke);

    await query(
      `INSERT INTO joke_reactions (id, user_id, joke_external_id, category, reaction)
       VALUES ($1, $2, $3, $4, 'favorite')
       ON CONFLICT (user_id, joke_external_id, reaction) DO NOTHING`,
      [uuid(), payload.id, joke.external_id, joke.category]
    );

    return successResponse({ message: 'Joke saved to favorites' }, 201);
  } catch (error: any) {
    return handleApiError(error, 'Favorite joke error');
  }
}
