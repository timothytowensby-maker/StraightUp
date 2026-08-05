import { NextRequest } from 'next/server';
import { query, queryOne } from '@/lib/db';
import { authenticateRequest, successResponse, errorResponse, handleApiError } from '@/lib/utils';
import { updateMatchSchema, validateRequestBody } from '@/lib/validation';

export async function GET(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);
    const searchParams = new URL(req.url).searchParams;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = Math.max(0, parseInt(searchParams.get('offset') || '0', 10));

    const matches = await query(
      `SELECT m.id, m.user_a, m.user_b, m.created_at, m.expires_at, m.extended_by_a, m.extended_by_b,
              CASE WHEN m.user_a = $1 THEN u2.first_name ELSE u1.first_name END as matched_user_name,
              CASE WHEN m.user_a = $1 THEN u2.age ELSE u1.age END as matched_user_age,
              CASE WHEN m.user_a = $1 THEN u2.city ELSE u1.city END as matched_user_city,
              CASE WHEN m.user_a = $1 THEN u2.energy_traits ELSE u1.energy_traits END as matched_user_traits,
              CASE WHEN m.user_a = $1 THEN m.user_b ELSE m.user_a END as matched_user_id
       FROM matches m
       LEFT JOIN users u1 ON m.user_a = u1.id
       LEFT JOIN users u2 ON m.user_b = u2.id
       WHERE (m.user_a = $1 OR m.user_b = $1) AND m.expires_at > NOW()
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [payload.id, limit, offset]
    );

    return successResponse({ matches, count: matches.length, limit, offset, hasMore: matches.length === limit });
  } catch (error: any) {
    return handleApiError(error, 'Get matches error');
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);

    const { data: body, error: validationError } = await validateRequestBody(req, updateMatchSchema);
    if (validationError) {
      return errorResponse(`Validation error: ${validationError}`, 400);
    }

    const { match_id, extend } = body!;

    // Verify user is part of match
    const match = await queryOne(
      'SELECT * FROM matches WHERE id = $1 AND (user_a = $2 OR user_b = $2)',
      [match_id, payload.id]
    );

    if (!match) {
      return errorResponse('Match not found', 404);
    }

    if (extend) {
      // Extend match expiration - use explicit column names to avoid SQL injection
      if (match.user_a === payload.id) {
        await query(
          `UPDATE matches SET extended_by_a = TRUE WHERE id = $1`,
          [match_id]
        );
      } else {
        await query(
          `UPDATE matches SET extended_by_b = TRUE WHERE id = $1`,
          [match_id]
        );
      }
    }

    return successResponse({ message: 'Match updated' });
  } catch (error: any) {
    return handleApiError(error, 'Update match error');
  }
}
