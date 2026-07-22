import { NextRequest } from 'next/server';
import { authenticateRequest, errorResponse, getErrorMessage, handleApiError, successResponse } from '@/lib/utils';
import { getRandomJokeForUser, validateCategory } from '@/lib/joke-service';

export async function GET(req: NextRequest, { params }: { params: { category: string } }) {
  try {
    const payload = authenticateRequest(req);
    const category = validateCategory(params.category);

    const result = await getRandomJokeForUser(payload.id, category);
    return successResponse(result);
  } catch (error: unknown) {
    const message = getErrorMessage(error, 'Get joke by category error');
    if (message === 'Invalid joke category') {
      return errorResponse(message, 400);
    }
    return handleApiError(error, 'Get joke by category error');
  }
}
