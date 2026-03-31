export type Difficulty = 'easy' | 'normal' | 'hard';
export type MapSize = 'small' | 'medium' | 'large';
export type StartingRes = 'lean' | 'standard' | 'rich';

export interface CPUPlayer {
  difficulty: Difficulty;
  color: number;
  colorName: string;
  nation: string;
}

export interface GameSettings {
  playerName: string;
  playerColor: number;
  playerColorName: string;
  playerNation: string;
  cpuPlayers: CPUPlayer[];
  mapSize: MapSize;
  startingResources: StartingRes;
  revealMap: boolean;
  victoryMode: 'any' | 'domination' | 'wonder' | 'timed';
  timeLimit: number; // seconds, for timed mode
}

export const PLAYER_COLORS: { name: string; hex: number }[] = [
  { name: 'Green', hex: 0x44aa44 },
  { name: 'Red', hex: 0xcc4444 },
  { name: 'Blue', hex: 0x4477cc },
  { name: 'Purple', hex: 0x9944cc },
  { name: 'Orange', hex: 0xcc8833 },
  { name: 'Teal', hex: 0x33aa99 },
  { name: 'Pink', hex: 0xcc44aa },
  { name: 'Yellow', hex: 0xcccc33 },
  { name: 'White', hex: 0xcccccc },
  { name: 'Cyan', hex: 0x33cccc },
];

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
};

export const MAP_SIZE_LABELS: Record<MapSize, string> = {
  small: 'Small',
  medium: 'Medium',
  large: 'Large',
};

export const MAP_SIZE_VALUES: Record<MapSize, { w: number; h: number }> = {
  small: { w: 1536, h: 1536 },
  medium: { w: 2048, h: 2048 },
  large: { w: 3072, h: 3072 },
};

export const STARTING_RES_LABELS: Record<StartingRes, string> = {
  lean: 'Lean',
  standard: 'Standard',
  rich: 'Rich',
};

export const STARTING_RES_VALUES: Record<StartingRes, { food: number; wood: number; gold: number; stone: number }> = {
  lean: { food: 100, wood: 100, gold: 50, stone: 25 },
  standard: { food: 200, wood: 200, gold: 100, stone: 50 },
  rich: { food: 500, wood: 500, gold: 300, stone: 200 },
};

// Difficulty multipliers for AI
export const DIFFICULTY_CONFIG: Record<Difficulty, {
  tickRate: number;
  vilTarget: number;
  milTarget: number;
  archTarget: number;
  knightTarget: number;
  attackWaveSize: number;
  resourceBonus: number;
}> = {
  easy: {
    tickRate: 3.5,
    vilTarget: 5,
    milTarget: 3,
    archTarget: 2,
    knightTarget: 0,
    attackWaveSize: 8,
    resourceBonus: 1,
  },
  normal: {
    tickRate: 2,
    vilTarget: 8,
    milTarget: 5,
    archTarget: 4,
    knightTarget: 2,
    attackWaveSize: 5,
    resourceBonus: 1,
  },
  hard: {
    tickRate: 1,
    vilTarget: 12,
    milTarget: 8,
    archTarget: 6,
    knightTarget: 4,
    attackWaveSize: 4,
    resourceBonus: 1.5,
  },
};

export const DEFAULT_SETTINGS: GameSettings = {
  playerName: 'Player',
  playerColor: PLAYER_COLORS[0].hex,
  playerColorName: PLAYER_COLORS[0].name,
  playerNation: 'rome',
  cpuPlayers: [
    { difficulty: 'normal', color: PLAYER_COLORS[1].hex, colorName: PLAYER_COLORS[1].name, nation: 'china' },
  ],
  mapSize: 'medium',
  startingResources: 'standard',
  revealMap: false,
  victoryMode: 'any',
  timeLimit: 1800,
};
