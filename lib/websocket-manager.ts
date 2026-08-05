/**
 * In-memory WebSocket manager for real-time location broadcasting.
 *
 * This module maintains a registry of connected clients and provides
 * grid-based spatial partitioning to efficiently broadcast location updates
 * only to clients within overlapping spatial cells.
 */

// Use a minimal interface so this module stays compatible with both the `ws`
// WebSocket class (server-side) and the browser WebSocket API without
// importing the `ws` package at the module level (which breaks Next.js builds).
interface WsLike {
  readyState: number;
  send(data: string): void;
  terminate(): void;
}
export type LocationUpdatePayload = {
  user_id: string;
  first_name: string;
  latitude: number;
  longitude: number;
  vibe: string | null;
  latest_mood: string | null;
};

type ConnectedClient = {
  ws: WsLike;
  user_id: string;
  first_name: string;
  latitude: number | null;
  longitude: number | null;
  radius_km: number;
  last_heartbeat: number;
  grid_cells: Set<string>;
};

// Grid cell size in degrees — approximately 1.1–1.2 km per cell at mid-latitudes.
const GRID_CELL_SIZE_DEG = 0.01;
const DEFAULT_RADIUS_KM = 25;
const STALE_CONNECTION_MS = 60_000;
const HEARTBEAT_INTERVAL_MS = 30_000;

// The global client registry. Keyed by user_id so a user can only have one active connection.
const clients = new Map<string, ConnectedClient>();

/** Convert a lat/lng coordinate to a grid cell key string. */
function toGridCell(lat: number, lng: number): string {
  const cellLat = Math.floor(lat / GRID_CELL_SIZE_DEG);
  const cellLng = Math.floor(lng / GRID_CELL_SIZE_DEG);
  return `${cellLat}:${cellLng}`;
}

/**
 * Return the set of grid cell keys covered by a circle centred at (lat, lng)
 * with the given radius. Uses a simple bounding-box scan — fast enough for
 * the radii in use here (≤100 km).
 */
function getCoveredCells(lat: number, lng: number, radius_km: number): Set<string> {
  const cells = new Set<string>();
  // Degrees per km approximations (conservative — slightly overshoots near equator).
  const latDelta = radius_km / 110.574;
  const lngDelta = radius_km / (111.32 * Math.max(Math.cos((lat * Math.PI) / 180), 0.01));

  const latSteps = Math.ceil((latDelta * 2) / GRID_CELL_SIZE_DEG) + 1;
  const lngSteps = Math.ceil((lngDelta * 2) / GRID_CELL_SIZE_DEG) + 1;
  const latStart = lat - latDelta;
  const lngStart = lng - lngDelta;

  for (let i = 0; i <= latSteps; i++) {
    for (let j = 0; j <= lngSteps; j++) {
      cells.add(toGridCell(latStart + i * GRID_CELL_SIZE_DEG, lngStart + j * GRID_CELL_SIZE_DEG));
    }
  }

  return cells;
}

/** Haversine distance in km between two lat/lng points. */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function safeSend(ws: WsLike, data: object) {
  try {
    if (ws.readyState === 1 /* OPEN */) {
      ws.send(JSON.stringify(data));
    }
  } catch {
    // Ignore send errors — the connection will be cleaned up on close.
  }
}

/** Register a new WebSocket client in the registry. */
export function registerClient(
  ws: WsLike,
  user_id: string,
  first_name: string,
  latitude: number | null,
  longitude: number | null,
  radius_km = DEFAULT_RADIUS_KM
) {
  const grid_cells =
    latitude != null && longitude != null
      ? getCoveredCells(latitude, longitude, radius_km)
      : new Set<string>();

  const client: ConnectedClient = {
    ws,
    user_id,
    first_name,
    latitude,
    longitude,
    radius_km,
    last_heartbeat: Date.now(),
    grid_cells,
  };

  clients.set(user_id, client);

  // Notify nearby clients that this user came online.
  broadcastToNearby(user_id, latitude, longitude, {
    type: 'user_online',
    user_id,
    first_name,
    latitude,
    longitude,
  });
}

/** Remove a client from the registry and notify nearby clients. */
export function unregisterClient(user_id: string) {
  const client = clients.get(user_id);
  if (!client) return;

  const { latitude, longitude, first_name } = client;
  clients.delete(user_id);

  broadcastToNearby(user_id, latitude, longitude, {
    type: 'user_offline',
    user_id,
    first_name,
  });
}

/** Update last heartbeat timestamp for a client. */
export function touchHeartbeat(user_id: string) {
  const client = clients.get(user_id);
  if (client) {
    client.last_heartbeat = Date.now();
  }
}

/**
 * Broadcast a location update to all clients whose covered cells overlap with
 * the broadcaster's cells. Only sends to clients for whom the broadcaster is
 * within their configured radius.
 */
export function broadcastLocationUpdate(payload: LocationUpdatePayload) {
  const { user_id, latitude, longitude, first_name, vibe, latest_mood } = payload;

  if (latitude == null || longitude == null) return;

  const senderCells = getCoveredCells(latitude, longitude, DEFAULT_RADIUS_KM);

  for (const [clientId, client] of clients) {
    if (clientId === user_id) continue;
    if (client.latitude == null || client.longitude == null) continue;

    // Quick cell-overlap check before the more expensive distance calculation.
    let overlaps = false;
    for (const cell of senderCells) {
      if (client.grid_cells.has(cell)) {
        overlaps = true;
        break;
      }
    }
    if (!overlaps) continue;

    // Precise distance check.
    const dist = haversineKm(latitude, longitude, client.latitude, client.longitude);
    if (dist > client.radius_km) continue;

    safeSend(client.ws, {
      type: 'location_update',
      user_id,
      first_name,
      latitude,
      longitude,
      vibe,
      latest_mood,
      distance_km: Math.round(dist * 10) / 10,
    });
  }

  // Update the sender's own entry if they are connected.
  const senderClient = clients.get(user_id);
  if (senderClient) {
    senderClient.latitude = latitude;
    senderClient.longitude = longitude;
    senderClient.grid_cells = getCoveredCells(latitude, longitude, senderClient.radius_km);
  }
}

/** Send a message to nearby clients (excluding the originator). */
function broadcastToNearby(
  originUserId: string,
  lat: number | null,
  lng: number | null,
  data: object
) {
  if (lat == null || lng == null) return;

  for (const [clientId, client] of clients) {
    if (clientId === originUserId) continue;
    if (client.latitude == null || client.longitude == null) continue;

    const dist = haversineKm(lat, lng, client.latitude, client.longitude);
    if (dist <= client.radius_km) {
      safeSend(client.ws, data);
    }
  }
}

/** Periodically clean up stale connections (called from WebSocket server setup). */
export function startHeartbeatCleaner() {
  setInterval(() => {
    const now = Date.now();
    for (const [userId, client] of clients) {
      if (now - client.last_heartbeat > STALE_CONNECTION_MS) {
        client.ws.terminate();
        clients.delete(userId);
        broadcastToNearby(userId, client.latitude, client.longitude, {
          type: 'user_offline',
          user_id: userId,
          first_name: client.first_name,
        });
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
}
