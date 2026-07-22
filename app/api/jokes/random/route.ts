import { NextRequest } from 'next/server';
import { authenticateRequest, errorResponse, getErrorMessage, handleApiError, successResponse } from '@/lib/utils';
import { getRandomJokeForUser, validateCategory } from '@/lib/joke-service';

export async function GET(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const searchParams = new URL(req.url).searchParams;
    const rawCategory = searchParams.get('category');
    const category = rawCategory ? validateCategory(rawCategory) : null;

    const result = await getRandomJokeForUser(payload.id, category);
    return successResponse(result);
  } catch (error: unknown) {
    const message = getErrorMessage(error, 'Get random joke error');
    if (message === 'Invalid joke category') {
      return errorResponse(message, 400);
    }
    if (message.includes('Unable to load a joke')) {
      return errorResponse(message, 503);
    }
    return handleApiError(error, 'Get random joke error');
  }
}
