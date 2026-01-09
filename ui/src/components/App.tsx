import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { postChat, type Artifacts, type ClientUI } from '../utils/chatApi';
import type { ViewMode, Message } from './types';
import { HandshakeView } from './views/HandshakeView';
import { ChatView } from './views/ChatView';
import { SplitView } from './views/SplitView';
import { ContactView } from './views/ContactView';
import { markHasSeenSplit } from '../utils/navState';
import { loadConversationSessionState, saveConversationSessionState } from '../utils/sessionState';

export default function ConceptAApp() {
  const initialSession = typeof window !== 'undefined' ? loadConversationSessionState() : null;

  const [conversationId] = useState(() => initialSession?.conversationId ?? uuidv4());
  const [messages, setMessages] = useState<Message[]>(() => initialSession?.messages ?? []);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('handshake');
  const [lastNonContactView, setLastNonContactView] = useState<Exclude<ViewMode, 'contact'>>(
    initialSession?.lastNonContactView ?? 'handshake',
  );
  const [chips, setChips] = useState<string[]>(() => initialSession?.chips ?? []);
  const [artifacts, setArtifacts] = useState<Artifacts | null>(() => initialSession?.artifacts ?? null);
  const [activeTab, setActiveTab] = useState<'brief' | 'experience'>(() => initialSession?.activeTab ?? 'brief');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const resume = params.get('resume');

    if (view === 'contact') {
      setLastNonContactView('handshake');
      setViewMode('contact');
      return;
    }

    // Resume link (Chat / Fit Brief & Experience): restore last known non-contact view state.
    if (resume === '1' && initialSession) {
      setViewMode(initialSession.viewMode);
      setLastNonContactView(initialSession.lastNonContactView);
      // If restoring split view, ensure nav label is updated
      if (initialSession.viewMode === 'split') {
        markHasSeenSplit();
      }
    }
  }, []);

  useEffect(() => {
    // Persist conversation state for cross-route navigation (e.g., /cv -> resume).
    // Only persist non-contact states.
    if (viewMode === 'contact') return;
    saveConversationSessionState({
      conversationId,
      viewMode,
      lastNonContactView,
      messages,
      chips,
      artifacts,
      activeTab,
    });
  }, [conversationId, viewMode, lastNonContactView, messages, chips, artifacts, activeTab]);

  const toggleContact = () => {
    setViewMode((curr) => {
      if (curr === 'contact') {
        window.history.replaceState({}, '', window.location.pathname);
        return lastNonContactView;
      }
      setLastNonContactView(curr);
      window.history.replaceState({}, '', '/?view=contact');
      return 'contact';
    });
  };

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
        markHasSeenSplit();
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
          onContactClick={toggleContact}
          isContactActive={false}
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
          onContactClick={toggleContact}
          isContactActive={false}
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
          onContactClick={toggleContact}
          isContactActive={false}
        />
      );

    case 'contact':
      return <ContactView onClose={toggleContact} />;

    default:
      return null;
  }
}
