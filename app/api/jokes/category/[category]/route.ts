import { NextRequest } from 'next/server';
import { authenticateRequest, errorResponse, handleApiError, successResponse } from '@/lib/utils';
import { getRandomJokeForUser, validateCategory } from '@/lib/joke-service';

export async function GET(req: NextRequest, { params }: { params: { category: string } }) {
  try {
    const payload = authenticateRequest(req);
    const category = validateCategory(params.category);

    const result = await getRandomJokeForUser(payload.id, category);
    return successResponse(result);
  } catch (error: any) {
    if (error.message === 'Invalid joke category') {
      return errorResponse(error.message, 400);
    }
    return handleApiError(error, 'Get joke by category error');
  }
}
