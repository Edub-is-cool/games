/**
 * MultiplayerSystem — Networking scaffold for multiplayer RTS
 * ============================================================
 *
 * SERVER TECHNOLOGY OPTIONS (pick one when ready to implement):
 *
 *   1. **WebSocket + Node.js** (recommended for simplicity)
 *      - Use the `ws` package on the server, native WebSocket on the client.
 *      - You control the protocol entirely. Lightweight, no magic.
 *      - Good fit for a lockstep or command-relay architecture.
 *
 *   2. **Colyseus** (https://colyseus.io)
 *      - Purpose-built multiplayer game framework for Node.js.
 *      - Has built-in room/lobby management, state synchronization,
 *        client interpolation helpers, and reconnection handling.
 *      - Heavier dependency, but saves a lot of boilerplate.
 *
 *   3. **Socket.IO**
 *      - Familiar API, automatic reconnection, fallback transports.
 *      - Slightly higher overhead than raw WS; fine for an RTS where
 *        messages are infrequent compared to a twitch shooter.
 *
 * SYNCHRONIZATION STRATEGY:
 *
 *   For an RTS the recommended approach is **deterministic lockstep**:
 *
 *     - All clients run the same simulation. No authoritative server state.
 *     - Players send *commands* (move unit X to position Y), NOT positions.
 *     - The server (or host) collects commands for a "turn" (e.g. every
 *       100–200 ms), then broadcasts the full command set to all clients.
 *     - Every client applies the same commands in the same order, so the
 *       game states stay in sync. Periodically exchange checksums to
 *       detect desync.
 *
 *   If deterministic lockstep is too hard to retrofit, fall back to
 *   **authoritative state sync**: the host runs the simulation and
 *   periodically broadcasts a full or delta GameStateSync snapshot.
 *   Simpler to implement but uses more bandwidth.
 *
 *   This scaffold supports both strategies — GameStateSync for state-sync,
 *   CommandMessage for lockstep relay.
 */

import { GameSettings } from '../config/gameSettings';
import {
  Resources,
  PlayerState,
  EntityData,
  Command,
} from './GameWorld';

// ---------------------------------------------------------------------------
// Network message interfaces
// ---------------------------------------------------------------------------

/** Unique identifier for a connected player. */
export interface PlayerInfo {
  id: string;
  name: string;
  color: number;
  colorName: string;
  isHost: boolean;
}

/**
 * Full (or delta) game-state snapshot sent from the host / server
 * to all clients for state-sync mode.
 */
export interface GameStateSync {
  /** Monotonically increasing turn / tick number. */
  tick: number;
  /** Serialised entity list. Only changed entities if `isDelta` is true. */
  entities: EntityData[];
  /** Per-player economy state. */
  players: PlayerState[];
  /** If true, `entities` contains only entities that changed since last sync. */
  isDelta: boolean;
  /** Optional checksum for desync detection (CRC32 or similar). */
  checksum?: number;
}

/**
 * A command issued by a player that must be relayed to all clients
 * (lockstep mode) or forwarded to the host (state-sync mode).
 */
export interface CommandMessage {
  /** The player who issued the command. */
  playerId: string;
  /** Simulation tick at which the command was issued. */
  tick: number;
  /** Entity IDs the command applies to (selected units / buildings). */
  entityIds: number[];
  /** The actual command payload. */
  command: Command;
}

/** Diplomatic actions between players. */
export interface DiplomacyMessage {
  fromPlayerId: string;
  toPlayerId: string;
  action: 'ally' | 'neutral' | 'enemy' | 'offer_tribute';
  /** Optional tribute payload when action is 'offer_tribute'. */
  tribute?: Partial<Resources>;
}

/** In-game chat. */
export interface ChatMessage {
  senderId: string;
  senderName: string;
  text: string;
  /** Timestamp (epoch ms) set by sender; server may override. */
  timestamp: number;
  /** If set, message is only visible to this player. */
  recipientId?: string;
}

