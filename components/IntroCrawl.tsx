import React, { useEffect, useState } from 'react';

interface IntroCrawlProps {
  onComplete: () => void;
}

const IntroCrawl: React.FC<IntroCrawlProps> = ({ onComplete }) => {
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), 2000);
    // Auto-complete after animation (approx 60s)
    const endTimer = setTimeout(onComplete, 55000);
    return () => {
      clearTimeout(timer);
      clearTimeout(endTimer);
    };
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden font-sans select-none">
      {/* Skip Button */}
      <button 
        onClick={onComplete}
        className={`absolute bottom-8 right-8 z-50 px-6 py-2 border-2 border-yellow-400 text-yellow-400 font-bold uppercase tracking-widest hover:bg-yellow-400 hover:text-black transition-all duration-500 ${showSkip ? 'opacity-100' : 'opacity-0'}`}
      >
        Skip Intro
      </button>

      {/* Starfield */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-50 animate-pulse"></div>

      {/* Perspective Container */}
      <div className="relative w-full h-full flex justify-center perspective-[300px] overflow-hidden">
        
        {/* Fade Overlay at top to hide text disappearing */}
        <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-black to-transparent z-20"></div>

        {/* The Crawl */}
        <div className="absolute bottom-0 w-[180%] text-yellow-400 font-bold text-justify leading-[1.5] animate-crawl origin-[50%_100%] translate-y-[100%]">
          <div className="max-w-2xl mx-auto text-center mb-24">
            <h1 className="text-6xl mb-4 tracking-tighter">PIXEL SPROUT</h1>
            <h2 className="text-3xl tracking-widest mb-12">THE LOST SEED</h2>
          </div>

          <div className="max-w-xl mx-auto space-y-12 text-3xl">
            <p>
              It is a time of great withering. The world above has turned grey, the rivers dry, and the forests silent.
            </p>
            <p>
              The legendary GOLDEN SEED, source of all natural life, has been stolen by the darkness deep beneath the earth.
            </p>
            <p>
              You are the last Sprout Keeper. Armed only with your wits and a few potions, you must descend into the forgotten depths.
            </p>
            <p>
              Spirits wander these halls—some lost, some greedy. They hold the secrets to the path forward.
            </p>
            <p>
              Find the Seed. Restore the bloom. Before the world fades to dust forever...
            </p>
          </div>
        </div>
      </div>
      
      <style>{`
        .perspective-\\[300px\\] {
          perspective: 300px;
        }
        @keyframes crawl {
          0% {
            top: 100%;
            transform: rotateX(25deg) translateZ(0);
            opacity: 1;
          }
          100% {
            top: -200%;
            transform: rotateX(25deg) translateZ(-2000px);
            opacity: 0;
          }
        }
        .animate-crawl {
          animation: crawl 60s linear forwards;
        }
      `}</style>
    </div>
  );
};

export default IntroCrawl;