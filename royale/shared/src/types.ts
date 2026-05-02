export type PlayerId = string;

export interface PlayerState {
  id: PlayerId;
  x: number;
  z: number;
  color: number;
}

export interface Snapshot {
  t: number;
  players: PlayerState[];
}

export interface InputMessage {
  type: "input";
  seq: number;
  dx: number;
  dz: number;
}

export interface HelloMessage {
  type: "hello";
  id: PlayerId;
  protocol: number;
}

export interface SnapshotMessage {
  type: "snapshot";
  snapshot: Snapshot;
}

export type ClientMessage = InputMessage;
export type ServerMessage = HelloMessage | SnapshotMessage;
