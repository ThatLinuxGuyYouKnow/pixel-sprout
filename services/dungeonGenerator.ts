import { TileType, Position, Entity, EntityType, LevelConfig } from '../types';
import { MAP_WIDTH, MAP_HEIGHT } from '../constants';

interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
  center: Position;
}

const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

export const generateDungeon = (levelConfig: LevelConfig) => {
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    attempts++;

    // 1. Initialize empty map
    const map: TileType[][] = Array(MAP_HEIGHT).fill(null).map(() => Array(MAP_WIDTH).fill(TileType.WALL));
    const rooms: Room[] = [];

    // 2. Room Generation
    const maxRooms = 8;
    const minSize = 3;
    const maxSize = 6;

    for (let i = 0; i < maxRooms; i++) {
      const w = randomInt(minSize, maxSize);
      const h = randomInt(minSize, maxSize);
      const x = randomInt(1, MAP_WIDTH - w - 1);
      const y = randomInt(1, MAP_HEIGHT - h - 1);

      const newRoom: Room = { x, y, w, h, center: { x: Math.floor(x + w / 2), y: Math.floor(y + h / 2) } };

      // Check collision
      const failed = rooms.some(r =>
        newRoom.x <= r.x + r.w && newRoom.x + newRoom.w >= r.x &&
        newRoom.y <= r.y + r.h && newRoom.y + newRoom.h >= r.y
      );

      if (!failed) {
        rooms.push(newRoom);

        // Carve room
        for (let ry = newRoom.y; ry < newRoom.y + newRoom.h; ry++) {
          for (let rx = newRoom.x; rx < newRoom.x + newRoom.w; rx++) {
            map[ry][rx] = levelConfig.theme.floor;
          }
        }

        // Optional: Add theme features (water/grass)
        if (levelConfig.theme.feature && Math.random() > 0.6) {
          const fx = randomInt(newRoom.x + 1, newRoom.x + newRoom.w - 2);
          const fy = randomInt(newRoom.y + 1, newRoom.y + newRoom.h - 2);
          map[fy][fx] = levelConfig.theme.feature;
        }
      }
    }

    // 3. Corridor Generation (Connect center to center)
    rooms.sort((a, b) => a.x - b.x);

    for (let i = 0; i < rooms.length - 1; i++) {
      const r1 = rooms[i];
      const r2 = rooms[i + 1];

      let x = r1.center.x;
      let y = r1.center.y;

      while (x !== r2.center.x) {
        map[y][x] = levelConfig.theme.floor;
        x += x < r2.center.x ? 1 : -1;
      }
      while (y !== r2.center.y) {
        map[y][x] = levelConfig.theme.floor;
        y += y < r2.center.y ? 1 : -1;
      }
    }

    // 4. Place Stairs (Last room)
    const lastRoom = rooms[rooms.length - 1];
    const stairsPos = lastRoom.center;
    if (levelConfig.id < 5) {
      map[stairsPos.y][stairsPos.x] = TileType.STAIRS;
    }

    // 5. Entities Placement
    const entities: Entity[] = [];
    const startPos = rooms[0].center; // First room center

    // Helper to find empty spot
    const getEmptyPos = (): Position => {
      let attempts = 0;
      while (attempts < 100) {
        const r = rooms[randomInt(0, rooms.length - 1)];
        const x = randomInt(r.x, r.x + r.w - 1);
        const y = randomInt(r.y, r.y + r.h - 1);
        if (map[y][x] !== TileType.WALL && map[y][x] !== TileType.STAIRS && !(x === startPos.x && y === startPos.y)) {
          // Check if entity exists there
          if (!entities.find(e => e.pos.x === x && e.pos.y === y)) {
            return { x, y };
          }
        }
        attempts++;
      }
      return startPos;
    };

    // Add configured entities
    for (let i = 0; i < levelConfig.entityCounts.ghosts; i++) {
      entities.push({
        id: `ghost-${levelConfig.id}-${i}`,
        type: EntityType.NPC_GHOST,
        pos: getEmptyPos(),
        name: 'Wandering Spirit'
      });
    }
    for (let i = 0; i < levelConfig.entityCounts.rats; i++) {
      entities.push({
        id: `rat-${levelConfig.id}-${i}`,
        type: EntityType.NPC_RAT,
        pos: getEmptyPos(),
        name: 'Dungeon Rat'
      });
    }
    for (let i = 0; i < levelConfig.entityCounts.potions; i++) {
      entities.push({
        id: `potion-${levelConfig.id}-${i}`,
        type: EntityType.ITEM_POTION,
        pos: getEmptyPos(),
        name: 'Mysterious Potion'
      });
    }

    // Add Goal Seed
    if (levelConfig.id === 5) {
      entities.push({
        id: 'golden-seed',
        type: EntityType.GOAL_SEED,
        pos: stairsPos,
        name: 'The Golden Seed'
      });
    }

    // --- Validation: Flood Fill ---
    const isValid = () => {
      const visited = new Set<string>();
      const queue: Position[] = [startPos];
      visited.add(`${startPos.x},${startPos.y}`);
      let reachedStairs = false;

      while (queue.length > 0) {
        const curr = queue.shift()!;

        // Check if we reached stairs position
        if (curr.x === stairsPos.x && curr.y === stairsPos.y) {
          reachedStairs = true;
          break;
        }

        const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (const [dx, dy] of dirs) {
          const nx = curr.x + dx;
          const ny = curr.y + dy;

          // Bounds
          // Bounds
          if (nx < 0 || nx >= MAP_WIDTH || ny < 0 || ny >= MAP_HEIGHT) continue;

          // Blocked?
          if (map[ny][nx] === TileType.WALL) continue;

          // Blocked by Unkillable NPC (Ghost)?
          // We allow Rats because they can be killed to clear the path.
          if (entities.some(e => e.pos.x === nx && e.pos.y === ny && e.type === EntityType.NPC_GHOST)) continue;

          const key = `${nx},${ny}`;
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({ x: nx, y: ny });
          }
        }
      }
      return reachedStairs;
    };

    if (isValid()) {
      return {
        map,
        entities,
        startPos,
        stairsPos
      };
    }
    // Else loop and try again
  }

  // Fallback (Should rarely happen)
  throw new Error("Failed to generate valid dungeon");
};