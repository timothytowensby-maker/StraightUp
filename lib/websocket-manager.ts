import { calculateDistance } from '@/lib/geospatial';

export interface ConnectedClient {
  userId: string;
  latitude: number;
  longitude: number;
  radiusKm: number;
  lastSeen: number;
}

type BroadcastPayload = {
  userId: string;
  latitude: number;
  longitude: number;
  first_name?: string;
};

// Geohash-style grid partitioning: divide the world into ~25 km cells.
const CELL_SIZE_DEG = 0.25; // roughly 25 km at equator

function getCells(lat: number, lng: number, radiusKm: number): string[] {
  const degPerKm = 1 / 111; // approx degrees per km
  const latSteps = Math.ceil((radiusKm * degPerKm) / CELL_SIZE_DEG) + 1;
  const lngSteps = Math.ceil((radiusKm * degPerKm) / CELL_SIZE_DEG) + 1;
  const cells = new Set<string>();
  for (let dy = -latSteps; dy <= latSteps; dy++) {
    for (let dx = -lngSteps; dx <= lngSteps; dx++) {
      const cellLat = Math.floor((lat + dy * CELL_SIZE_DEG) / CELL_SIZE_DEG);
      const cellLng = Math.floor((lng + dx * CELL_SIZE_DEG) / CELL_SIZE_DEG);
      cells.add(`${cellLat}:${cellLng}`);
    }
  }
  return Array.from(cells);
}

function cellsForPoint(lat: number, lng: number): string {
  const cellLat = Math.floor(lat / CELL_SIZE_DEG);
  const cellLng = Math.floor(lng / CELL_SIZE_DEG);
  return `${cellLat}:${cellLng}`;
}

export class WebSocketManager {
  private clients = new Map<
    string,
    ConnectedClient & { send: (data: string) => void }
  >();
  private cellIndex = new Map<string, Set<string>>(); // cell -> Set<userId>
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.heartbeatInterval = setInterval(() => this.pruneStale(), 60_000);
  }

  register(
    userId: string,
    send: (data: string) => void,
    location: { latitude: number; longitude: number },
    radiusKm: number
  ) {
    this.unregister(userId);

    const client: ConnectedClient & { send: (data: string) => void } = {
      userId,
      latitude: location.latitude,
      longitude: location.longitude,
      radiusKm,
      lastSeen: Date.now(),
      send,
    };

    this.clients.set(userId, client);

    const cell = cellsForPoint(location.latitude, location.longitude);
    if (!this.cellIndex.has(cell)) {
      this.cellIndex.set(cell, new Set());
    }
    this.cellIndex.get(cell)!.add(userId);
  }

  unregister(userId: string) {
    const existing = this.clients.get(userId);
    if (!existing) return;

    const cell = cellsForPoint(existing.latitude, existing.longitude);
    this.cellIndex.get(cell)?.delete(userId);
    this.clients.delete(userId);
  }

  heartbeat(userId: string) {
    const client = this.clients.get(userId);
    if (client) {
      client.lastSeen = Date.now();
    }
  }

  broadcast(payload: BroadcastPayload) {
    const { userId, latitude, longitude } = payload;

    // Find all cells within potential subscriber radii.
    const affectedCells = getCells(latitude, longitude, 50); // max radius ~50 km

    const recipients = new Set<string>();
    for (const cell of affectedCells) {
      const cellUsers = this.cellIndex.get(cell);
      if (!cellUsers) continue;
      for (const cId of cellUsers) {
        recipients.add(cId);
      }
    }

    const message = JSON.stringify({ type: 'location_update', data: payload });

    for (const recipientId of recipients) {
      if (recipientId === userId) continue;
      const client = this.clients.get(recipientId);
      if (!client) continue;

      const dist = calculateDistance(
        latitude,
        longitude,
        client.latitude,
        client.longitude
      );

      if (dist <= client.radiusKm) {
        try {
          client.send(message);
        } catch {
          this.unregister(recipientId);
        }
      }
    }
  }

  private pruneStale() {
    const cutoff = Date.now() - 120_000; // 2 min idle = stale
    for (const [userId, client] of this.clients.entries()) {
      if (client.lastSeen < cutoff) {
        this.unregister(userId);
      }
    }
  }

  destroy() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    this.clients.clear();
    this.cellIndex.clear();
  }
}

// Singleton for the Next.js process
declare global {
  // eslint-disable-next-line no-var
  var __wsManager: WebSocketManager | undefined;
}

export function getWebSocketManager(): WebSocketManager {
  if (!global.__wsManager) {
    global.__wsManager = new WebSocketManager();
  }
  return global.__wsManager;
}
