export enum TileType {
  WALL = '#',
  FLOOR = '.',
  WATER = '~',
  GRASS = '"',
  DOOR = '+',
  STAIRS = '>',
}

export interface Position {
  x: number;
  y: number;
}

export enum EntityType {
  PLAYER = 'PLAYER',
  NPC_GHOST = 'NPC_GHOST',
  NPC_RAT = 'NPC_RAT',
  ITEM_POTION = 'ITEM_POTION',
  GOAL_SEED = 'GOAL_SEED',
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Position;
  name: string;
  interacted?: boolean;
}

export interface GameLog {
  id: string;
  message: string;
  type: 'info' | 'combat' | 'dialog' | 'success';
}

export interface GameState {
  playerPos: Position;
  map: TileType[][];
  visible: boolean[][]; // Fog of war
  explored: boolean[][]; // Memory
  entities: Entity[];
  health: number;
  maxHealth: number;
  level: number;
  turn: number;
  gameOver: boolean;
  gameWon: boolean;
}

export interface LevelConfig {
  id: number;
  name: string;
  theme: {
    floor: TileType;
    wall: TileType;
    feature?: TileType;
  };
  entityCounts: {
    ghosts: number;
    rats: number;
    potions: number;
  };
}
export enum QuestStatus {
  NOT_STARTED = 'NOT_STARTED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum QuestType {
  FETCH_ARTIFACT = 'FETCH_ARTIFACT',     // Find hidden artifact and return to ghost
  KILL_RATS = 'KILL_RATS',               // Kill N rats on this level
  EXPLORE_ROOMS = 'EXPLORE_ROOMS',       // Visit all rooms
  ESCORT_SPIRIT = 'ESCORT_SPIRIT',       // Guide ghost to stairs
  FINAL_SEED = 'FINAL_SEED',             // Level 5: retrieve the Golden Seed
}

export interface QuestObjective {
  description: string;
  current: number;
  required: number;
  completed: boolean;
}

export interface Quest {
  id: string;
  levelId: number;
  type: QuestType;
  title: string;
  description: string;
  giverEntityId: string;          // Ghost who gave the quest
  status: QuestStatus;
  objectives: QuestObjective[];
  rewards: QuestReward;
  revealedEntityIds: string[];    // Entity IDs to unhide when quest starts
  dialogueOnGive: string[];       // Dialogue lines when quest is given
  dialogueOnComplete: string[];   // Dialogue lines on turn-in
  dialogueOnActive: string[];     // Reminder dialogue while active
}

export interface QuestReward {
  health?: number;
  hunger?: number;
  unlockStairs?: boolean;         // Some quests gate stairs access
  revealMap?: boolean;            // Reveal explored tiles
  artifact?: string;              // Special item name
}

// Add to your Entity interface:
export interface Entity {
  id: string;
  type: EntityType;
  pos: Position;
  name: string;
  health?: number;
  maxHealth?: number;
  hidden?: boolean;
  questId?: string;               // ADD: Links entity to a quest
  interactable?: boolean;         // ADD: Can player interact?
  dialogueState?: 'idle' | 'quest_available' | 'quest_active' | 'quest_complete' | 'done';  // ADD
  dying?: boolean; // Visual effect for death
}

// Add to your GameState interface:
export interface GameState {
  // ... existing fields ...
  quests: Quest[];
  activeQuestId: string | null;
  completedQuestIds: string[];
  questLog: string[];             // Player-facing quest log messages
}
