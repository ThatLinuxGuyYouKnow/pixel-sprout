import React from 'react';
import { TileType, Position, GameState, Entity, EntityType } from '../types';
import { COLORS, CHARS } from '../constants';

interface GridMapProps {
  gameState: GameState;
  interactionTarget?: { pos: Position, type: 'TALK' | 'PICKUP' | 'DESCEND' } | null;
}

// Add styles for bobbing animation
const bobStyle = `
  @keyframes bob {
    0%, 100% {
      transform: translateY(0px);
    }
    50% {
      transform: translateY(-4px);
    }
  }
  .animate-bob {
    animation: bob 1.2s ease-in-out infinite;
  }
`;

const GridMap: React.FC<GridMapProps> = ({ gameState, interactionTarget }) => {
  const { map, visible, explored, playerPos, entities } = gameState;

  return (
    <>
      <style>{bobStyle}</style>
      <div className="relative inline-block border-4 border-gray-800 rounded bg-black p-1 shadow-2xl">
        {map.map((row, y) => (
          <div key={y} className="flex">
            {row.map((tile, x) => {
              // Defensive access to visible/explored arrays
              const isVisible = visible?.[y]?.[x] ?? false;
              const isExplored = explored?.[y]?.[x] ?? false;

              // Render logic
              let content = CHARS[tile];
              let bgColor = COLORS[tile];
              let fgColor = 'text-gray-900';
              let opacity = 'opacity-0';
              let animationClass = '';

              if (isVisible) {
                opacity = 'opacity-100';

                // Color adjustments
                if (tile === TileType.GRASS) fgColor = 'text-green-300';
                if (tile === TileType.WATER) fgColor = 'text-blue-300';
                if (tile === TileType.WALL) fgColor = 'text-gray-500';
                if (tile === TileType.DOOR) fgColor = 'text-yellow-600';
                if (tile === TileType.STAIRS) fgColor = 'text-purple-400';

                // Check for entities
                const entityAtPos = entities.find(e => e.pos.x === x && e.pos.y === y);
                if (entityAtPos) {
                  if (entityAtPos.dying) {
                    content = '💀';
                    animationClass = 'animate-ping';
                  } else {
                    switch (entityAtPos.type) {
                      case EntityType.NPC_GHOST: content = '👻'; animationClass = 'animate-pulse'; break;
                      case EntityType.NPC_RAT: content = '🐀'; animationClass = 'animate-bob'; break;
                      case EntityType.ITEM_POTION: content = '🧪'; break;
                      case EntityType.GOAL_SEED: content = '🌰'; animationClass = 'animate-bounce'; break;
                    }
                  }
                }

                // Draw Player
                if (playerPos.x === x && playerPos.y === y) {
                  content = '🧙';
                }

              } else if (isExplored) {
                opacity = 'opacity-30';
                fgColor = 'text-gray-500';
              }

              // Interaction Highlight
              const isTarget = interactionTarget?.pos.x === x && interactionTarget?.pos.y === y;

              return (
                <div
                  key={`${x}-${y}`}
                  className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-xl sm:text-2xl font-bold select-none transition-all duration-300 ${bgColor} ${fgColor} ${opacity} relative`}
                >
                  <span className={animationClass}>{content}</span>

                  {/* Interaction Indicator Overlay */}
                  {isVisible && isTarget && (
                    <div className="absolute -top-5 left-1/2 -translate-x-1/2 z-20 animate-bounce drop-shadow-md text-white text-lg">
                      {interactionTarget?.type === 'TALK' ? '💬' :
                        interactionTarget?.type === 'DESCEND' ? '🚪' : '👇'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </>
  );
};

export default GridMap;