import {
  GameState,
  Entity,
  EntityType,
  Quest,
  QuestStatus,
  QuestType,
  QuestObjective,
  QuestReward,
  Position,
} from '../types';

// ─── Quest Definitions Per Level ────────────────────────────────────

function createLevelQuests(levelId: number, entities: Entity[]): Quest[] {
  const ghostEntity = entities.find(
    e => e.type === EntityType.NPC_GHOST && e.id.includes(`ghost-${levelId}`)
  );
  const artifactEntity = entities.find(
    e => e.type === EntityType.ITEM_ARTIFACT && e.id === `artifact-level-${levelId}`
  );

  if (!ghostEntity) return [];

  switch (levelId) {
    case 1:
      return [createFetchQuest(levelId, ghostEntity, artifactEntity)];

    case 2:
      return [
        createKillQuest(levelId, ghostEntity, entities),
      ];

    case 3:
      return [createFetchQuest(levelId, ghostEntity, artifactEntity)];

    case 4:
      return [
        createKillQuest(levelId, ghostEntity, entities),
        // Second ghost might have a fetch quest too
        ...createSecondaryQuests(levelId, entities),
      ];

    case 5:
      return [createFinalQuest(levelId, ghostEntity)];

    default:
      return [];
  }
}

function createFetchQuest(
  levelId: number,
  ghost: Entity,
  artifact: Entity | undefined
): Quest {
  const artifactNames: Record<number, string> = {
    1: 'Crystal Shard',
    2: 'Rusted Key',
    3: 'Ancient Tome',
    4: 'Soul Vial',
  };

  const questLore: Record<number, { title: string; desc: string; give: string[]; complete: string[]; active: string[] }> = {
    1: {
      title: 'Shattered Memories',
      desc: 'A wandering spirit asks you to find a Crystal Shard lost somewhere in the ruins.',
      give: [
        'Please... I cannot rest.',
        'A crystal shard — a piece of my soul — lies hidden nearby.',
        'Find it, and I will show you the way forward.',
      ],
      complete: [
        'You found it! I can feel the warmth returning...',
        'The stairs ahead are safe now. Take this blessing.',
      ],
      active: [
        'The shard... it pulses faintly somewhere in this level.',
        'Search the darker corners.',
      ],
    },
    3: {
      title: 'Forgotten Knowledge',
      desc: 'Retrieve the Ancient Tome that holds the key to unsealing the deeper passages.',
      give: [
        'The corruption grows thicker below.',
        'An Ancient Tome lies hidden here — it contains wards against the darkness.',
        'Bring it to me so I may read the incantation.',
      ],
      complete: [
        'Yes... the words are still legible.',
        '*The spirit reads aloud and the air shimmers*',
        'The path below is warded now. Go safely.',
      ],
      active: [
        'The tome... I can sense its pages rustling.',
        'It must be in one of the chambers nearby.',
      ],
    },
  };

  const lore = questLore[levelId] || {
    title: `Spirit's Request (Level ${levelId})`,
    desc: `Find the ${artifactNames[levelId] || 'artifact'} for the spirit.`,
    give: ['I need your help. Find the artifact hidden on this level.'],
    complete: ['Thank you. The way is clear.'],
    active: ['Have you found it yet?'],
  };

  return {
    id: `quest-fetch-${levelId}`,
    levelId,
    type: QuestType.FETCH_ARTIFACT,
    title: lore.title,
    description: lore.desc,
    giverEntityId: ghost.id,
    status: QuestStatus.NOT_STARTED,
    objectives: [
      {
        description: `Find the ${artifactNames[levelId] || 'artifact'}`,
        current: 0,
        required: 1,
        completed: false,
      },
      {
        description: `Return to the spirit`,
        current: 0,
        required: 1,
        completed: false,
      },
    ],
    rewards: {
      health: 15,
      unlockStairs: true,
    },
    revealedEntityIds: artifact ? [artifact.id] : [],
    dialogueOnGive: lore.give,
    dialogueOnComplete: lore.complete,
    dialogueOnActive: lore.active,
  };
}

function createKillQuest(
  levelId: number,
  ghost: Entity,
  entities: Entity[]
): Quest {
  const ratCount = entities.filter(
    e => e.type === EntityType.NPC_RAT && e.id.includes(`rat-${levelId}`)
  ).length;

  const requiredKills = Math.max(1, Math.ceil(ratCount * 0.75));

  const loreByLevel: Record<number, { title: string; give: string[]; complete: string[]; active: string[] }> = {
    2: {
      title: 'Vermin Purge',
      give: [
        'These rats... they are not natural.',
        'The corruption has twisted them into something vile.',
        `Slay at least ${requiredKills} of them and I can cleanse this area.`,
      ],
      complete: [
        'The corruption weakens. I can feel the air clearing.',
        'You have earned passage below.',
      ],
      active: [
        'The rats still skitter in the darkness.',
        `${requiredKills} must fall before I can open the way.`,
      ],
    },
    4: {
      title: 'The Last Stand',
      give: [
        'We are close to the source now.',
        'The rats here are the strongest yet — guardians of the corruption.',
        `Destroy ${requiredKills} of them. I will hold the barrier.`,
      ],
      complete: [
        'It is done. The final passage opens.',
        'What lies below... I pray you are ready.',
      ],
      active: [
        'Keep fighting. They must not be allowed to regroup.',
      ],
    },
  };

  const lore = loreByLevel[levelId] || {
    title: `Rat Hunt (Level ${levelId})`,
    give: [`Kill ${requiredKills} rats on this level.`],
    complete: ['The rats are dealt with. Well done.'],
    active: ['Keep hunting.'],
  };

  return {
    id: `quest-kill-${levelId}`,
    levelId,
    type: QuestType.KILL_RATS,
    title: lore.title,
    description: `Defeat ${requiredKills} corrupted rats to cleanse this level.`,
    giverEntityId: ghost.id,
    status: QuestStatus.NOT_STARTED,
    objectives: [
      {
        description: `Defeat corrupted rats (0/${requiredKills})`,
        current: 0,
        required: requiredKills,
        completed: false,
      },
    ],
    rewards: {
      health: 10,
      hunger: 20,
      unlockStairs: true,
    },
    revealedEntityIds: [],
    dialogueOnGive: lore.give,
    dialogueOnComplete: lore.complete,
    dialogueOnActive: lore.active,
  };
}

