import { PartySocket } from "partysocket";
import {
  INTERP_DELAY_MS,
  type ClientMessage,
  type PlayerState,
  type ServerMessage,
  type Snapshot,
} from "@royale/shared";

interface Buffered {
  receivedAt: number;
  snapshot: Snapshot;
}

export class PartyClient {
  private socket: PartySocket;
  private buffer: Buffered[] = [];
  private inputSeq = 0;
  myId: string | null = null;

  constructor(host: string, room = "main") {
    this.socket = new PartySocket({ host, room });
    this.socket.addEventListener("message", (e) => this.onMessage(e.data as string));
  }

  private onMessage(data: string) {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(data);
    } catch {
      return;
    }
    if (msg.type === "hello") {
      this.myId = msg.id;
    } else if (msg.type === "snapshot") {
      this.buffer.push({ receivedAt: performance.now(), snapshot: msg.snapshot });
      const cutoff = performance.now() - 1000;
      while (this.buffer.length > 2 && this.buffer[0].receivedAt < cutoff) {
        this.buffer.shift();
      }
    }
  }

  sendInput(dx: number, dz: number) {
    if (this.socket.readyState !== WebSocket.OPEN) return;
    const msg: ClientMessage = { type: "input", seq: ++this.inputSeq, dx, dz };
    this.socket.send(JSON.stringify(msg));
  }

  getInterpolatedState(nowMs: number): { players: PlayerState[] } {
    if (this.buffer.length === 0) return { players: [] };
    const renderTime = nowMs - INTERP_DELAY_MS;

    let prev: Buffered | null = null;
    let next: Buffered | null = null;
    for (let i = 0; i < this.buffer.length; i++) {
      const b = this.buffer[i];
      if (b.receivedAt <= renderTime) {
        prev = b;
        next = this.buffer[i + 1] ?? null;
      } else if (!prev) {
        next = b;
        break;
      } else {
        break;
      }
    }

    if (!prev) return { players: next?.snapshot.players ?? [] };
    if (!next) return { players: prev.snapshot.players };

    const span = next.receivedAt - prev.receivedAt;
    const t = span > 0 ? Math.max(0, Math.min(1, (renderTime - prev.receivedAt) / span)) : 0;

    const prevById = new Map(prev.snapshot.players.map((p) => [p.id, p]));
    return {
      players: next.snapshot.players.map((np) => {
        const pp = prevById.get(np.id);
        if (!pp) return np;
        return {
          id: np.id,
          x: pp.x + (np.x - pp.x) * t,
          z: pp.z + (np.z - pp.z) * t,
          color: np.color,
        };
      }),
    };
  }
}
