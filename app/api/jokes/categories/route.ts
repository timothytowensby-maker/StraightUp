import { NextRequest } from 'next/server';
import { authenticateRequest, handleApiError, successResponse } from '@/lib/utils';
import { listJokeCategories } from '@/lib/joke-service';

export async function GET(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const categories = await listJokeCategories(payload.id);
    return successResponse(categories);
  } catch (error: any) {
    return handleApiError(error, 'Get joke categories error');
  }
}
