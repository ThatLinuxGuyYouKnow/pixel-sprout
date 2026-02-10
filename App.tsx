import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameState,
  TileType,
  Position,
  Entity,
  GameLog,
  EntityType,
  QuestStatus
} from './types';
import {
  LEVELS,
  VISIBILITY_RADIUS
} from './constants';
import { generateDungeon } from './services/dungeonGenerator';
import GridMap from './components/GridMap';
import Controls from './components/Controls';
import DialogModal from './components/DialogModal';
import IntroCrawl from './components/IntroCrawl';
import { generateNPCDialog, generateDungeonTip, getApiStatus } from './services/geminiService';
import { QuestManager } from './services/questManager';
import { QuestGenerator } from './services/questGenerator';
import SettingsModal from './components/SettingsModal';
import SettingsButton from './components/SettingsButton';

// --- Pure Helper for Interaction Logic ---
const identifyInteraction = (gameState: GameState) => {
  const { playerPos, map, entities, gameOver, gameWon } = gameState;
  if (gameOver || gameWon) return null;

  // 1. Pick Up Item / Stairs (Strictly same tile)
  const item = entities.find(e =>
    (e.type === EntityType.ITEM_POTION || e.type === EntityType.GOAL_SEED) &&
    e.pos.x === playerPos.x &&
    e.pos.y === playerPos.y
  );
  if (item) return { pos: item.pos, type: 'PICKUP' as const, entity: item };

  // Check for Stairs
  if (map[playerPos.y][playerPos.x] === TileType.STAIRS) {
    return { pos: playerPos, type: 'DESCEND' as const, entity: { name: 'Stairs Down' } };
  }

  // 2. Talk to NPC (Adjacent)
  const npc = entities.find(e =>
    (e.type === EntityType.NPC_GHOST || e.type === EntityType.NPC_RAT) &&
    Math.abs(e.pos.x - playerPos.x) <= 1 &&
    Math.abs(e.pos.y - playerPos.y) <= 1
  );
  if (npc) return { pos: npc.pos, type: 'TALK' as const, entity: npc };

  return null;
};

