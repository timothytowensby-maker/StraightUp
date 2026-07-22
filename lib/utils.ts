import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader } from './auth';

export function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export function successResponse(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: getCorsHeaders(),
  });
}

export function errorResponse(message: string, status = 400) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: getCorsHeaders(),
    }
  );
}

export function authenticateRequest(req: NextRequest) {
  const authHeader = req.headers.get('Authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    throw new Error('No authorization token provided');
  }

  const payload = verifyToken(token);
  if (!payload) {
    throw new Error('Invalid or expired token');
  }

  return payload;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 6;
}

export async function handleApiError(error: unknown, defaultMessage: string) {
  if (error instanceof Error) {
    console.error(defaultMessage, error.message);
    return errorResponse(error.message, 500);
  }
  console.error(defaultMessage, error);
  return errorResponse(defaultMessage, 500);
}

export function getErrorMessage(error: unknown, fallback = 'Unexpected error') {
  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}
