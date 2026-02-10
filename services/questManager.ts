import {
  Quest,
  QuestStatus,
  QuestType,
  QuestObjective,
  QuestReward,
  GameState,
  Entity,
  EntityType,
} from '../types';

/**
 * Quest Manager Service
 * Handles quest lifecycle, progression, and state management
 */

export class QuestManager {
  /**
   * Create a new quest with objectives and rewards
   */
  static createQuest(
    levelId: number,
    type: QuestType,
    giverEntityId: string,
    title: string,
    description: string,
    objectives: QuestObjective[],
    rewards: QuestReward,
    dialogueOnGive: string[],
    dialogueOnComplete: string[],
    dialogueOnActive: string[],
    revealedEntityIds: string[] = []
  ): Quest {
    return {
      id: `quest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      levelId,
      type,
      title,
      description,
      giverEntityId,
      status: QuestStatus.NOT_STARTED,
      objectives,
      rewards,
      revealedEntityIds,
      dialogueOnGive,
      dialogueOnComplete,
      dialogueOnActive,
    };
  }

  /**
   * Start a quest (NOT_STARTED -> ACTIVE)
   */
  static startQuest(quest: Quest, gameState: GameState): GameState {
    const updatedQuest: Quest = {
      ...quest,
      status: QuestStatus.ACTIVE,
    };

    // Reveal any hidden entities associated with this quest
    const updatedEntities = gameState.entities.map(entity => {
      if (updatedQuest.revealedEntityIds.includes(entity.id)) {
        return { ...entity, hidden: false };
      }
      return entity;
    });

    return {
      ...gameState,
      quests: gameState.quests.map(q => (q.id === quest.id ? updatedQuest : q)),
      entities: updatedEntities,
      activeQuestId: quest.id,
      questLog: [
        ...gameState.questLog,
        `Quest Started: ${updatedQuest.title}`,
      ],
    };
  }

  /**
   * Update a quest objective progress
   */
  static updateObjective(
    quest: Quest,
    objectiveIndex: number,
    newCurrent: number
  ): Quest {
    if (objectiveIndex < 0 || objectiveIndex >= quest.objectives.length) {
      return quest;
    }

    const updatedObjectives = [...quest.objectives];
    const objective = updatedObjectives[objectiveIndex];

    updatedObjectives[objectiveIndex] = {
      ...objective,
      current: Math.min(newCurrent, objective.required),
      completed: newCurrent >= objective.required,
    };

    // Check if all objectives are completed
    const allCompleted = updatedObjectives.every(obj => obj.completed);

    return {
      ...quest,
      objectives: updatedObjectives,
      status: allCompleted ? QuestStatus.COMPLETED : quest.status,
    };
  }

  /**
   * Complete a quest (ACTIVE -> COMPLETED)
   */
  static completeQuest(quest: Quest, gameState: GameState): GameState {
    if (quest.status !== QuestStatus.ACTIVE) {
      return gameState;
    }

    const completedQuest: Quest = {
      ...quest,
      status: QuestStatus.COMPLETED,
    };

    // Apply quest rewards
    let updatedGameState = { ...gameState };

    const { rewards } = completedQuest;

    if (rewards.health) {
      updatedGameState = {
        ...updatedGameState,
        health: Math.min(
          updatedGameState.health + rewards.health,
          updatedGameState.maxHealth
        ),
      };
    }

    if (rewards.unlockStairs) {
      // Unlock stairs by removing any blocking entities or setting a flag
      updatedGameState = {
        ...updatedGameState,
        entities: updatedGameState.entities.filter(
          e => e.type !== EntityType.NPC_GHOST || e.id !== completedQuest.giverEntityId
        ),
      };
    }

    if (rewards.revealMap) {
      // Reveal entire current level
      const revealedExplored = updatedGameState.explored.map(row =>
        row.map(() => true)
      );
      updatedGameState = {
        ...updatedGameState,
        explored: revealedExplored,
      };
    }

    return {
      ...updatedGameState,
      quests: updatedGameState.quests.map(q =>
        q.id === quest.id ? completedQuest : q
      ),
      completedQuestIds: [...updatedGameState.completedQuestIds, quest.id],
      activeQuestId:
        updatedGameState.activeQuestId === quest.id
          ? null
          : updatedGameState.activeQuestId,
      questLog: [
        ...updatedGameState.questLog,
        `Quest Completed: ${completedQuest.title}`,
      ],
    };
  }

  /**
   * Fail a quest (ACTIVE -> FAILED)
   */
  static failQuest(quest: Quest, gameState: GameState): GameState {
    if (quest.status !== QuestStatus.ACTIVE) {
      return gameState;
    }

    return {
      ...gameState,
      quests: gameState.quests.map(q =>
        q.id === quest.id ? { ...q, status: QuestStatus.FAILED } : q
      ),
      activeQuestId:
        gameState.activeQuestId === quest.id ? null : gameState.activeQuestId,
      questLog: [...gameState.questLog, `Quest Failed: ${quest.title}`],
    };
  }

  /**
   * Get the active quest from game state
   */
  static getActiveQuest(gameState: GameState): Quest | null {
    if (!gameState.activeQuestId) return null;
    return (
      gameState.quests.find(q => q.id === gameState.activeQuestId) || null
    );
  }

  /**
   * Get a quest by ID
   */
  static getQuestById(gameState: GameState, questId: string): Quest | null {
    return gameState.quests.find(q => q.id === questId) || null;
  }

  /**
   * Get all quests for a specific level
   */
  static getQuestsByLevel(gameState: GameState, levelId: number): Quest[] {
    return gameState.quests.filter(q => q.levelId === levelId);
  }

  /**
   * Get available quests (NOT_STARTED) for a specific level
   */
  static getAvailableQuests(gameState: GameState, levelId: number): Quest[] {
    return gameState.quests.filter(
      q => q.levelId === levelId && q.status === QuestStatus.NOT_STARTED
    );
  }

  /**
   * Get completed quests
   */
  static getCompletedQuests(gameState: GameState): Quest[] {
    return gameState.quests.filter(q => q.status === QuestStatus.COMPLETED);
  }

  /**
   * Check if all level objectives are met for a quest
   */
  static allObjectivesCompleted(quest: Quest): boolean {
    return quest.objectives.every(obj => obj.completed);
  }

  /**
   * Get quest progress as a percentage
   */
  static getQuestProgress(quest: Quest): number {
    if (quest.objectives.length === 0) return 0;

    const completedCount = quest.objectives.filter(obj => obj.completed).length;
    return Math.round((completedCount / quest.objectives.length) * 100);
  }

  /**
   * Get human-readable status for a quest objective
   */
  static getObjectiveStatus(objective: QuestObjective): string {
    return `${objective.current}/${objective.required}`;
  }

  /**
   * Get relevant dialogue for an NPC giving a quest
   */
  static getDialogueForQuest(
    quest: Quest,
    state: 'give' | 'active' | 'complete'
  ): string[] {
    switch (state) {
      case 'give':
        return quest.dialogueOnGive;
      case 'active':
        return quest.dialogueOnActive;
      case 'complete':
        return quest.dialogueOnComplete;
      default:
        return [];
    }
  }

  /**
   * Pick a random dialogue line from a quest's dialogue array
   */
  static getRandomDialogue(dialogueLines: string[]): string {
    if (dialogueLines.length === 0) return 'I have nothing more to say...';
    return dialogueLines[Math.floor(Math.random() * dialogueLines.length)];
  }

  /**
   * Initialize quests for a level
   * This should be called when loading a new level
   */
  static initializeQuestsForLevel(
    gameState: GameState,
    levelId: number
  ): GameState {
    // Filter or create quests for this level if needed
    // This can be extended to dynamically generate quests based on level config
    return gameState;
  }

  /**
   * Check if a quest has been completed in previous levels
   */
  static isQuestAlreadyCompleted(
    gameState: GameState,
    questId: string
  ): boolean {
    return gameState.completedQuestIds.includes(questId);
  }

  /**
   * Get all active objective descriptions
   */
  static getActiveObjectives(quest: Quest): string[] {
    return quest.objectives
      .filter(obj => !obj.completed)
      .map(
        obj =>
          `${obj.description} (${this.getObjectiveStatus(obj)})`
      );
  }
}
