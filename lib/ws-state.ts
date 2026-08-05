/**
 * In-memory state shared between the WebSocket server and REST API handlers
 * so that location updates via PUT /api/location can broadcast to connected clients.
 *
 * This module intentionally avoids importing any Next.js or Node-specific APIs
 * so it can be imported from both route handlers and the WebSocket server.
 */

import type { WebSocket } from 'ws';

export type ConnectedClient = {
  ws: WebSocket;
  userId: string;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  lastHeartbeat: number;
  firstName: string;
  vibe: string | null;
};

// Singleton map: userId → client.  Only one connection per user is tracked.
const clients = new Map<string, ConnectedClient>();

export function registerClient(userId: string, client: ConnectedClient): void {
  clients.set(userId, client);
}

export function removeClient(userId: string): void {
  clients.delete(userId);
}

export function getClient(userId: string): ConnectedClient | undefined {
  return clients.get(userId);
}

export function getAllClients(): IterableIterator<ConnectedClient> {
  return clients.values();
}

// WGS84 Haversine distance in kilometres between two coordinates.
export function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(a));
}

/**
 * Broadcast a location update to all connected clients whose radius
 * overlaps with the updated user's position.
 */
export function broadcastLocationUpdate(
  updatedUserId: string,
  lat: number,
  lon: number,
  firstName: string,
  vibe: string | null,
  latestMoodText: string | null
): void {
  const message = JSON.stringify({
    type: 'location_update',
    payload: {
      user_id: updatedUserId,
      latitude: lat,
      longitude: lon,
      first_name: firstName,
      vibe,
      latest_mood: latestMoodText,
    },
  });

  for (const client of clients.values()) {
    if (client.userId === updatedUserId) continue;
    if (client.latitude == null || client.longitude == null) continue;

    const distKm = haversineKm(client.latitude, client.longitude, lat, lon);
    if (distKm <= client.radiusKm) {
      try {
        if (client.ws.readyState === 1 /* OPEN */) {
          client.ws.send(message);
        }
      } catch {
        // ignore send errors; stale connections will be reaped by the heartbeat sweep
      }
    }
  }
}

/**
 * Broadcast user_offline to all connected clients who could see this user.
 */
export function broadcastUserOffline(
  offlineUserId: string,
  lat: number | null,
  lon: number | null
): void {
  const message = JSON.stringify({
    type: 'user_offline',
    payload: { user_id: offlineUserId },
  });

  for (const client of clients.values()) {
    if (client.userId === offlineUserId) continue;

    const shouldNotify =
      lat != null &&
      lon != null &&
      client.latitude != null &&
      client.longitude != null &&
      haversineKm(client.latitude, client.longitude, lat, lon) <= client.radiusKm;

    if (shouldNotify) {
      try {
        if (client.ws.readyState === 1 /* OPEN */) {
          client.ws.send(message);
        }
      } catch {
        // ignore
      }
    }
  }
}
