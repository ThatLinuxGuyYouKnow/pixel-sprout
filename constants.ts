import { TileType, LevelConfig } from './types';

export const MAP_WIDTH = 25; // Slightly larger for procedural generation
export const MAP_HEIGHT = 18;
export const VISIBILITY_RADIUS = 6;

export const COLORS = {
  [TileType.WALL]: 'bg-gray-800',
  [TileType.FLOOR]: 'bg-gray-700',
  [TileType.WATER]: 'bg-blue-900',
  [TileType.GRASS]: 'bg-green-900',
  [TileType.DOOR]: 'bg-yellow-900',
  [TileType.STAIRS]: 'bg-purple-900',
};

export const CHARS = {
  [TileType.WALL]: '#',
  [TileType.FLOOR]: '.',
  [TileType.WATER]: '~',
  [TileType.GRASS]: '"',
  [TileType.DOOR]: '+',
  [TileType.STAIRS]: '>',
};

export const LEVELS: LevelConfig[] = [
  {
    id: 1,
    name: "The Damp Cellar",
    theme: { floor: TileType.FLOOR, wall: TileType.WALL },
    entityCounts: { ghosts: 1, rats: 0, potions: 1 }
  },
  {
    id: 2,
    name: "The Sewers",
    theme: { floor: TileType.FLOOR, wall: TileType.WALL, feature: TileType.WATER },
    entityCounts: { ghosts: 0, rats: 1, potions: 1 }
  },
  {
    id: 3,
    name: "The Ancient Library",
    theme: { floor: TileType.FLOOR, wall: TileType.WALL },
    entityCounts: { ghosts: 1, rats: 0, potions: 1 }
  },
  {
    id: 4,
    name: "The Deep Dark",
    theme: { floor: TileType.FLOOR, wall: TileType.WALL }, // Maze-like logic handled in generator tweaks if needed
    entityCounts: { ghosts: 0, rats: 2, potions: 2 }
  },
  {
    id: 5,
    name: "The Sunken Garden",
    theme: { floor: TileType.GRASS, wall: TileType.WALL, feature: TileType.WATER },
    entityCounts: { ghosts: 1, rats: 0, potions: 0 } // Seed is added manually
  }
];

export const INITIAL_LEVEL = LEVELS[0];