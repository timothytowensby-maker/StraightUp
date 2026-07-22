import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/utils';

export async function GET(_req: NextRequest) {
  return successResponse({
    status: 'ok',
    message: 'StraightUp API is running',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
}
