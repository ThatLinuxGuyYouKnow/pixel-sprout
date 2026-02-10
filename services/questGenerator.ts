import {
  Quest,
  QuestType,
  QuestObjective,
  QuestReward,
  GameState,
  Entity,
  EntityType,
} from '../types';
import { QuestManager } from './questManager';

/**
 * Quest Generator Service
 * Generates contextual quests for each level based on level config and available entities
 */

export class QuestGenerator {
  /**
   * Generate default quests for a level
   */
  static generateQuestsForLevel(
    levelId: number,
    entities: Entity[]
  ): Quest[] {
    switch (levelId) {
      case 1:
        return this.generateLevel1Quests(entities);
      case 2:
        return this.generateLevel2Quests(entities);
      case 3:
        return this.generateLevel3Quests(entities);
      case 4:
        return this.generateLevel4Quests(entities);
      case 5:
        return this.generateLevel5Quests(entities);
      default:
        return [];
    }
  }

  /**
   * Level 1: The Damp Cellar
   * Introduction level with simple quest
   */
  private static generateLevel1Quests(entities: Entity[]): Quest[] {
    const ghost = entities.find(e => e.type === EntityType.NPC_GHOST);
    if (!ghost) return [];

    const cellarQuest = QuestManager.createQuest(
      1,
      QuestType.EXPLORE_ROOMS,
      ghost.id,
      'The Ghost\'s Plea',
      'A restless spirit calls out from the darkness. Listen to their story and explore the cellar.',
      [
        {
          description: 'Explore the cellar',
          current: 0,
          required: 5, // Explore 5 tiles
          completed: false,
        },
      ],
      {
        health: 5,
        unlockStairs: true,
      },
      [
        'Welcome, traveler... I\'ve been trapped in this cellar for so long...',
        'Please, explore these chambers. Help me understand what lies below.',
        'The darkness grows thin here. Perhaps you can help me find peace.',
      ],
      [
        'Thank you for exploring. Now I understand what must be done.',
        'The path forward is revealed. Go deeper if you dare.',
      ],
      [
        'Have you seen anything unusual in your travels?',
        'The further chambers hold secrets we must uncover.',
      ]
    );

    return [cellarQuest];
  }

  /**
   * Level 2: The Sewers
   * Danger level with rat population
   */
  private static generateLevel2Quests(entities: Entity[]): Quest[] {
    const rat = entities.find(e => e.type === EntityType.NPC_RAT);
    if (!rat) return [];

    const ratQuest = QuestManager.createQuest(
      2,
      QuestType.KILL_RATS,
      rat.id,
      'The Infestation',
      'The sewers are infested. Deal with the rat problem.',
      [
        {
          description: 'Defeat rats',
          current: 0,
          required: 3,
          completed: false,
        },
      ],
      {
        health: 10,
        unlockStairs: true,
      },
      [
        'SQUEAK! You dare enter our domain?',
        'The sewers belong to us now, intruder!',
      ],
      [
        'Agh! You\'ve proven yourself stronger than I expected...',
        'Perhaps there\'s honor among warriors after all.',
      ],
      [
        'You still haven\'t defeated all of my kin!',
        'Come back when you\'ve cleaned out this sewer!',
      ]
    );

    return [ratQuest];
  }

  /**
   * Level 3: The Ancient Library
   * Knowledge level with artifact hunt
   */
  private static generateLevel3Quests(entities: Entity[]): Quest[] {
    const ghost = entities.find(e => e.type === EntityType.NPC_GHOST);
    if (!ghost) return [];

    const libraryQuest = QuestManager.createQuest(
      3,
      QuestType.FETCH_ARTIFACT,
      ghost.id,
      'The Lost Tome',
      'An ancient scholar seeks a forbidden book lost in the library\'s depths.',
      [
        {
          description: 'Find the Lost Tome',
          current: 0,
          required: 1,
          completed: false,
        },
      ],
      {
        health: 15,
        revealMap: true,
        unlockStairs: true,
      },
      [
        'Ah, welcome! I\'ve been searching for a tome... so very important.',
        'The knowledge within could unlock the path to the golden seed.',
        'Will you help me find it?',
      ],
      [
        'You found it! The Lost Tome... it contains the secrets I needed.',
        'Now the path forward becomes clear.',
      ],
      [
        'The Tome is hidden somewhere in these shelves...',
        'It contains power beyond measure. Please find it.',
      ]
    );

    return [libraryQuest];
  }

