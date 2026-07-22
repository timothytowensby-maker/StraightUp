import { NextRequest } from 'next/server';
import { queryOne } from '@/lib/db';
import { comparePassword, generateToken } from '@/lib/auth';
import { successResponse, errorResponse, validateEmail, handleApiError } from '@/lib/utils';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return errorResponse('Email and password required', 400);
    }

    if (!validateEmail(email)) {
      return errorResponse('Invalid email format', 400);
    }

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
