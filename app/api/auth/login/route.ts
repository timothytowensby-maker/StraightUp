import { NextRequest } from 'next/server';
import { queryOne } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';
import { successResponse, errorResponse, handleApiError } from '@/lib/utils';
import { loginLimiter, getClientIp } from '@/lib/ratelimit';
import { loginSchema, validateRequestBody } from '@/lib/validation';

export async function POST(req: NextRequest) {
  try {
    // Rate limit check
    const ip = getClientIp(req);
    const { success, reset } = await loginLimiter.limit(ip);
    if (!success) {
      return errorResponse(
        `Too many login attempts. Try again in ${Math.ceil((reset - Date.now()) / 1000)} seconds`,
        429
      );
    }

    // Validate with Zod
    const { data: body, error: validationError } = await validateRequestBody(req, loginSchema);
    if (validationError) {
      return errorResponse(`Validation error: ${validationError}`, 400);
    }

    const { email, password } = body!;

    // Find user by email
    const user = await queryOne('SELECT * FROM users WHERE email = $1', [email]);
    if (!user) {
      return errorResponse('Invalid email or password', 401);
    }

    // Verify password
    const isValid = comparePassword(password, user.password_hash);
    if (!isValid) {
      return errorResponse('Invalid email or password', 401);
    }

    // Generate token
    const token = generateToken(user);
    const { password_hash, ...userWithoutPassword } = user;

    return successResponse({ token, user: userWithoutPassword });
  } catch (error) {
    return handleApiError(error, 'Login error');
  }
}