  /**
   * Level 4: The Deep Dark
   * Survival level with escort quest
   */
  private static generateLevel4Quests(entities: Entity[]): Quest[] {
    const ghost = entities.find(e => e.type === EntityType.NPC_GHOST);
    if (!ghost) return [];

    const escortQuest = QuestManager.createQuest(
      4,
      QuestType.ESCORT_SPIRIT,
      ghost.id,
      'Guide the Lost Soul',
      'A trapped spirit needs guidance through the dark maze to find peace.',
      [
        {
          description: 'Guide the spirit to the exit',
          current: 0,
          required: 1,
          completed: false,
        },
      ],
      {
        health: 20,
        unlockStairs: true,
      },
      [
        'I... I\'m so lost in this darkness...',
        'Will you guide me through? I fear I cannot find the way alone.',
        'Please, help me reach the light above.',
      ],
      [
        'We did it! I can feel the light now!',
        'Thank you for guiding me. I can finally rest.',
      ],
      [
        'This way? Or that way? Everything looks the same...',
        'Stay close to me. I feel safer near you.',
      ]
    );

    return [escortQuest];
  }

  /**
   * Level 5: The Sunken Garden
   * Final level with ultimate goal
   */
  private static generateLevel5Quests(entities: Entity[]): Quest[] {
    const ghost = entities.find(e => e.type === EntityType.NPC_GHOST);
    if (!ghost) return [];

    const seedQuest = QuestManager.createQuest(
      5,
      QuestType.FINAL_SEED,
      ghost.id,
      'The Golden Seed',
      'At last... the final chamber. The Golden Seed is within reach.',
      [
        {
          description: 'Retrieve the Golden Seed',
          current: 0,
          required: 1,
          completed: false,
        },
      ],
      {
        health: 50,
        artifact: 'The Golden Seed of Life',
      },
      [
        'We\'ve made it... to the heart of the dungeon.',
        'The Golden Seed lies ahead, guarded by ancient forces.',
        'This is your moment. Go forward and claim your destiny.',
      ],
      [
        'You did it! You\'ve retrieved the seed!',
        'Nature will bloom again. The world is saved!',
      ],
      [
        'The seed glows softly in this sacred place...',
        'Can you feel it? The power of life itself.',
      ]
    );

    return [seedQuest];
  }

  /**
   * Create a random fetch quest for dynamic quest generation
   */
  static createRandomFetchQuest(
    levelId: number,
    giverEntity: Entity,
    artifacts: string[] = ['Ancient Medallion', 'Crystal Orb', 'Sacred Relic']
  ): Quest {
    const artifact = artifacts[Math.floor(Math.random() * artifacts.length)];

    return QuestManager.createQuest(
      levelId,
      QuestType.FETCH_ARTIFACT,
      giverEntity.id,
      `Retrieve the ${artifact}`,
      `Find and bring back the ${artifact} from this level.`,
      [
        {
          description: `Find the ${artifact}`,
          current: 0,
          required: 1,
          completed: false,
        },
      ],
      {
        health: 10,
      },
      [
        `I\'ve lost the ${artifact}... can you find it for me?`,
        `It must be somewhere on this level. Please help!`,
      ],
      [
        `You found it! Thank you so much!`,
        `I knew I could count on you.`,
      ],
      [
        `Have you found the ${artifact} yet?`,
        `It should be somewhere nearby...`,
      ]
    );
  }

  /**
   * Create a random exploration quest for dynamic quest generation
   */
  static createRandomExploreQuest(
    levelId: number,
    giverEntity: Entity,
    requiredTiles: number = 10
  ): Quest {
    return QuestManager.createQuest(
      levelId,
      QuestType.EXPLORE_ROOMS,
      giverEntity.id,
      'Explore the Level',
      `Explore at least ${requiredTiles} different locations on this level.`,
      [
        {
          description: 'Explore new areas',
          current: 0,
          required: requiredTiles,
          completed: false,
        },
      ],
      {
        health: 5,
      },
      [
        'I\'d like to know more about this place.',
        'Would you explore and tell me what you find?',
      ],
      [
        'You\'ve covered quite a bit of ground!',
        'Thanks for investigating.',
      ],
      [
        'Have you explored everything yet?',
        'There\'s still more to discover...',
      ]
    );
  }

  /**
   * Create a custom quest from parameters
   */
  static createCustomQuest(
    levelId: number,
    type: QuestType,
    giverEntity: Entity,
    title: string,
    description: string,
    objectives: QuestObjective[],
    rewards: QuestReward,
    dialogueOnGive: string[],
    dialogueOnComplete: string[],
    dialogueOnActive: string[]
  ): Quest {
    return QuestManager.createQuest(
      levelId,
      type,
      giverEntity.id,
      title,
      description,
      objectives,
      rewards,
      dialogueOnGive,
      dialogueOnComplete,
      dialogueOnActive
    );
  }
}
