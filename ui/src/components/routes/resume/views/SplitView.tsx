import { useEffect, useRef, useState } from 'react';
import { Header } from '../../../ui/Header';
import { Modal } from '../../../ui/Modal';
import { ChatMessage } from '../../../features/chat/ChatMessage';
import { LoadingIndicator } from '../../../features/chat/LoadingIndicator';
import { ThinkingCollapsible } from '../../../features/chat/ThinkingCollapsible';
import { ChatInput } from '../../../features/chat/ChatInput';
import { StartOverButton } from '../../../features/chat/StartOverButton';
import { ArtifactsPanel } from '../../../features/artifacts/ArtifactsPanel';
import { ShareModal } from '../../../features/share/ShareModal';
import type { Message } from '../../../domain/types';
import type { Artifacts } from '../../../../utils/chatApi';

interface SplitViewProps {
  conversationId: string;
  messages: Message[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  isLoading: boolean;
  streamingText: string | null;
  streamingThinking?: string | null;
  activeTab: 'brief' | 'experience';
  onTabChange: (tab: 'brief' | 'experience') => void;
  artifacts: Artifacts | null;
  showModal: boolean;
  onModalOpen: () => void;
  onModalClose: () => void;
  onStartOver: () => void;
  thinkingEnabled?: boolean;
  onThinkingChange?: (enabled: boolean) => void;
}

export function SplitView({ 
  conversationId,
  messages, 
  inputValue, 
  onInputChange, 
  onSend, 
  isLoading,
  streamingText,
  streamingThinking,
  activeTab,
  onTabChange,
  artifacts,
  showModal,
  onModalOpen,
  onModalClose,
  onStartOver,
  thinkingEnabled = true,
  onThinkingChange,
}: SplitViewProps) {
  const [showStartOverModal, setShowStartOverModal] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [isChatExpandedMobile, setIsChatExpandedMobile] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  
  // Mark as entered after mount animation completes
  useEffect(() => {
    const timer = setTimeout(() => setHasEntered(true), 600);
    return () => clearTimeout(timer);
  }, []);

  // Track whether user is near bottom (avoid yanking when reading history)
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;

    const update = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      setShouldAutoScroll(distanceFromBottom < 96);
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  }, []);

  // Auto-scroll during new messages / streaming while user is at bottom
  useEffect(() => {
    if (!shouldAutoScroll) return;
    const behavior: ScrollBehavior = streamingText !== null || isLoading ? 'auto' : 'smooth';
    const id = requestAnimationFrame(() => {
      chatBottomRef.current?.scrollIntoView({ behavior, block: 'end' });
    });
    return () => cancelAnimationFrame(id);
  }, [messages, streamingText, isLoading, shouldAutoScroll]);

  const handleStartOverClick = () => {
    setShowStartOverModal(true);
  };

  const handleStartOverConfirm = () => {
    setShowStartOverModal(false);
    onStartOver();
  };

  const handleStartOverCancel = () => {
    setShowStartOverModal(false);
  };

  const handleChatToggle = () => {
    setIsChatExpandedMobile((prev) => !prev);
  };

  const handleSend = () => {
    setIsChatExpandedMobile(true);
    onSend(inputValue);
  };

  return (
    <div className="v2-concept h-screen flex flex-col overflow-hidden">
      <Header />
      
      {/* Split view - fixed height, no page scroll */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden pt-14">
        {/* Left: Artifacts */}
        <ArtifactsPanel 
          activeTab={activeTab}
          onTabChange={onTabChange}
          artifacts={artifacts}
          onShareClick={onModalOpen}
          isStreaming={isLoading}
          messageCount={messages.length}
          className={!hasEntered ? 'split-artifact-enter' : ''}
        />
        
        {/* Right: Chat */}
        <div className={`fixed inset-x-0 bottom-0 z-20 w-full flex flex-col bg-[rgba(20,20,20,0.8)] backdrop-blur-md border-t border-[var(--v2-border-subtle)] shadow-[0_-10px_30px_rgba(0,0,0,0.35)] overflow-hidden lg:static lg:z-auto lg:w-1/2 lg:flex-1 lg:bg-[var(--v2-bg-elevated)] lg:backdrop-blur-none lg:border-t-0 lg:shadow-none ${
          isChatExpandedMobile ? 'h-[70vh]' : 'h-[136px]'
        } lg:h-auto ${!hasEntered ? 'split-chat-enter' : ''}`}>
          {/* Mobile expand/collapse control */}
          <div className="flex-shrink-0 lg:hidden px-3 py-1 border-b border-[var(--v2-border-subtle)] flex items-center justify-center">
            <button
              type="button"
              onClick={handleChatToggle}
              aria-label={isChatExpandedMobile ? 'Collapse conversation' : 'Expand conversation'}
              className="w-10 h-6 flex items-center justify-center text-[var(--v2-text-secondary)] hover:text-[var(--v2-text)] transition-colors"
            >
              <svg
                viewBox="0 0 24 24"
                className={`w-5 h-5 transition-transform duration-200 ${isChatExpandedMobile ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 15 12 9 18 15" />
              </svg>
            </button>
          </div>

          {/* Chat heading with Start Over button (desktop only) */}
          <div className="hidden lg:flex flex-shrink-0 px-6 py-4 border-b border-[var(--v2-border-subtle)] items-center justify-between">
            <h2 className="text-lg font-medium text-[var(--v2-text)]">
              {artifacts?.fitBrief?.title || 'Conversation'}
            </h2>
            <StartOverButton onClick={handleStartOverClick} />
          </div>
          
          {/* Scrollable chat area */}
          <div
            ref={chatScrollRef}
            className={`flex-1 overflow-y-auto p-4 pb-3 lg:p-6 lg:pb-4 ${isChatExpandedMobile ? '' : 'hidden lg:block'}`}
          >
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <ChatMessage key={idx} message={msg} index={idx} isInSplitView />
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
                  isInSplitView
                  isStreaming
                />
              )}
              
              {/* Show loading dots only before streaming/thinking starts */}
              {isLoading && streamingText === null && streamingThinking === null && <LoadingIndicator isInSplitView />}

              <div ref={chatBottomRef} />
            </div>
          </div>
          
          {/* Fixed input at bottom with gradient fade */}
          <div className="flex-shrink-0 bg-gradient-to-t from-[var(--v2-bg-elevated)] via-[var(--v2-bg-elevated)] to-transparent pt-4 pb-3 px-3 lg:pt-6 lg:pb-4 lg:px-4">
            <ChatInput
              value={inputValue}
              onChange={onInputChange}
              onSend={handleSend}
              placeholder="Ask about this role..."
              isLoading={isLoading}
              variant="split"
              thinkingEnabled={thinkingEnabled}
              onThinkingChange={onThinkingChange}
            />
          </div>
        </div>
      </div>
      
      {/* Share Modal */}
      <ShareModal
        isOpen={showModal}
        onClose={onModalClose}
        conversationId={conversationId}
        activeTab={activeTab}
        messages={messages}
        artifacts={artifacts}
      />
      
      {/* Start Over Modal */}
      <Modal
        isOpen={showStartOverModal}
        onClose={handleStartOverCancel}
        title="Start over?"
        buttonOrder="secondary-first"
        primaryButton={{
          label: 'Start over',
          onClick: handleStartOverConfirm,
          variant: 'destructive',
        }}
        secondaryButton={{
          label: 'Cancel',
          onClick: handleStartOverCancel,
        }}
      >
        <p className="text-sm text-[var(--v2-text-tertiary)]">
          This clears the brief + chat and returns to the start screen.
        </p>
      </Modal>
    </div>
  );
}

