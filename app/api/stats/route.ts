import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { authenticateRequest, successResponse, handleApiError } from '@/lib/utils';

export async function GET(req: NextRequest) {
  try {
    const payload = authenticateRequest(req);

    // Get stats for admin/user dashboard
    const stats = await query(
      `SELECT
        (SELECT COUNT(*) FROM moods WHERE user_id = $1) as my_moods,
        (SELECT COUNT(*) FROM resonates WHERE from_user = $1) as resonates_sent,
        (SELECT COUNT(*) FROM resonates WHERE to_mood IN (SELECT id FROM moods WHERE user_id = $1)) as resonates_received,
        (SELECT COUNT(*) FROM matches WHERE user_a = $1 OR user_b = $1) as active_matches`,
      [payload.id]
    );

    return successResponse(stats[0] || {});
  } catch (error: any) {
    return handleApiError(error, 'Get stats error');
  }
}
