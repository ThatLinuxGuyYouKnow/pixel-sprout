# Quest System Documentation

## Overview
The quest system manages player progression through quests, objectives, and rewards across all five levels of the dungeon.

## Services

### 1. QuestManager (`services/questManager.ts`)
Core service for quest state management and lifecycle.

**Key Methods:**
- `createQuest()` - Create a new quest with full configuration
- `startQuest()` - Activate a quest (NOT_STARTED → ACTIVE)
- `updateObjective()` - Progress an objective
- `completeQuest()` - Finish a quest and apply rewards (ACTIVE → COMPLETED)
- `failQuest()` - Mark quest as failed (ACTIVE → FAILED)
- `getActiveQuest()` - Get currently active quest
- `getQuestById()` - Retrieve quest by ID
- `getQuestsByLevel()` - Get all quests for a level
- `getAvailableQuests()` - Get not-yet-started quests
- `allObjectivesCompleted()` - Check if quest is complete
- `getQuestProgress()` - Get completion percentage (0-100)
- `getObjectiveStatus()` - Get human-readable progress (e.g., "3/5")
- `getRandomDialogue()` - Pick random dialogue from quest lines

### 2. QuestGenerator (`services/questGenerator.ts`)
Generates level-specific quests with contextual dialogue and rewards.

**Key Methods:**
- `generateQuestsForLevel(levelId, entities)` - Generate quests for a level
- `createRandomFetchQuest()` - Generate dynamic fetch quests
- `createRandomExploreQuest()` - Generate dynamic exploration quests
- `createCustomQuest()` - Create custom quests from parameters

**Level Quest Mappings:**
- **Level 1** (The Damp Cellar): EXPLORE_ROOMS quest from ghost
- **Level 2** (The Sewers): KILL_RATS quest from rat
- **Level 3** (The Ancient Library): FETCH_ARTIFACT quest from ghost
- **Level 4** (The Deep Dark): ESCORT_SPIRIT quest from ghost
- **Level 5** (The Sunken Garden): FINAL_SEED quest from ghost

## Quest Types

```typescript
enum QuestType {
  FETCH_ARTIFACT = 'FETCH_ARTIFACT',     // Find hidden artifact
  KILL_RATS = 'KILL_RATS',               // Defeat N rats
  EXPLORE_ROOMS = 'EXPLORE_ROOMS',       // Visit N locations
  ESCORT_SPIRIT = 'ESCORT_SPIRIT',       // Guide NPC to stairs
  FINAL_SEED = 'FINAL_SEED',             // Retrieve the Golden Seed
}
```

## Quest Status

```typescript
enum QuestStatus {
  NOT_STARTED = 'NOT_STARTED',   // Available but not accepted
  ACTIVE = 'ACTIVE',             // Currently in progress
  COMPLETED = 'COMPLETED',       // Successfully finished
  FAILED = 'FAILED',             // Failed/abandoned
}
```

## Quest Structure

```typescript
interface Quest {
  id: string;                          // Unique quest ID
  levelId: number;                     // Level quest belongs to
  type: QuestType;                     // Type of quest
  title: string;                       // Display title
  description: string;                 // Long description
  giverEntityId: string;               // NPC who gives quest
  status: QuestStatus;                 // Current status
  objectives: QuestObjective[];        // Progress tracking
  rewards: QuestReward;                // Rewards on completion
  revealedEntityIds: string[];         // Entities to unhide
  dialogueOnGive: string[];            // Dialogue when offered
  dialogueOnComplete: string[];        // Dialogue when done
  dialogueOnActive: string[];          // Reminder dialogue
}

interface QuestObjective {
  description: string;                 // Objective text
  current: number;                     // Current progress
  required: number;                    // Required to complete
  completed: boolean;                  // Is complete?
}

interface QuestReward {
  health?: number;                     // Health restored
  hunger?: number;                     // Hunger reduced (if applicable)
  unlockStairs?: boolean;              // Grant stair access
  revealMap?: boolean;                 // Reveal explored tiles
  artifact?: string;                   // Special item name
}
```

## GameState Integration

Quest system extends GameState with:

```typescript
interface GameState {
  // ... existing fields ...
  quests: Quest[];                     // All available quests
  activeQuestId: string | null;        // Currently active quest ID
  completedQuestIds: string[];         // History of completed quests
  questLog: string[];                  // Player-facing quest messages
}
```

## Entity Extensions

Entities now support quest-related fields:

```typescript
interface Entity {
  // ... existing fields ...
  questId?: string;                    // Links to a quest
  hidden?: boolean;                    // Hidden until quest starts
  interactable?: boolean;              // Can player interact?
  dialogueState?: 'idle' | 'quest_available' | 'quest_active' | 'quest_complete' | 'done';
}
```

## Integration Guide

### 1. Initialize Quests on Level Load

```typescript
import { QuestGenerator } from './services/questGenerator';

// In level setup
const quests = QuestGenerator.generateQuestsForLevel(levelId, entities);
setGameState(prev => ({
  ...prev,
  quests: [...prev.quests, ...quests]
}));
```

### 2. Start a Quest

```typescript
import { QuestManager } from './services/questManager';

const quest = QuestManager.getAvailableQuests(gameState, levelId)[0];
const newState = QuestManager.startQuest(quest, gameState);
setGameState(newState);
```

### 3. Update Progress

```typescript
// When player achieves an objective
const quest = QuestManager.getActiveQuest(gameState);
const updatedQuest = QuestManager.updateObjective(quest, 0, quest.objectives[0].current + 1);

if (QuestManager.allObjectivesCompleted(updatedQuest)) {
  const newState = QuestManager.completeQuest(updatedQuest, gameState);
  setGameState(newState);
}
```

### 4. Get Quest Information

```typescript
// Get active quest
const activeQuest = QuestManager.getActiveQuest(gameState);

// Get progress
const progress = QuestManager.getQuestProgress(activeQuest);

// Get active objectives
const objectives = QuestManager.getActiveObjectives(activeQuest);

// Get dialogue
const dialogue = QuestManager.getRandomDialogue(activeQuest.dialogueOnGive);
```

## Reward System

When a quest completes, rewards are applied:

- **health**: Restores player health
- **unlockStairs**: Allows descending to next level
- **revealMap**: Reveals all explored tiles on current level
- **artifact**: Sets special item for narrative purposes

## Dialogue System

Each quest has three dialogue phases:

1. **dialogueOnGive**: When quest is first offered
2. **dialogueOnActive**: Reminder dialogue while quest is active
3. **dialogueOnComplete**: Final dialogue when quest completes

The system uses `getRandomDialogue()` to select from available lines, enabling variety in NPC responses.

## Level Progression

Quests are designed to gate level progression:

- **Level 1**: Tutorial quest must be completed to unlock stairs
- **Levels 2-4**: Level-specific quests control stair access
- **Level 5**: Final seed quest - no stairs unlock, game victory on completion

## Future Extensions

- Dynamic quest generation based on player difficulty
- Side quests unrelated to level progression
- Multi-part quests spanning multiple levels
- Conditional quest chains based on player choices
- Reputation system tied to quest completion
