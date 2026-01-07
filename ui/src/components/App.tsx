import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { postChat, type Artifacts, type ClientUI } from '../utils/chatApi';
import type { ViewMode, Message } from './types';
import { HandshakeView } from './views/HandshakeView';
import { ChatView } from './views/ChatView';
import { SplitView } from './views/SplitView';

export default function ConceptAApp() {
  const [conversationId] = useState(() => uuidv4());
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('handshake');
  const [chips, setChips] = useState<string[]>([]);
  const [artifacts, setArtifacts] = useState<Artifacts | null>(null);
  const [activeTab, setActiveTab] = useState<'brief' | 'experience'>('brief');
  const [showModal, setShowModal] = useState(false);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);
    setChips([]);

    // Transition from handshake to chat immediately on first message
    if (viewMode === 'handshake') {
      setViewMode('chat');
    }

    try {
      const clientUI: ClientUI = {
        view: viewMode === 'split' ? 'split' : 'chat',
        ...(viewMode === 'split' && { split: { activeTab } }),
      };

      const response = await postChat({
        conversationId,
        client: {
          origin: window.location.origin,
          page: { path: window.location.pathname },
          ui: clientUI,
        },
        messages: newMessages.map(m => ({ role: m.role, text: m.text })),
      });

      const assistantMessage: Message = {
        role: 'assistant',
        text: response.assistant.text,
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update UI based on server directive
      if (response.ui.view === 'split') {
        setViewMode('split');
        if (response.ui.split?.activeTab) {
          setActiveTab(response.ui.split.activeTab);
        }
      }

      // Update chips if provided
      if (response.chips && response.chips.length > 0) {
        setChips(response.chips);
      }

      // Update artifacts if provided
      if (response.artifacts) {
        setArtifacts(response.artifacts);
      }

    } catch (err) {
      const errorMessage: Message = {
        role: 'assistant',
        text: `Sorry — the chat service is unavailable right now. (${err instanceof Error ? err.message : 'unknown error'})`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipSelect = (chip: string) => {
    handleSend(chip);
  };

  const handleModalOpen = () => {
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  // Render appropriate view based on current mode
  switch (viewMode) {
    case 'handshake':
      return (
        <HandshakeView
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          isLoading={isLoading}
        />
      );

    case 'chat':
      return (
        <ChatView
          messages={messages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          isLoading={isLoading}
          chips={chips}
          onChipSelect={handleChipSelect}
        />
      );

    case 'split':
      return (
        <SplitView
          messages={messages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          isLoading={isLoading}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          artifacts={artifacts}
          showModal={showModal}
          onModalOpen={handleModalOpen}
          onModalClose={handleModalClose}
        />
      );

    default:
      return null;
  }
}
