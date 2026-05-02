import type * as Party from "partykit/server";
import {
  PROTOCOL_VERSION,
  PLAYER_SPEED,
  TICK_MS,
  WORLD_HALF,
  type ClientMessage,
  type PlayerState,
  type ServerMessage,
  type Snapshot,
} from "@royale/shared";

interface ServerPlayer extends PlayerState {
  inputDx: number;
  inputDz: number;
  lastSeq: number;
}

const PALETTE = [
  0xff5555, 0x55ff55, 0x5599ff, 0xffcc44, 0xcc66ff, 0x44dddd, 0xff88aa, 0x88ff88,
];

export default class RoyaleRoom implements Party.Server {
  private players = new Map<string, ServerPlayer>();
  private interval: ReturnType<typeof setInterval> | null = null;
  private lastTick = Date.now();
  private nextColor = 0;

  constructor(readonly room: Party.Room) {}

  onConnect(conn: Party.Connection) {
    const player: ServerPlayer = {
      id: conn.id,
      x: (Math.random() - 0.5) * WORLD_HALF,
      z: (Math.random() - 0.5) * WORLD_HALF,
      color: PALETTE[this.nextColor++ % PALETTE.length],
      inputDx: 0,
      inputDz: 0,
      lastSeq: 0,
    };
    this.players.set(conn.id, player);

    const hello: ServerMessage = {
      type: "hello",
      id: conn.id,
      protocol: PROTOCOL_VERSION,
    };
    conn.send(JSON.stringify(hello));

    this.startTickIfNeeded();
  }

  onMessage(message: string, sender: Party.Connection) {
    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(message);
    } catch {
      return;
    }
    if (parsed.type === "input") {
      const player = this.players.get(sender.id);
      if (!player) return;
      player.inputDx = clamp(parsed.dx, -1, 1);
      player.inputDz = clamp(parsed.dz, -1, 1);
      player.lastSeq = parsed.seq;
    }
  }

  onClose(conn: Party.Connection) {
    this.players.delete(conn.id);
    if (this.players.size === 0 && this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  private startTickIfNeeded() {
    if (this.interval) return;
    this.lastTick = Date.now();
    this.interval = setInterval(() => this.tick(), TICK_MS);
  }

  private tick() {
    const now = Date.now();
    const dt = Math.min(0.25, (now - this.lastTick) / 1000);
    this.lastTick = now;

    for (const player of this.players.values()) {
      let dx = player.inputDx;
      let dz = player.inputDz;
      const mag = Math.hypot(dx, dz);
      if (mag > 1) {
        dx /= mag;
        dz /= mag;
      }
      player.x = clamp(player.x + dx * PLAYER_SPEED * dt, -WORLD_HALF, WORLD_HALF);
      player.z = clamp(player.z + dz * PLAYER_SPEED * dt, -WORLD_HALF, WORLD_HALF);
    }

    const snapshot: Snapshot = {
      t: now,
      players: Array.from(this.players.values(), (p) => ({
        id: p.id,
        x: p.x,
        z: p.z,
        color: p.color,
      })),
    };
    const msg: ServerMessage = { type: "snapshot", snapshot };
    this.room.broadcast(JSON.stringify(msg));
  }
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
