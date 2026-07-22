import { NextRequest } from 'next/server';
import { authenticateRequest, errorResponse, handleApiError, successResponse } from '@/lib/utils';
import { getRandomJokeForUser, validateCategory } from '@/lib/joke-service';

export async function GET(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const searchParams = new URL(req.url).searchParams;
    const rawCategory = searchParams.get('category');
    const category = rawCategory ? validateCategory(rawCategory) : null;

    const result = await getRandomJokeForUser(payload.id, category);
    return successResponse(result);
  } catch (error: any) {
    if (error.message === 'Invalid joke category') {
      return errorResponse(error.message, 400);
    }
    if (error.message?.includes('Unable to load a joke')) {
      return errorResponse(error.message, 503);
    }
    return handleApiError(error, 'Get random joke error');
  }
}
