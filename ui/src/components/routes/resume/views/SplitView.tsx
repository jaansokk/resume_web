import { useState } from 'react';
import { Header } from '../../../shared/Header';
import { ChatMessage } from '../../../chat/ChatMessage';
import { LoadingIndicator } from '../../../chat/LoadingIndicator';
import { ChatInput } from '../../../chat/ChatInput';
import { StartOverButton } from '../../../chat/StartOverButton';
import { ArtifactsPanel } from '../../../artifacts/ArtifactsPanel';
import { ShareModal } from '../../../modals/ShareModal';
import { Modal } from '../../../modals/Modal';
import type { Message } from '../../../types';
import type { Artifacts } from '../../../../utils/chatApi';

interface SplitViewProps {
  conversationId: string;
  messages: Message[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  isLoading: boolean;
  activeTab: 'brief' | 'experience';
  onTabChange: (tab: 'brief' | 'experience') => void;
  artifacts: Artifacts | null;
  showModal: boolean;
  onModalOpen: () => void;
  onModalClose: () => void;
  onStartOver: () => void;
}

export function SplitView({ 
  conversationId,
  messages, 
  inputValue, 
  onInputChange, 
  onSend, 
  isLoading,
  activeTab,
  onTabChange,
  artifacts,
  showModal,
  onModalOpen,
  onModalClose,
  onStartOver,
}: SplitViewProps) {
  const [showStartOverModal, setShowStartOverModal] = useState(false);

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
        />
        
        {/* Right: Chat */}
        <div className="flex-1 lg:w-1/2 flex flex-col bg-[var(--v2-bg-elevated)] overflow-hidden">
          {/* Chat heading with Start Over button */}
          <div className="flex-shrink-0 px-6 py-4 border-b border-[var(--v2-border-subtle)] flex items-center justify-between">
            <h2 className="text-lg font-medium text-[var(--v2-text)]">
              {artifacts?.fitBrief?.title || 'Conversation'}
            </h2>
            <StartOverButton onClick={handleStartOverClick} />
          </div>
          
          {/* Scrollable chat area */}
          <div className="flex-1 overflow-y-auto p-6 pb-4">
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <ChatMessage key={idx} message={msg} index={idx} isInSplitView />
              ))}
              {isLoading && <LoadingIndicator isInSplitView />}
            </div>
          </div>
          
          {/* Fixed input at bottom with gradient fade */}
          <div className="flex-shrink-0 bg-gradient-to-t from-[var(--v2-bg-elevated)] via-[var(--v2-bg-elevated)] to-transparent pt-6 pb-4 px-4">
            <ChatInput
              value={inputValue}
              onChange={onInputChange}
              onSend={() => onSend(inputValue)}
              placeholder="Ask about this role..."
              isLoading={isLoading}
              variant="split"
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

