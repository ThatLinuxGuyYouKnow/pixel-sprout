import { GoogleGenAI } from "@google/genai";
import { Entity, GameState, TileType } from "../types";
import { LEVELS } from "../constants";

// Initialize Gemini AI client (can be null if no API key)
let ai: GoogleGenAI | null = null;
let apiStatus: 'ready' | 'missing' | 'error' = 'missing';

// Get API key from multiple sources in priority order:
// 1. localStorage (user-provided at runtime)
// 2. Vite environment variable
// 3. Process environment variable
const getApiKey = (): string => {
  if (typeof window !== 'undefined' && localStorage) {
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) return savedKey;
  }
  return import.meta.env.VITE_GEMINI_API_KEY || process.env.API_KEY || '';
};

// Initialize AI client
const initializeAI = () => {
  try {
    const apiKey = getApiKey();
    if (apiKey && apiKey.trim()) {
      ai = new GoogleGenAI({ apiKey });
      apiStatus = 'ready';
      console.log('✓ Gemini API initialized');
    } else {
      ai = null;
      apiStatus = 'missing';
    }
  } catch (error) {
    console.error('Failed to initialize Gemini API:', error);
    ai = null;
    apiStatus = 'error';
  }
};

// Initialize on module load
initializeAI();

// Export for status checking
export const getApiStatus = (): 'ready' | 'missing' | 'error' => apiStatus;

// Allow re-initialization (called when user saves API key)
export const reinitializeAPI = () => {
  initializeAI();
};

// Helper to get cardinal direction
const getDirection = (from: {x: number, y: number}, to: {x: number, y: number}) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    
    let dir = "";
    if (dy < -3) dir += "North";
    else if (dy > 3) dir += "South";
    
    if (dx < -3) dir += dir ? "-West" : "West";
    else if (dx > 3) dir += dir ? "-East" : "East";
    
    return dir || "very close by";
};

// Hardcoded hint generator for when API key is unavailable
const generateHardcodedHint = (npc: Entity, gameState: GameState, playerQuery: string, relativeDir: string): string => {
  const hints: Record<string, string[]> = {
    north: [
      "I feel a cold draft from the North...",
      "The spirits whisper of something beyond the northern reach.",
      "Listen... the northern passage calls.",
      "Something stirs in the darkness to the North."
    ],
    south: [
      "The deeper chambers lie to the South.",
      "I sense warmth rising from the Southern depths.",
      "The path forward spirals down to the South.",
      "Ancient echoes reverberate from the South."
    ],
    east: [
      "Seek what lies to the East.",
      "The light grows stronger toward the East.",
      "I feel drawn toward the Eastern reaches.",
      "The way ahead turns East."
    ],
    west: [
      "The way is barred to the West... or is it?",
      "Something moves in the Western shadows.",
      "The West holds secrets yet untold.",
      "A path opens to the West."
    ],
    "north-east": ["The North-East winds carry whispers of your goal."],
    "north-west": ["The North-West is shrouded in mystery."],
    "south-east": ["The South-East depths pulse with ancient power."],
    "south-west": ["The South-West corner calls to you."],
  };

  const dir = relativeDir.toLowerCase();
  const hintArray = hints[dir] || hints.south;
  return hintArray[Math.floor(Math.random() * hintArray.length)];
};

// Hardcoded dungeon tips
const dungeonTips: Record<number, string[]> = {
  1: [
    "The cellar smells of damp earth and forgotten things.",
    "Drips echo through the silence of the Cellar.",
    "Mushrooms glow faintly in the moisture.",
    "The air grows colder as you venture deeper."
  ],
  2: [
    "The stench of the sewers fills your lungs.",
    "Rats skitter in the darkness of these passages.",
    "Water trickles unseen in the murk.",
    "The sewers pulse with forgotten life."
  ],
  3: [
    "Ancient tomes line the shelves of the Library.",
    "Dust motes dance in the pale light.",
    "Knowledge sleeps in these endless halls.",
    "The Library breathes with centuries of secrets."
  ],
  4: [
    "The Deep Dark swallows sound itself.",
    "Nothing survives here that shouldn't.",
    "Shadows writhe with intention.",
    "This place remembers when the world was young."
  ],
  5: [
    "The Sunken Garden awakens with your presence.",
    "Life stirs beneath the stone and soil.",
    "Flowers bloom impossibly in this forgotten place.",
    "The Golden Seed pulses with ancient power."
  ]
};

export const generateNPCDialog = async (
  npc: Entity,
  gameState: GameState,
  playerQuery: string
): Promise<string> => {
  // Find goal (Stairs or Seed)
  let goalPos = { x: 0, y: 0 };
  for(let y=0; y<gameState.map.length; y++) {
      for(let x=0; x<gameState.map[0].length; x++) {
          if (gameState.map[y][x] === TileType.STAIRS) {
             goalPos = { x, y };
          }
      }
  }
  // Fallback for seed entity if level 5
  const seed = gameState.entities.find(e => e.type === 'GOAL_SEED');
  if (seed) goalPos = seed.pos;

  const relativeDir = getDirection(gameState.playerPos, goalPos);

  // If no API key, use hardcoded hints
  if (!ai) {
    return generateHardcodedHint(npc, gameState, playerQuery, relativeDir);
  }

  const currentLevelConfig = LEVELS.find(l => l.id === gameState.level) || LEVELS[0];

  // Persona definitions
  let persona = "";
  if (npc.name.includes("Spirit") || npc.name.includes("Ghost")) {
    persona = "You are a sad, lonely ghost. You speak in riddles.";
  } else if (npc.name.includes("Rat")) {
    persona = "You are a greedy, suspicious rat. You want food.";
  } else {
    persona = "You are a weary dungeon dweller.";
  }

  const prompt = `
    Roleplay Context:
    ${persona}
    Current Location: ${currentLevelConfig.name}.
    
    KEY GAME INFO:
    - The player is asking you: "${playerQuery}"
    - The way forward (Stairs/Goal) is located to the **${relativeDir}** of the player's current position.
    
    Instructions:
    - If the player asks for directions, give them a hint based on the direction provided above (e.g., "Seek the northern warmth").
    - Do NOT explicitly say "Go North East". Use flavor.
    - Keep response under 30 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "...";
  } catch (error) {
    console.error("Gemini Error:", error);
    apiStatus = 'error';
    // Fallback to hardcoded hints on API error
    return generateHardcodedHint(npc, gameState, playerQuery, relativeDir);
  }
};

export const generateDungeonTip = async (gameState: GameState): Promise<string> => {
  const levelId = gameState.level;
  const tips = dungeonTips[levelId] || dungeonTips[1];
  
  // If no API key, use hardcoded tips
  if (!ai) {
    return tips[Math.floor(Math.random() * tips.length)];
  }

  const currentLevelConfig = LEVELS.find(l => l.id === gameState.level) || LEVELS[0];

  const prompt = `
    You are a narrator for a pixel dungeon game.
    Current Level: ${currentLevelConfig.name}.
    Player Health: ${gameState.health}.
    
    Give a one-sentence atmospheric description of the smell, sound, or feeling of this specific level.
  `;

  try {
     const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Watch your step.";
  } catch (error) {
    console.error("Gemini Tip Error:", error);
    // Fallback to hardcoded tips on API error
    return tips[Math.floor(Math.random() * tips.length)];
  }
};