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
  ITEM_QUEST = 'ITEM_QUEST',
  GOAL_SEED = 'GOAL_SEED',
}

export interface Entity {
  id: string;
  type: EntityType;
  pos: Position;
  name: string;
  health?: number;
  maxHealth?: number;
  hidden?: boolean;
  questId?: string;
  interactable?: boolean;
  dialogueState?: 'idle' | 'quest_available' | 'quest_active' | 'quest_complete' | 'done';
  dying?: boolean;
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
  visible: boolean[][];
  explored: boolean[][];
  entities: Entity[];
  health: number;
  maxHealth: number;
  level: number;
  turn: number;
  gameOver: boolean;
  gameWon: boolean;
  quests: Quest[];
  activeQuestId: string | null;
  completedQuestIds: string[];
  questLog: string[];
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
  FETCH_ARTIFACT = 'FETCH_ARTIFACT',
  KILL_RATS = 'KILL_RATS',
  EXPLORE_ROOMS = 'EXPLORE_ROOMS',
  ESCORT_SPIRIT = 'ESCORT_SPIRIT',
  FINAL_SEED = 'FINAL_SEED',
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
  giverEntityId: string;
  status: QuestStatus;
  objectives: QuestObjective[];
  rewards: QuestReward;
  revealedEntityIds: string[];
  dialogueOnGive: string[];
  dialogueOnComplete: string[];
  dialogueOnActive: string[];
}

export interface QuestReward {
  health?: number;
  hunger?: number;
  unlockStairs?: boolean;
  revealMap?: boolean;
  artifact?: string;
}