/** Lobby lifecycle events. */
export interface LobbyMessage {
  type: 'join' | 'leave' | 'ready' | 'unready' | 'start' | 'settings_change';
  playerId: string;
  playerInfo?: PlayerInfo;
  /** Updated settings when type === 'settings_change'. */
  settings?: GameSettings;
}

// ---------------------------------------------------------------------------
// Callback types
// ---------------------------------------------------------------------------

export type StateSyncCallback = (state: GameStateSync) => void;
export type CommandCallback = (cmd: CommandMessage) => void;
export type PlayerJoinedCallback = (player: PlayerInfo) => void;
export type PlayerLeftCallback = (playerId: string) => void;
export type ChatCallback = (msg: ChatMessage) => void;
export type DiplomacyCallback = (msg: DiplomacyMessage) => void;
export type LobbyCallback = (msg: LobbyMessage) => void;

// ---------------------------------------------------------------------------
// MultiplayerSystem — stub implementation
// ---------------------------------------------------------------------------

/**
 * Stub multiplayer system. All methods log to the console with an `[MP]`
 * prefix and return safe no-op values so the game can call them without
 * crashing.  Replace the internals with real WebSocket / Colyseus calls
 * when you are ready to go online.
 */
export class MultiplayerSystem {
  connected = false;
  private _localPlayerId: string = '';
  private _host = false;
  private _players: PlayerInfo[] = [];
  private _lobbyCode: string | null = null;

  // Registered callbacks
  private _onStateSync: StateSyncCallback | null = null;
  private _onCommand: CommandCallback | null = null;
  private _onPlayerJoined: PlayerJoinedCallback | null = null;
  private _onPlayerLeft: PlayerLeftCallback | null = null;
  private _onChat: ChatCallback | null = null;
  private _onDiplomacy: DiplomacyCallback | null = null;
  private _onLobby: LobbyCallback | null = null;

  // ---------- Connection ----------

  /**
   * Connect to the game server.
   * Stub: resolves immediately and logs.
   */
  async connect(serverUrl: string): Promise<void> {
    console.log(`[MP] connect() called — serverUrl: ${serverUrl}`);
    console.log('[MP] (stub) No real connection established.');
    // TODO: open a WebSocket to serverUrl, handle open/close/error/message
    this.connected = false; // stays false in stub
  }

  /** Disconnect from the server. */
  disconnect(): void {
    console.log('[MP] disconnect() called');
    this.connected = false;
    this._players = [];
    this._lobbyCode = null;
  }

  // ---------- Lobby ----------

  /**
   * Create a new lobby with the given game settings.
   * Returns a lobby code that other players can use to join.
   * Stub: returns a random 6-character code.
   */
  createLobby(settings: GameSettings): string {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    this._lobbyCode = code;
    this._host = true;
    this._localPlayerId = 'host-' + code;

    const hostInfo: PlayerInfo = {
      id: this._localPlayerId,
      name: settings.playerName,
      color: settings.playerColor,
      colorName: settings.playerColorName,
      isHost: true,
    };
    this._players = [hostInfo];

    console.log(`[MP] createLobby() — code: ${code}`, settings);
    console.log('[MP] (stub) Lobby created locally. No server involved.');
    return code;
  }

  /**
   * Join an existing lobby by code.
   * Stub: resolves immediately, adds the player to the local list.
   */
  async joinLobby(code: string, playerInfo: PlayerInfo): Promise<void> {
    console.log(`[MP] joinLobby() — code: ${code}`, playerInfo);
    console.log('[MP] (stub) Joined lobby locally. No server involved.');

    this._lobbyCode = code;
    this._host = false;
    this._localPlayerId = playerInfo.id;
    this._players.push(playerInfo);
  }

  // ---------- Sending ----------

  /** Send a gameplay command to the server / other clients. */
  sendCommand(cmd: CommandMessage): void {
    console.log('[MP] sendCommand()', cmd);
    // TODO: serialize and send over WebSocket
  }

