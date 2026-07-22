import { NextRequest } from 'next/server';
import { authenticateRequest, successResponse } from '@/lib/utils';
import { queryOne } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const user = await queryOne('SELECT id, first_name, age, city, energy_traits, email, created_at, updated_at FROM users WHERE id = $1', [payload.id]);

    if (!user) {
      return successResponse({ error: 'User not found' }, 404);
    }

    return successResponse(user);
  } catch (error: any) {
    return successResponse({ error: error.message }, 401);
  }
}
