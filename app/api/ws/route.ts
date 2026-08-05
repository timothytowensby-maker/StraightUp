/**
 * GET /api/ws – WebSocket upgrade endpoint.
 *
 * Next.js App Router does not expose the raw Node.js HTTP server, so we use
 * the undocumented `socket` property that is present on the underlying
 * IncomingMessage when the route is hit as an HTTP upgrade request.
 *
 * Authentication: pass the JWT as a `token` query-string parameter.
 */
import { NextRequest, NextResponse } from 'next/server';
import { WebSocketServer, WebSocket } from 'ws';
import { verifyToken } from '@/lib/auth';
import {
  registerClient,
  removeClient,
  getClient,
  broadcastUserOffline,
} from '@/lib/ws-state';
import { queryOne } from '@/lib/db';

const DEFAULT_RADIUS_KM = 25;
const HEARTBEAT_INTERVAL_MS = 30_000;
const STALE_THRESHOLD_MS = 90_000;

// Singleton WebSocket server shared across hot-reloads in development.
const g = globalThis as any;
if (!g._wss) {
  const wss = new WebSocketServer({ noServer: true });

  wss.on('connection', async (ws: WebSocket, req: Request, userId: string) => {
    // Load user info for metadata.
    let firstName = 'User';
    let latitude: number | null = null;
    let longitude: number | null = null;
    let vibe: string | null = null;

    try {
      const user = await queryOne(
        `SELECT u.first_name, u.latitude, u.longitude,
                (SELECT m.vibe FROM moods m WHERE m.user_id = u.id AND m.expires_at > NOW() ORDER BY m.created_at DESC LIMIT 1) AS vibe
         FROM users u WHERE u.id = $1`,
        [userId]
      );
      if (user) {
        firstName = user.first_name;
        latitude = user.latitude ?? null;
        longitude = user.longitude ?? null;
        vibe = user.vibe ?? null;
      }
    } catch {
      // Non-fatal – proceed without user details
    }

    const url = new URL(req.url ?? '/', 'http://localhost');
    const rawRadius = parseFloat(url.searchParams.get('radius_km') || String(DEFAULT_RADIUS_KM));
    const radiusKm = Number.isFinite(rawRadius) && rawRadius > 0
      ? Math.min(rawRadius, 100)
      : DEFAULT_RADIUS_KM;

    registerClient(userId, {
      ws,
      userId,
      latitude,
      longitude,
      radiusKm,
      lastHeartbeat: Date.now(),
      firstName,
      vibe,
    });

    ws.send(JSON.stringify({ type: 'connected', payload: { user_id: userId } }));

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { type?: string };
        if (msg.type === 'ping') {
          const client = getClient(userId);
          if (client) client.lastHeartbeat = Date.now();
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('close', () => {
      const client = getClient(userId);
      broadcastUserOffline(userId, client?.latitude ?? null, client?.longitude ?? null);
      removeClient(userId);
    });

    ws.on('error', () => {
      removeClient(userId);
    });
  });

  // Heartbeat sweep – remove stale connections every 30 s.
  setInterval(() => {
    const now = Date.now();
    for (const client of g._wss.clients as Set<WebSocket & { _userId?: string }>) {
      // Access userId via the registered map rather than attaching to socket.
      void client;
    }
    // Sweep via our own map.
    const { getAllClients, removeClient: remove } = require('@/lib/ws-state');
    for (const client of getAllClients()) {
      if (now - client.lastHeartbeat > STALE_THRESHOLD_MS) {
        try { client.ws.terminate(); } catch { /* ignore */ }
        remove(client.userId);
      }
    }
  }, HEARTBEAT_INTERVAL_MS);

  g._wss = wss;
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 });
  }

  const payload = verifyToken(token);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  // Access the raw socket from Next.js internals.
  const socket = (req as any).socket as (import('net').Socket | undefined);
  if (!socket) {
    return NextResponse.json(
      { error: 'WebSocket upgrade not available in this environment' },
      { status: 426 }
    );
  }

  g._wss.handleUpgrade(req, socket, Buffer.alloc(0), (ws: WebSocket) => {
    g._wss.emit('connection', ws, req, payload.id);
  });

  // Return a response that keeps the connection open (no body sent).
  return new Response(null, { status: 101 }) as any;
}
