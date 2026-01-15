import { useEffect, useRef, useState } from 'react';
import { Header } from '../../../ui/Header';
import { BackgroundOverlay } from '../../../ui/BackgroundOverlay';
import { ChatMessage } from '../../../features/chat/ChatMessage';
import { LoadingIndicator } from '../../../features/chat/LoadingIndicator';
import { ChipList } from '../../../features/chat/ChipList';
import { ChatInput } from '../../../features/chat/ChatInput';
import type { Message } from '../../../domain/types';

interface ChatViewProps {
  messages: Message[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  isLoading: boolean;
  streamingText: string | null;
  chips: string[];
  onChipSelect: (chip: string) => void;
  isExiting?: boolean;
}

export function ChatView({ 
  messages, 
  inputValue, 
  onInputChange, 
  onSend, 
  isLoading,
  streamingText,
  chips,
  onChipSelect,
  isExiting = false,
}: ChatViewProps) {
  const [contentOverflows, setContentOverflows] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
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
  }, [messages, streamingText, isLoading]);

  // Track whether user is near bottom (avoid yanking when reading history)
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;

    const update = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShouldAutoScroll(distanceFromBottom < 96);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  }, []);

  // Auto-scroll to bottom in chat view (including streaming)
  useEffect(() => {
    if (!shouldAutoScroll) return;
    const behavior: ScrollBehavior = streamingText !== null || isLoading ? 'auto' : 'smooth';
    const id = requestAnimationFrame(() => {
      chatBottomRef.current?.scrollIntoView({ behavior, block: 'end' });
    });
    return () => cancelAnimationFrame(id);
  }, [messages, streamingText, isLoading, shouldAutoScroll]);

  return (
    <div className="v2-concept min-h-screen flex flex-col relative overflow-hidden">
      <Header transparent />
      <BackgroundOverlay isFadingToBlack={isExiting} />

      {/* Main content area */}
      <div 
        ref={chatContainerRef}
        className={`relative z-10 flex-1 flex flex-col overflow-y-auto px-6 pt-20 pb-24 transition-all duration-500 ${
          !contentOverflows ? 'justify-center' : 'justify-start pt-24'
        } ${isExiting ? 'chat-view-exit' : ''}`}
      >
        {/* Chat messages */}
        <div className={`w-full max-w-2xl mx-auto ${!contentOverflows ? '' : 'mt-4'}`}>
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg} index={idx} />
            ))}
            
            {/* Show streaming message if active */}
            {streamingText !== null && (
              <ChatMessage 
                message={{ role: 'assistant', text: streamingText }}
                index={messages.length}
                isStreaming
              />
            )}
            
            {/* Show loading dots only before streaming starts */}
            {isLoading && streamingText === null && <LoadingIndicator />}
          </div>
          
          {/* Follow-up chips */}
          {!isLoading && <ChipList chips={chips} onChipSelect={onChipSelect} />}

          <div ref={chatBottomRef} />
        </div>
      </div>
      
      {/* Fixed input at bottom */}
      <div className={`fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--v2-bg)] via-[var(--v2-bg)] to-transparent pt-8 pb-6 px-6 z-20 transition-all duration-500 ${
        isExiting ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
      }`}>
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