function createFinalQuest(levelId: number, ghost: Entity): Quest {
  return {
    id: 'quest-final-seed',
    levelId: 5,
    type: QuestType.FINAL_SEED,
    title: 'The Golden Seed',
    description: 'Find the Golden Seed and restore life to the world above.',
    giverEntityId: ghost.id,
    status: QuestStatus.NOT_STARTED,
    objectives: [
      {
        description: 'Find the Golden Seed',
        current: 0,
        required: 1,
        completed: false,
      },
    ],
    rewards: {
      // Game win condition — handled specially
    },
    revealedEntityIds: [],
    dialogueOnGive: [
      'You have come so far, seeker.',
      'The Golden Seed lies in the heart of this place.',
      'Take it, and the world above may yet bloom again.',
      'But beware — the corruption will not let it go willingly.',
    ],
    dialogueOnComplete: [
      'You hold the seed... I can feel it.',
      'Go now. Plant it where the sun still reaches.',
      'You have saved us all.',
    ],
    dialogueOnActive: [
      'The seed calls to you. Follow its warmth.',
    ],
  };
}

function createSecondaryQuests(levelId: number, entities: Entity[]): Quest[] {
  // If there's a second ghost, create an additional quest
  const ghosts = entities.filter(
    e => e.type === EntityType.NPC_GHOST && e.id.includes(`ghost-${levelId}`)
  );

  if (ghosts.length < 2) return [];

  const secondGhost = ghosts[1];
  const artifact = entities.find(
    e => e.type === EntityType.ITEM_ARTIFACT && e.id === `artifact-level-${levelId}`
  );

  if (!artifact) return [];

  return [
    {
      id: `quest-fetch-secondary-${levelId}`,
      levelId,
      type: QuestType.FETCH_ARTIFACT,
      title: 'Lost Soul Fragment',
      description: 'A second spirit needs your help recovering a Soul Vial.',
      giverEntityId: secondGhost.id,
      status: QuestStatus.NOT_STARTED,
      objectives: [
        { description: 'Find the Soul Vial', current: 0, required: 1, completed: false },
        { description: 'Return to the spirit', current: 0, required: 1, completed: false },
      ],
      rewards: { health: 20, hunger: 15 },
      revealedEntityIds: [artifact.id],
      dialogueOnGive: [
        'Another soul, trapped like me...',
        'A vial containing my essence is hidden here.',
        'Please... find it.',
      ],
      dialogueOnComplete: [
        'I am whole again. Thank you, mortal.',
        'Take my strength — you will need it below.',
      ],
      dialogueOnActive: ['The vial... please hurry.'],
    },
  ];
}

// ─── Quest State Machine ────────────────────────────────────────────

export function initializeQuestsForLevel(gameState: GameState): GameState {
  const quests = createLevelQuests(gameState.currentLevel, gameState.entities);

  // Update ghost dialogue states
  const updatedEntities = gameState.entities.map(entity => {
    const questForGhost = quests.find(q => q.giverEntityId === entity.id);
    if (questForGhost) {
      return {
        ...entity,
        questId: questForGhost.id,
        interactable: true,
        dialogueState: 'quest_available' as const,
      };
    }
    return entity;
  });

  return {
    ...gameState,
    quests,
    entities: updatedEntities,
    activeQuestId: null,
  };
}

export function handleGhostInteraction(
  gameState: GameState,
  ghostEntity: Entity
): { gameState: GameState; dialogue: string[]; questStarted?: boolean; questCompleted?: boolean } {
  const quest = gameState.quests.find(q => q.giverEntityId === ghostEntity.id);

  if (!quest) {
    return {
      gameState,
      dialogue: ['The spirit stares at you silently, then fades slightly.'],
    };
  }

  switch (quest.status) {
    // ── Give the quest ──
    case QuestStatus.NOT_STARTED: {
      const updatedQuest: Quest = { ...quest, status: QuestStatus.ACTIVE };

      // Reveal hidden entities linked to this quest
      const updatedEntities = gameState.entities.map(entity => {
        if (updatedQuest.revealedEntityIds.includes(entity.id)) {
          return { ...entity, hidden: false };
        }
        if (entity.id === ghostEntity.id) {
          return { ...entity, dialogueState: 'quest_active' as const };
        }
        return entity;
      });

      const updatedQuests = gameState.quests.map(q =>
        q.id === quest.id ? updatedQuest : q
      );

      return {
        gameState: {
          ...gameState,
          quests: updatedQuests,
          entities: updatedEntities,
          activeQuestId: updatedQuest.id,
          questLog: [
            ...gameState.questLog,
            `[Quest Started] ${updatedQu
