import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle } from 'lucide-react';

interface DialogModalProps {
  isOpen: boolean;
  speaker: string;
  history: { sender: 'player' | 'npc', text: string }[];
  isLoading: boolean;
  onClose: () => void;
  onSend: (message: string) => void;
}

const DialogModal: React.FC<DialogModalProps> = ({ isOpen, speaker, history, isLoading, onClose, onSend }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history, isLoading]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSend(input);
    setInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border-4 border-gray-600 rounded-lg w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">
        
        {/* Header */}
        <div className="bg-gray-800 p-3 border-b-4 border-gray-700 flex justify-between items-center">
             <div className="flex items-center gap-2 text-green-400 font-bold text-xl uppercase tracking-widest">
                <MessageCircle size={24} />
                {speaker}
             </div>
             <button onClick={onClose} className="text-gray-400 hover:text-white font-mono text-xl">X</button>
        </div>
        
        {/* Chat History */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/50 min-h-[300px]">
          {history.length === 0 && !isLoading && (
             <div className="text-gray-600 text-center italic mt-10">Ask me anything...</div>
          )}
          
          {history.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'player' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2 rounded-lg border-2 ${
                    msg.sender === 'player' 
                    ? 'bg-blue-900/40 border-blue-800 text-blue-100 rounded-br-none' 
                    : 'bg-green-900/40 border-green-800 text-green-100 rounded-bl-none'
                }`}>
                    <p className="font-mono text-lg leading-snug">{msg.text}</p>
                </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
                 <div className="bg-gray-800 px-4 py-2 rounded-lg rounded-bl-none border-2 border-gray-700">
                    <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></span>
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></span>
                    </div>
                 </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="p-3 bg-gray-800 border-t-4 border-gray-700 flex gap-2">
            <input 
                ref={inputRef}
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your question..."
                className="flex-1 bg-gray-900 border-2 border-gray-600 text-white px-3 py-2 rounded font-mono focus:border-green-500 outline-none placeholder-gray-600"
                disabled={isLoading}
            />
            <button 
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 bg-green-700 text-white font-bold rounded border-2 border-green-600 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                SEND
            </button>
        </form>
      </div>
    </div>
  );
};

export default DialogModal;