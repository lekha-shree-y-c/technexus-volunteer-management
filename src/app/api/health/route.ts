import { NextResponse } from 'next/server';

/**
 * GET /api/health
 * Lightweight health check for uptime monitoring.
 */
export async function GET() {
  return new NextResponse('OK', { status: 200 });
}
