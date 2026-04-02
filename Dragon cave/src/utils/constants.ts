export const TILE_SIZE = 32;
export const MAP_WIDTH = 50;
export const MAP_HEIGHT = 50;

export const CAMERA_WIDTH = 800;
export const CAMERA_HEIGHT = 600;

export const VISIBILITY_RADIUS = 6;

export const COLORS = {
  FLOOR: 0x3a3a3a,
  WALL: 0x1a1a1a,
  WALL_TOP: 0x2a2a2a,
  PLAYER: 0x44bb44,
  ENEMY_SKELETON: 0xcccccc,
  ENEMY_BAT: 0x8844aa,
  ENEMY_SLIME: 0x44aa44,
  ENEMY_DRAGON: 0xff4444,
  STAIRS: 0xffcc00,
  POTION_HEALTH: 0xff4466,
  POTION_STRENGTH: 0xff8800,
  SWORD: 0xaaaadd,
  SHIELD: 0x8888bb,
  FOG_HIDDEN: 0x000000,
  FOG_EXPLORED: 0x000000,
  HUD_BG: 0x111111,
  HUD_TEXT: '#cccccc',
  HEALTH_BAR: 0x44bb44,
  HEALTH_BAR_BG: 0x333333,
  XP_BAR: 0x4488ff,
};

export enum Tile {
  VOID = 0,
  FLOOR = 1,
  WALL = 2,
  STAIRS_DOWN = 3,
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
