import { useEffect, useRef, useState } from 'react';
import { Header } from '../shared/Header';
import { BackgroundOverlay } from '../shared/BackgroundOverlay';
import { ChatMessage } from '../chat/ChatMessage';
import { LoadingIndicator } from '../chat/LoadingIndicator';
import { ChipList } from '../chat/ChipList';
import { ChatInput } from '../chat/ChatInput';
import type { Message } from '../types';

interface ChatViewProps {
  messages: Message[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  isLoading: boolean;
  chips: string[];
  onChipSelect: (chip: string) => void;
}

export function ChatView({ 
  messages, 
  inputValue, 
  onInputChange, 
  onSend, 
  isLoading,
  chips,
  onChipSelect
}: ChatViewProps) {
  const [contentOverflows, setContentOverflows] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Check if content overflows viewport
  useEffect(() => {
    const checkOverflow = () => {
      const container = chatContainerRef.current;
      if (container) {
        setContentOverflows(container.scrollHeight > window.innerHeight - 200);
      }
    };
    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [messages]);

  // Auto-scroll to bottom in chat view
  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, isLoading]);

  return (
    <div className="v2-concept min-h-screen flex flex-col relative overflow-hidden">
      <Header />
      <BackgroundOverlay />

      {/* Main content area */}
      <div 
        ref={chatContainerRef}
        className={`relative z-10 flex-1 flex flex-col px-6 pt-20 pb-24 transition-all duration-500 ${
          !contentOverflows ? 'justify-center' : 'justify-start pt-24'
        }`}
      >
        {/* Chat messages */}
        <div className={`w-full max-w-2xl mx-auto ${!contentOverflows ? '' : 'mt-4'}`}>
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg} index={idx} />
            ))}
            
            {isLoading && <LoadingIndicator />}
          </div>
          
          {/* Follow-up chips */}
          {!isLoading && <ChipList chips={chips} onChipSelect={onChipSelect} />}

          <div ref={chatBottomRef} />
        </div>
      </div>
      
      {/* Fixed input at bottom */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--v2-bg)] via-[var(--v2-bg)] to-transparent pt-8 pb-6 px-6 z-20">
        <div className="max-w-2xl mx-auto">
          <ChatInput
            value={inputValue}
            onChange={onInputChange}
            onSend={() => onSend(inputValue)}
            placeholder="Type your message..."
            isLoading={isLoading}
            variant="chat"
          />
        </div>
      </div>
    </div>
  );
}

