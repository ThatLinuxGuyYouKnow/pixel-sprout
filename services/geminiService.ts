import { GoogleGenAI } from "@google/genai";
import { Entity, GameState, TileType } from "../types";
import { LEVELS } from "../constants";

const apiKey = process.env.API_KEY || '';
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

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

export const generateNPCDialog = async (
  npc: Entity,
  gameState: GameState,
  playerQuery: string
): Promise<string> => {
  if (!ai) return "I cannot speak... (Missing API Key)";

  const currentLevelConfig = LEVELS.find(l => l.id === gameState.level) || LEVELS[0];
  
  // Find goal (Stairs or Seed)
  // For levels 1-4, we look for stairs in the map.
  // But stairs are a TileType, not an entity in our state except implicitly. 
  // However, we don't store stairs position in GameState explicitly, 
  // but we can scan the map for the '>' character.
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
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "...";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "The spirits are silent right now... (API Error)";
  }
};

export const generateDungeonTip = async (gameState: GameState): Promise<string> => {
  if (!ai) return "Survive.";

  const currentLevelConfig = LEVELS.find(l => l.id === gameState.level) || LEVELS[0];

  const prompt = `
    You are a narrator for a pixel dungeon game.
    Current Level: ${currentLevelConfig.name}.
    Player Health: ${gameState.health}.
    
    Give a one-sentence atmospheric description of the smell, sound, or feeling of this specific level.
  `;

  try {
     const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Watch your step.";
  } catch (error) {
    return "Darkness surrounds you.";
  }
};