import React from 'react';
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Search, 
  Hand,
  MessageCircle,
  Grab,
  DoorOpen
} from 'lucide-react';

interface ControlsProps {
  onMove: (dx: number, dy: number) => void;
  onInteract: () => void;
  onWait: () => void;
  interactionType?: 'TALK' | 'PICKUP' | 'DESCEND' | null;
}

const Controls: React.FC<ControlsProps> = ({ onMove, onInteract, onWait, interactionType }) => {
  const btnClass = "w-16 h-16 bg-gray-800/80 backdrop-blur-sm border-2 border-gray-600 active:border-gray-500 active:bg-gray-700 text-white rounded-lg flex items-center justify-center shadow-lg touch-manipulation transition-transform active:scale-95";

  // Determine action button appearance
  let ActionIcon = Hand;
  let actionColor = "bg-gray-700/80 border-gray-500";
  
  if (interactionType === 'TALK') {
    ActionIcon = MessageCircle;
    actionColor = "bg-blue-700/80 border-blue-500 animate-pulse";
  } else if (interactionType === 'PICKUP') {
    ActionIcon = Grab;
    actionColor = "bg-green-700/80 border-green-500 animate-pulse";
  } else if (interactionType === 'DESCEND') {
    ActionIcon = DoorOpen;
    actionColor = "bg-purple-700/80 border-purple-500 animate-pulse";
  }

  return (
    <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8 flex justify-between items-end pointer-events-none z-20">
      
      {/* D-Pad Cluster (Left) */}
      <div className="pointer-events-auto flex flex-col gap-2">
        <div className="flex justify-center">
            <button className={btnClass} onClick={() => onMove(0, -1)} aria-label="Up">
            <ArrowUp size={32} />
            </button>
        </div>
        <div className="flex gap-2">
            <button className={btnClass} onClick={() => onMove(-1, 0)} aria-label="Left">
            <ArrowLeft size={32} />
            </button>
            <button className={`${btnClass} bg-yellow-900/80 border-yellow-700`} onClick={onWait} aria-label="Wait">
            <Search size={28} />
            </button>
            <button className={btnClass} onClick={() => onMove(1, 0)} aria-label="Right">
            <ArrowRight size={32} />
            </button>
        </div>
        <div className="flex justify-center">
            <button className={btnClass} onClick={() => onMove(0, 1)} aria-label="Down">
            <ArrowDown size={32} />
            </button>
        </div>
      </div>

      {/* Action Buttons (Right) */}
      <div className="pointer-events-auto flex flex-col items-end gap-4 mb-2">
        <button 
            className={`w-20 h-20 rounded-full backdrop-blur-sm border-4 text-white flex items-center justify-center shadow-xl active:scale-95 transition-all ${actionColor}`}
            onClick={onInteract}
            aria-label="Interact"
        >
            <ActionIcon size={36} />
        </button>
      </div>
    </div>
  );
};

export default Controls;