import { useEffect, useRef, useState } from 'react';
import { Header } from '../../../ui/Header';
import { BackgroundOverlay } from '../../../ui/BackgroundOverlay';
import { ChatMessage } from '../../../features/chat/ChatMessage';
import { LoadingIndicator } from '../../../features/chat/LoadingIndicator';
import { ThinkingCollapsible } from '../../../features/chat/ThinkingCollapsible';
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
  streamingThinking?: string | null;
  chips: string[];
  onChipSelect: (chip: string) => void;
  isExiting?: boolean;
  thinkingEnabled?: boolean;
  onThinkingChange?: (enabled: boolean) => void;
}

export function ChatView({ 
  messages, 
  inputValue, 
  onInputChange, 
  onSend, 
  isLoading,
  streamingText,
  streamingThinking,
  chips,
  onChipSelect,
  isExiting = false,
  thinkingEnabled = true,
  onThinkingChange,
}: ChatViewProps) {
  const [contentOverflows, setContentOverflows] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const shouldAutoScrollRef = useRef(true);
  const [bottomInsetPx, setBottomInsetPx] = useState(0);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const inputBarRef = useRef<HTMLDivElement | null>(null);

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

  // Measure the fixed bottom input bar so the scroll area always clears it (chips won't hide behind it).
  useEffect(() => {
    const el = inputBarRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setBottomInsetPx(Math.max(0, Math.round(rect.height)));
    };

    update();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(() => update());
      ro.observe(el);
      return () => ro.disconnect();
    }

    // Fallback: update on resize only.
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Track whether user is near bottom (avoid yanking when reading history)
  useEffect(() => {
    const el = chatContainerRef.current;
    if (!el) return;

    const update = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      const next = distanceFromBottom < 96;
      shouldAutoScrollRef.current = next;
      setShouldAutoScroll(next);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  }, []);

  const bottomSpacerHeight =
    bottomInsetPx > 0 ? `calc(${bottomInsetPx}px + env(safe-area-inset-bottom) + 16px)` : '120px';

  // Auto-scroll to bottom in chat view (including streaming)
  useEffect(() => {
    if (!shouldAutoScrollRef.current) return;
    const behavior: ScrollBehavior = streamingText !== null || isLoading ? 'auto' : 'smooth';
    let raf1 = 0;
    let raf2 = 0;

    raf1 = requestAnimationFrame(() => {
      chatBottomRef.current?.scrollIntoView({ behavior, block: 'end' });
      raf2 = requestAnimationFrame(() => {
        chatBottomRef.current?.scrollIntoView({ behavior, block: 'end' });
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [messages, streamingText, isLoading, chips.length, bottomInsetPx]);

  return (
    <div className="v2-concept h-screen flex flex-col relative overflow-hidden">
      <Header transparent />
      <BackgroundOverlay isFadingToBlack={isExiting} />

      {/* Main content area */}
      <div 
        ref={chatContainerRef}
        className={`relative z-10 flex-1 flex flex-col overflow-y-auto px-6 pt-20 ${
          !contentOverflows ? 'justify-center' : 'justify-start pt-24'
        } ${isExiting ? 'chat-view-exit' : ''}`}
      >
        {/* Chat messages */}
        <div className={`w-full max-w-2xl mx-auto ${!contentOverflows ? '' : 'mt-4'}`}>
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <ChatMessage key={idx} message={msg} index={idx} />
            ))}
            
            {/* Show live reasoning blocks while thinking is streaming */}
            {isLoading && streamingThinking != null && streamingText === '' && (
              <ThinkingCollapsible thinking={streamingThinking || ''} isStreaming defaultExpanded />
            )}
            
            {/* Show streaming message if active */}
            {streamingText !== null && streamingText !== '' && (
              <ChatMessage 
                message={{ role: 'assistant', text: streamingText }}
                index={messages.length}
                isStreaming
              />
            )}
            
            {/* Show loading dots only before streaming/thinking starts */}
            {isLoading && streamingText === null && streamingThinking === null && <LoadingIndicator />}
          </div>
          
          {/* Follow-up chips */}
          {!isLoading && <ChipList chips={chips} onChipSelect={onChipSelect} />}

          {/* Ensure the last chips/messages can scroll above the fixed input */}
          <div aria-hidden="true" style={{ height: bottomSpacerHeight }} />

          <div ref={chatBottomRef} aria-hidden="true" />
        </div>
      </div>
      
      {/* Fixed input at bottom */}
      <div
        ref={inputBarRef}
        className={`fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--v2-bg)] via-[var(--v2-bg)] to-transparent pt-8 pb-6 px-6 z-20 transition-all duration-500 ${
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
            thinkingEnabled={thinkingEnabled}
            onThinkingChange={onThinkingChange}
          />
        </div>
      </div>
    </div>
  );
}