  /** Send a diplomacy action. */
  sendDiplomacy(msg: DiplomacyMessage): void {
    console.log('[MP] sendDiplomacy()', msg);
  }

  /** Send a chat message. */
  sendChat(msg: ChatMessage): void {
    console.log('[MP] sendChat()', msg);
  }

  /** Broadcast a full state sync (host only). */
  sendStateSync(state: GameStateSync): void {
    if (!this._host) {
      console.warn('[MP] sendStateSync() called but this client is not the host.');
      return;
    }
    console.log(`[MP] sendStateSync() — tick ${state.tick}, ${state.entities.length} entities`);
  }

  // ---------- Receiving (callback registration) ----------

  onStateSync(callback: StateSyncCallback): void {
    this._onStateSync = callback;
    console.log('[MP] onStateSync() — callback registered');
  }

  onCommand(callback: CommandCallback): void {
    this._onCommand = callback;
    console.log('[MP] onCommand() — callback registered');
  }

  onPlayerJoined(callback: PlayerJoinedCallback): void {
    this._onPlayerJoined = callback;
    console.log('[MP] onPlayerJoined() — callback registered');
  }

  onPlayerLeft(callback: PlayerLeftCallback): void {
    this._onPlayerLeft = callback;
    console.log('[MP] onPlayerLeft() — callback registered');
  }

  onChat(callback: ChatCallback): void {
    this._onChat = callback;
    console.log('[MP] onChat() — callback registered');
  }

  onDiplomacy(callback: DiplomacyCallback): void {
    this._onDiplomacy = callback;
    console.log('[MP] onDiplomacy() — callback registered');
  }

  onLobby(callback: LobbyCallback): void {
    this._onLobby = callback;
    console.log('[MP] onLobby() — callback registered');
  }

  // ---------- Queries ----------

  /** Whether this client is the lobby host / authoritative server. */
  isHost(): boolean {
    return this._host;
  }

  /** Returns a snapshot of the current player list. */
  getPlayers(): PlayerInfo[] {
    return [...this._players];
  }

  /** Returns the local player's ID. */
  getLocalPlayerId(): string {
    return this._localPlayerId;
  }

  /** Returns the current lobby code, or null if not in a lobby. */
  getLobbyCode(): string | null {
    return this._lobbyCode;
  }

  // ---------- Game flow ----------

  /** Host signals that the game should start. */
  startGame(): void {
    if (!this._host) {
      console.warn('[MP] startGame() called but this client is not the host.');
      return;
    }
    console.log('[MP] startGame() — broadcasting start to all players');
    // TODO: send a LobbyMessage { type: 'start', ... } to all clients
  }

  // ---------- Internal helpers (for real implementation) ----------

  /**
   * Called internally when a raw message arrives from the WebSocket.
   * Routes the deserialized payload to the appropriate callback.
   * Stub: not called, but shows the intended dispatch pattern.
   */
  private _handleMessage(type: string, payload: unknown): void {
    switch (type) {
      case 'state_sync':
        this._onStateSync?.(payload as GameStateSync);
        break;
      case 'command':
        this._onCommand?.(payload as CommandMessage);
        break;
      case 'player_joined': {
        const info = payload as PlayerInfo;
        this._players.push(info);
        this._onPlayerJoined?.(info);
        break;
      }
      case 'player_left': {
        const id = (payload as { playerId: string }).playerId;
        this._players = this._players.filter((p) => p.id !== id);
        this._onPlayerLeft?.(id);
        break;
      }
      case 'chat':
        this._onChat?.(payload as ChatMessage);
        break;
      case 'diplomacy':
        this._onDiplomacy?.(payload as DiplomacyMessage);
        break;
      case 'lobby':
        this._onLobby?.(payload as LobbyMessage);
        break;
      default:
        console.warn(`[MP] Unknown message type: ${type}`);
    }
  }
}