export default function App() {
  // Game Phase State
  const [showIntro, setShowIntro] = useState(true);
  const [tutorialExitOpen, setTutorialExitOpen] = useState(false);
  const [level1TutorialOpen, setLevel1TutorialOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<'ready' | 'missing' | 'error'>('missing');
  const [levelStartPromptOpen, setLevelStartPromptOpen] = useState(false);

  // Initialize Helper
  const initGame = () => {
    const level1Config = LEVELS[0];
    const gen = generateDungeon(level1Config);
    const quests = QuestGenerator.generateQuestsForLevel(1, gen.entities);

    return {
      playerPos: gen.startPos,
      map: gen.map,
      visible: gen.map.map(() => Array(gen.map[0].length).fill(false)),
      explored: gen.map.map(() => Array(gen.map[0].length).fill(false)),
      entities: gen.entities,
      health: 20,
      maxHealth: 20,
      level: 1,
      turn: 0,
      gameOver: false,
      gameWon: false,
      quests: quests,
      activeQuestId: null,
      completedQuestIds: [],
      questLog: [],
    };
  };

  const [gameState, setGameState] = useState<GameState>(initGame);
  const [logs, setLogs] = useState<GameLog[]>([]);

  // Dialog State
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    speaker: '',
    history: [] as { sender: 'player' | 'npc', text: string }[],
    activeEntity: null as Entity | null,
    isLoading: false
  });

  const logsEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string, type: GameLog['type'] = 'info') => {
    setLogs(prev => [...prev, { id: Date.now().toString() + Math.random(), message, type }].slice(-20));
  };

  const activeInteraction = identifyInteraction(gameState);

  // --- Level Transition Helper ---
  const loadLevel = (levelId: number) => {
    const nextLevelConfig = LEVELS.find(l => l.id === levelId);

    if (nextLevelConfig) {
      const gen = generateDungeon(nextLevelConfig);

      const newQuests = QuestGenerator.generateQuestsForLevel(levelId, gen.entities);

      setGameState(prev => ({
        ...prev,
        level: levelId,
        map: gen.map,
        entities: gen.entities,
        playerPos: gen.startPos,
        quests: [...prev.quests, ...newQuests],
        // Reset visibility for new level
        visible: gen.map.map(() => Array(gen.map[0].length).fill(false)),
        explored: gen.map.map(() => Array(gen.map[0].length).fill(false)),
      }));
      addLog(`You descend deeper into ${nextLevelConfig.name}...`, "success");
      setLevelStartPromptOpen(true);
    } else {
      addLog("There is no deeper level.", "info");
    }
  };

  // --- Core Logic ---
  const handleMove = useCallback((dx: number, dy: number) => {
    if (showIntro || level1TutorialOpen || tutorialExitOpen || levelStartPromptOpen || gameState.gameOver || gameState.gameWon || dialogState.isOpen) return;

    setGameState(prev => {
      const newX = prev.playerPos.x + dx;
      const newY = prev.playerPos.y + dy;

      const height = prev.map.length;
      const width = prev.map[0]?.length || 0;
      if (newX < 0 || newX >= width || newY < 0 || newY >= height) return prev;

      if (prev.map[newY][newX] === TileType.WALL) {
        addLog("You bumped into a wall.", "info");
        return prev;
      }

      // Combat Logic: Bump into enemy to attack
      const blockingEntity = prev.entities.find(e => e.pos.x === newX && e.pos.y === newY && (e.type === EntityType.NPC_GHOST || e.type === EntityType.NPC_RAT));
      if (blockingEntity) {
        // Deal damage to enemy
        const playerDamage = 5;
        const newHealth = (blockingEntity.health || blockingEntity.maxHealth || 100) - playerDamage;
        
        const updatedEntities = prev.entities.map(e => {
          if (e.id === blockingEntity.id) {
            return {
              ...e,
              health: newHealth,
              dying: newHealth <= 0
            };
          }
          return e;
        });

        // Enemy retaliation (simple: take damage back if still alive)
        let playerHealth = prev.health;
        if (newHealth > 0 && blockingEntity.type === EntityType.NPC_RAT) {
          const enemyDamage = 3; // Rats deal 3 damage
          playerHealth -= enemyDamage;
          addLog(`You strike ${blockingEntity.name} for ${playerDamage} damage! It retaliates for ${enemyDamage} damage.`, "combat");
        } else if (newHealth <= 0) {
          addLog(`You strike ${blockingEntity.name} for ${playerDamage} damage! It falls.`, "combat");
          // Remove dead entity after a moment
          setTimeout(() => {
            setGameState(s => ({
              ...s,
              entities: s.entities.filter(e => e.id !== blockingEntity.id)
            }));
          }, 300);
        } else {
          addLog(`You strike ${blockingEntity.name} for ${playerDamage} damage.`, "combat");
        }

        // Check if player died
        if (playerHealth <= 0) {
          return {
            ...prev,
            entities: updatedEntities,
            health: 0,
            gameOver: true,
            turn: prev.turn + 1
          };
        }

        return {
          ...prev,
          entities: updatedEntities,
          health: playerHealth,
          turn: prev.turn + 1
        };
      }

      // FOV
      const nextVisible = Array(height).fill(null).map(() => Array(width).fill(false));
      const nextExplored = prev.explored.map(row => [...row]);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dist = Math.sqrt(Math.pow(x - newX, 2) + Math.pow(y - newY, 2));
          if (dist <= VISIBILITY_RADIUS) {
            nextVisible[y][x] = true;
            if (nextExplored[y]) nextExplored[y][x] = true;
          }
        }
      }

      const nextState = {
        ...prev,
        playerPos: { x: newX, y: newY },
        visible: nextVisible,
        explored: nextExplored,
        turn: prev.turn + 1
      };

      // --- Quest Progress: Exploration ---
      const activeQuest = QuestManager.getActiveQuest(nextState);
      if (activeQuest && activeQuest.type === 'EXPLORE_ROOMS') {
        // Count explored tiles
        let exploredCount = 0;
        nextState.explored.forEach(row => row.forEach(cell => { if (cell) exploredCount++; }));

        const updatedQuest = QuestManager.updateObjective(activeQuest, 0, exploredCount);
        if (updatedQuest !== activeQuest) {
          const withQuestUpdate = {
            ...nextState,
            quests: nextState.quests.map(q => q.id === activeQuest.id ? updatedQuest : q)
          };

          if (QuestManager.allObjectivesCompleted(updatedQuest)) {
            return QuestManager.completeQuest(updatedQuest, withQuestUpdate);
          }
          return withQuestUpdate;
        }
      }

      return nextState;
    });
  }, [gameState.gameOver, gameState.gameWon, dialogState.isOpen, showIntro, level1TutorialOpen, tutorialExitOpen, levelStartPromptOpen]);

  const handleWait = () => {
    if (showIntro || level1TutorialOpen || tutorialExitOpen || levelStartPromptOpen || gameState.gameOver || dialogState.isOpen) return;
    setGameState(prev => ({
      ...prev,
      turn: prev.turn + 1,
      health: Math.min(prev.health + 1, prev.maxHealth)
    }));
    addLog("You rest for a moment...", "info");

    if (Math.random() > 0.8) {
      generateDungeonTip(gameState).then(tip => addLog(tip, 'info'));
    }
  };

  const handleInteract = async () => {
    if (dialogState.isOpen || level1TutorialOpen || tutorialExitOpen || levelStartPromptOpen) return;

    const interaction = identifyInteraction(gameState);
    if (!interaction) {
      addLog("Nothing to interact with here.", "info");
      return;
    }

    const target = interaction.entity;

    // --- Progression Check (Level 1) ---
    if (interaction.type === 'DESCEND') {
      const level1Quest = gameState.quests.find(q => q.levelId === 1);

      if (level1Quest && level1Quest.status !== QuestStatus.COMPLETED) {
        addLog("The path below is barred by a spectral force. Talk to the Spirit first.", "info");
        return;
      }

      loadLevel(gameState.level + 1);
      return;
    }

    // Handle Pickup
    if (interaction.type === 'PICKUP' && 'type' in target) { // Type guard for Entity
      if (target.type === EntityType.ITEM_POTION) {
        setGameState(prev => ({
          ...prev,
          health: Math.min(prev.health + 10, prev.maxHealth),
          entities: prev.entities.filter(e => e.id !== target.id)
        }));
        addLog("You drank the potion! Health restored.", "success");
      } else if (target.type === EntityType.GOAL_SEED) {
        setGameState(prev => ({
          ...prev,
          gameWon: true,
          entities: prev.entities.filter(e => e.id !== target.id)
        }));
        addLog("YOU FOUND THE GOLDEN SEED! NATURE IS RESTORED!", "success");
      }
      return;
    }

    // Handle Talk
    if (interaction.type === 'TALK' && 'type' in target) {
      // Simple combat simulation for Rats (since they are enemies)
      if (target.type === EntityType.NPC_RAT) {
        const damage = 5;
        const currentHealth = target.health || 0;
        const newHealth = Math.max(0, currentHealth - damage);

        addLog(`You hit the ${target.name} for ${damage} damage! (${newHealth}/${target.maxHealth})`, "combat");

        if (newHealth <= 0) {
          // Mark as dying
          setGameState(prev => {
            let newState = {
              ...prev,
              entities: prev.entities.map(e => e.id === target.id ? { ...e, health: newHealth, dying: true } : e)
            };

            // --- Quest Progress: Combat ---
            const activeQuest = QuestManager.getActiveQuest(newState);
            if (activeQuest && activeQuest.type === 'KILL_RATS') {
              const currentKills = activeQuest.objectives[0].current + 1;
              const updatedQuest = QuestManager.updateObjective(activeQuest, 0, currentKills);

              newState = {
                ...newState,
                quests: newState.quests.map(q => q.id === activeQuest.id ? updatedQuest : q)
              };

              if (QuestManager.allObjectivesCompleted(updatedQuest)) {
                newState = QuestManager.completeQuest(updatedQuest, newState);
              }
            }

            return newState;
          });

          // Remove after delay
          setTimeout(() => {
            setGameState(prev => ({
              ...prev,
              entities: prev.entities.filter(e => e.id !== target.id)
            }));
            addLog(`The ${target.name} dies!`, "success");
          }, 800);
        } else {
          // Take damage but don't die
          setGameState(prev => ({
            ...prev,
            entities: prev.entities.map(e => e.id === target.id ? { ...e, health: newHealth } : e)
          }));
        }
        return;
      }

      // --- Quest Start Logic ---
      if (target.type === EntityType.NPC_GHOST) {
        const availableQuest = QuestManager.getAvailableQuests(gameState, gameState.level)
          .find(q => q.giverEntityId === target.id);

        if (availableQuest) {
          setGameState(prev => QuestManager.startQuest(availableQuest, prev));
          setDialogState({
            isOpen: true,
            speaker: target.name,
            activeEntity: target,
            history: [{ sender: 'npc', text: QuestManager.getRandomDialogue(availableQuest.dialogueOnGive) }],
            isLoading: false
          });
          return;
        }

        // Check active quest
        const activeQuest = QuestManager.getActiveQuest(gameState);
        if (activeQuest && activeQuest.giverEntityId === target.id) {
          setDialogState({
            isOpen: true,
            speaker: target.name,
            activeEntity: target,
            history: [{ sender: 'npc', text: QuestManager.getRandomDialogue(activeQuest.dialogueOnActive) }],
            isLoading: false
          });
          return;
        }
      }

      setDialogState({
        isOpen: true,
        speaker: target.name,
        activeEntity: target,
        history: [], // Start fresh conversation
        isLoading: false
      });
      // Auto-trigger a greeting?
      handleChatMessage(target, "Hello!");
      return;
    }
  };

  const handleChatMessage = async (npc: Entity, userMessage: string) => {
    setDialogState(prev => ({
      ...prev,
      isLoading: true,
      history: [...prev.history, { sender: 'player', text: userMessage }]
    }));

    const reply = await generateNPCDialog(npc, gameState, userMessage);

    setDialogState(prev => ({
      ...prev,
      isLoading: false,
      history: [...prev.history, { sender: 'npc', text: reply }]
    }));
  };

  // --- Effects ---
  useEffect(() => {
    // Re-calculate FOV on init only (subsequent moves handled by handleMove/loadLevel)
    setGameState(prev => {
      const height = prev.map.length;
      const width = prev.map[0]?.length || 0;
      const nextVisible = Array(height).fill(null).map(() => Array(width).fill(false));
      const nextExplored = prev.explored.map(row => [...row]);

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dist = Math.sqrt(Math.pow(x - prev.playerPos.x, 2) + Math.pow(y - prev.playerPos.y, 2));
          if (dist <= VISIBILITY_RADIUS) {
            nextVisible[y][x] = true;
            if (nextExplored[y]) nextExplored[y][x] = true;
          }
        }
      }
      return { ...prev, visible: nextVisible, explored: nextExplored };
    });

    // Check API status on mount
    setApiStatus(getApiStatus());
  }, []); // Run once on mount to set initial visibility

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (levelStartPromptOpen) {
        setLevelStartPromptOpen(false);
        return;
      }
      if (showIntro || level1TutorialOpen) return; // Disable controls during intro and tutorial
      switch (e.key) {
        case 'ArrowUp': case 'w': handleMove(0, -1); break;
        case 'ArrowDown': case 's': handleMove(0, 1); break;
        case 'ArrowLeft': case 'a': handleMove(-1, 0); break;
        case 'ArrowRight': case 'd': handleMove(1, 0); break;
        case ' ': case 'Enter': handleInteract(); break;
        case '.': handleWait(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleMove, handleInteract, showIntro, level1TutorialOpen, levelStartPromptOpen]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // --- Render ---

  if (showIntro) {
    return <IntroCrawl onComplete={() => {
      setShowIntro(false);
      setLevel1TutorialOpen(true);
      addLog("Welcome to the Cellar. Use Arrow Keys/WASD to move.", "info");
      addLog("Bump into enemies to attack. Talk to spirits for clues.", "info");
    }} />;
  }

  return (
    <div className="h-screen w-screen bg-gray-900 relative overflow-hidden flex flex-col">

      {/* Settings Button */}
      <SettingsButton 
        onClick={() => setSettingsOpen(true)} 
        apiStatus={apiStatus}
      />

      {/* Top HUD Overlay */}
      <div className="absolute top-0 inset-x-0 z-10 p-4 bg-gradient-to-b from-black via-black/50 to-transparent pointer-events-none flex justify-between items-start font-mono text-shadow">
        <div className="flex flex-col">
          <h1 className="text-2xl text-green-500 tracking-tighter drop-shadow-md">PIXEL SPROUT</h1>
          <span className="text-xs text-gray-400">THE LOST SEED</span>
        </div>
        <div className="flex gap-4 text-xl drop-shadow-md">
          <div className="flex items-center gap-1 text-red-500 font-bold">
            <span>♥</span> {gameState.health}/{gameState.maxHealth}
          </div>
          <div className="text-blue-400 font-bold">
            D:{gameState.level}
          </div>
          <div className="text-yellow-500 font-bold">
            T:{gameState.turn}
          </div>
        </div>
      </div>

      {/* Main Game View */}
      <div className="flex-1 overflow-auto flex items-center justify-center bg-[#111] cursor-crosshair">
        <GridMap
          gameState={gameState}
          interactionTarget={activeInteraction ? { pos: activeInteraction.pos, type: activeInteraction.type } : null}
        />
      </div>

      {/* Quest HUD */}
      <div className="absolute top-20 left-4 z-20 pointer-events-none">
        {gameState.activeQuestId && (
          <div className="bg-black/50 p-4 rounded text-white max-w-xs backdrop-blur-sm border-l-4 border-yellow-500">
            <h3 className="text-yellow-400 font-bold mb-1 text-sm tracking-wider uppercase">Current Quest</h3>
            {(() => {
              const quest = QuestManager.getActiveQuest(gameState);
              if (!quest) return null;
              return (
                <div>
                  <div className="font-bold">{quest.title}</div>
                  <div className="text-xs text-gray-300 mt-1">{quest.description}</div>
                  <div className="mt-2 text-xs font-mono text-blue-300">
                    {QuestManager.getActiveObjectives(quest).map((obj, i) => (
                      <div key={i}>- {obj}</div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </div>

      {/* Action Guide Popup */}
      {activeInteraction && !dialogState.isOpen && (
        <div className="absolute bottom-60 sm:bottom-48 inset-x-0 flex justify-center pointer-events-none z-30 animate-in slide-in-from-bottom-2 duration-300">
          <div className={`bg-gray-900/90 text-white px-6 py-2 rounded-full border-2 flex items-center gap-3 shadow-lg backdrop-blur-md ${activeInteraction.type === 'TALK' ? 'border-blue-500 shadow-blue-900/50' : activeInteraction.type === 'DESCEND' ? 'border-purple-500 shadow-purple-900/50' : 'border-green-500 shadow-green-900/50'}`}>
            <span className="text-2xl">
              {activeInteraction.type === 'TALK' ? '💬' : activeInteraction.type === 'DESCEND' ? '🚪' : '✋'}
            </span>
            <div className="flex flex-col leading-none">
              <span className={`text-xs font-bold tracking-wider uppercase ${activeInteraction.type === 'TALK' ? 'text-blue-400' : 'text-gray-300'}`}>
                {activeInteraction.type === 'TALK' ? 'Talk to' : activeInteraction.type === 'DESCEND' ? 'Enter' : 'Pick up'}
              </span>
              <span className="text-lg font-bold">
                {/* Safe access to name */}
                {'name' in activeInteraction.entity ? activeInteraction.entity.name : 'Unknown'}
              </span>
            </div>
            <div className="bg-gray-700 px-2 py-0.5 rounded text-xs border border-gray-500 font-mono ml-2">SPACE</div>
          </div>
        </div>
      )}

      {/* Log Window */}
      <div className="absolute bottom-48 sm:bottom-40 left-4 right-4 z-10 pointer-events-none">
        <div className="max-w-xl mx-auto h-24 flex flex-col justify-end text-shadow-sm">
          {logs.slice(-4).map((log) => (
            <div key={log.id} className={`text-sm sm:text-base mb-0.5 font-bold drop-shadow-md animate-in slide-in-from-bottom-1 ${log.type === 'combat' ? 'text-red-400' :
              log.type === 'success' ? 'text-yellow-400' :
                log.type === 'dialog' ? 'text-green-300' :
                  'text-gray-300'
              }`}>
              {log.type === 'dialog' ? '> ' : ''}{log.message}
            </div>
          ))}
        </div>
      </div>

      <Controls
        onMove={handleMove}
        onInteract={handleInteract}
        onWait={handleWait}
        interactionType={activeInteraction?.type as any}
      />

      {/* Game Over / Won Overlay */}
      {(gameState.gameWon || gameState.gameOver) && (
        <div className="absolute inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-500">
          <h2 className={`text-5xl mb-6 font-bold ${gameState.gameWon ? 'text-yellow-400' : 'text-red-600'}`}>
            {gameState.gameWon ? "VICTORY!" : "GAME OVER"}
          </h2>
          <p className="text-gray-300 mb-8 text-2xl max-w-lg">
            {gameState.gameWon
              ? "You have retrieved the Golden Seed. The dungeon begins to bloom."
              : "You have perished in the deep dark..."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-white text-black font-bold text-xl uppercase hover:bg-gray-200 rounded shadow-lg transform hover:scale-105 transition-all"
          >
            Play Again
          </button>
        </div>
      )}

      {/* Interactive Chat Dialog */}
      <DialogModal
        isOpen={dialogState.isOpen}
        speaker={dialogState.speaker}
        history={dialogState.history}
        isLoading={dialogState.isLoading}
        onClose={() => setDialogState(prev => ({ ...prev, isOpen: false }))}
        onSend={(msg) => dialogState.activeEntity && handleChatMessage(dialogState.activeEntity, msg)}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        apiStatus={apiStatus}
      />

      {/* Level 1 Tutorial Modal */}
      {level1TutorialOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-gray-800 border-4 border-blue-600 p-8 max-w-md text-center shadow-2xl rounded-lg">
            <h2 className="text-3xl font-bold text-blue-400 mb-6 tracking-wide">TUTORIAL</h2>
            <div className="text-gray-300 text-lg mb-8 leading-relaxed space-y-4 text-left">
              <div className="flex gap-3">
                <span className="text-blue-400 text-xl font-bold">⬆️⬇️⬅️➡️</span>
                <p><span className="text-blue-400 font-bold">Move:</span> Arrow Keys or WASD to explore the Cellar</p>
              </div>
              <div className="flex gap-3">
                <span className="text-green-400 text-xl font-bold">💬</span>
                <p><span className="text-green-400 font-bold">Talk:</span> Stand next to spirits to chat and receive quests</p>
              </div>
              <div className="flex gap-3">
                <span className="text-red-400 text-xl font-bold">💥</span>
                <p><span className="text-red-400 font-bold">Combat:</span> Bump into enemies to attack. Multiple hits may be needed!</p>
              </div>
              <div className="flex gap-3">
                <span className="text-yellow-400 text-xl font-bold">✋</span>
                <p><span className="text-yellow-400 font-bold">Pick Up:</span> SPACE to collect items and use stairs</p>
              </div>
              <div className="mt-4 p-3 bg-blue-900/40 border-l-4 border-blue-500 rounded">
                <p className="text-blue-200 italic font-mono text-sm">
                  The stairs are locked until you help the restless spirit explore the cellar.
                </p>
              </div>
            </div>
            <button
              onClick={() => setLevel1TutorialOpen(false)}
              className="w-full py-3 bg-blue-700 hover:bg-blue-600 border-2 border-blue-500 text-white font-bold text-lg uppercase tracking-wider rounded transition-colors"
            >
              Understood
            </button>
          </div>
        </div>
      )}

      {/* Level Start Prompt */}
      {levelStartPromptOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-gray-800 border-4 border-cyan-600 p-8 max-w-md text-center shadow-2xl rounded-lg animate-out fade-out duration-300">
            <p className="text-cyan-400 text-xl mb-4 font-bold tracking-wide uppercase">
              {LEVELS.find(l => l.id === gameState.level)?.name}
            </p>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              You stand at the threshold of a new world.
            </p>
            <div className="flex items-center justify-center gap-2 text-cyan-300 font-mono text-lg">
              <span className="text-2xl animate-pulse">▶</span>
              <span>Press any key to begin</span>
              <span className="text-2xl animate-pulse">◀</span>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Exit Modal */}
      {tutorialExitOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-gray-800 border-4 border-yellow-600 p-8 max-w-md text-center shadow-2xl rounded-lg">
            <h2 className="text-3xl font-bold text-yellow-500 mb-4 tracking-wide">TUTORIAL COMPLETE</h2>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed">
              You are about to leave the safety of the Cellar. <br />
              Below, the dangers are real. The spirits are restless.<br />
              <span className="text-yellow-300 font-bold block mt-2">There is no turning back.</span>
            </p>
            <button
              onClick={() => {
                setTutorialExitOpen(false);
                loadLevel(2);
              }}
              className="w-full py-4 bg-yellow-700 hover:bg-yellow-600 border-2 border-yellow-500 text-white font-bold text-xl uppercase tracking-wider rounded transition-colors"
            >
              Enter the Depths
            </button>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-30 bg-[length:100%_2px,3px_100%] opacity-20"></div>
    </div>
  );
}