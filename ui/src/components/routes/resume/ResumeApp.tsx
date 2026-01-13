import { useEffect, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { postChatStream, type Artifacts, type ClientUI } from '../../../utils/chatApi';
import type { Message } from '../../domain/types';
import { HandshakeView } from './views/HandshakeView';
import { ChatView } from './views/ChatView';
import { SplitView } from './views/SplitView';
import { markHasSeenSplit, clearHasSeenSplit } from '../../../utils/navState';
import { loadConversationState, saveConversationState, clearConversationState } from '../../../utils/conversationState';

type MainViewMode = 'handshake' | 'chat' | 'split';
type TransitionState = 'idle' | 'chat-to-split';

const TRANSITION_DURATION = 600; // ms

export default function ConceptAApp() {
  // Always auto-restore from localStorage on mount
  const savedState = typeof window !== 'undefined' ? loadConversationState() : null;

  const [conversationId] = useState(() => savedState?.conversationId ?? uuidv4());
  const [messages, setMessages] = useState<Message[]>(() => savedState?.messages ?? []);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<MainViewMode>(() => savedState?.viewMode ?? 'handshake');
  const [chips, setChips] = useState<string[]>(() => savedState?.chips ?? []);
  const [artifacts, setArtifacts] = useState<Artifacts | null>(() => savedState?.artifacts ?? null);
  const [activeTab, setActiveTab] = useState<'brief' | 'experience'>(() => savedState?.activeTab ?? 'brief');
  const [showModal, setShowModal] = useState(false);
  const [transitionState, setTransitionState] = useState<TransitionState>('idle');

  // Handle transition from chat to split with animation
  const transitionToSplit = useCallback((newActiveTab?: 'brief' | 'experience') => {
    setTransitionState('chat-to-split');
    
    // After exit animation completes, switch to split view
    setTimeout(() => {
      markHasSeenSplit();
      setViewMode('split');
      if (newActiveTab) {
        setActiveTab(newActiveTab);
      }
      setTransitionState('idle');
    }, TRANSITION_DURATION);
  }, []);

  // If restoring split view, ensure nav label is updated on mount
  useEffect(() => {
    if (savedState?.viewMode === 'split') {
      markHasSeenSplit();
    }
  }, []);

  // Auto-save conversation state to localStorage whenever it changes
  useEffect(() => {
    saveConversationState({
      conversationId,
      viewMode,
      messages,
      chips,
      artifacts,
      activeTab,
    });
  }, [conversationId, viewMode, messages, chips, artifacts, activeTab]);

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);
    setChips([]);
    setStreamingText(''); // Start with empty streaming text

    // Transition from handshake to chat immediately on first message
    if (viewMode === 'handshake') {
      setViewMode('chat');
    }

    try {
      const clientUI: ClientUI = {
        view: viewMode === 'split' ? 'split' : 'chat',
        ...(viewMode === 'split' && { split: { activeTab } }),
      };

      await postChatStream(
        {
          conversationId,
          client: {
            origin: window.location.origin,
            page: { path: window.location.pathname },
            ui: clientUI,
          },
          messages: newMessages.map(m => ({ role: m.role, text: m.text })),
        },
        // onTextDelta
        (delta: string) => {
          setStreamingText(prev => (prev ?? '') + delta);
        },
        // onDone
        (response) => {
          // Add complete assistant message
          const assistantMessage: Message = {
            role: 'assistant',
            text: response.assistant.text,
          };
          setMessages(prev => [...prev, assistantMessage]);
          setStreamingText(null); // Clear streaming text

          // Update UI based on server directive
          if (response.ui.view === 'split' && viewMode !== 'split') {
            // Trigger animated transition from chat to split
            transitionToSplit(response.ui.split?.activeTab);
          } else if (response.ui.view === 'split' && response.ui.split?.activeTab) {
            // Already in split, just update tab
            setActiveTab(response.ui.split.activeTab);
          }

          // Update chips if provided
          if (response.chips && response.chips.length > 0) {
            setChips(response.chips);
          }

          // Update artifacts if provided
          if (response.artifacts) {
            setArtifacts(response.artifacts);
          }

          setIsLoading(false);
        },
        // onError
        (error) => {
          const errorMessage: Message = {
            role: 'assistant',
            text: `Sorry — the chat service is unavailable right now. (${error.message})`,
          };
          setMessages(prev => [...prev, errorMessage]);
          setStreamingText(null);
          setIsLoading(false);
        }
      );
    } catch (err) {
      const errorMessage: Message = {
        role: 'assistant',
        text: `Sorry — the chat service is unavailable right now. (${err instanceof Error ? err.message : 'unknown error'})`,
      };
      setMessages(prev => [...prev, errorMessage]);
      setStreamingText(null);
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

  const handleStartOver = () => {
    // Clear all conversation state
    clearConversationState();
    clearHasSeenSplit();
    
    // Reset all state to initial values
    setMessages([]);
    setInputValue('');
    setChips([]);
    setArtifacts(null);
    setActiveTab('brief');
    setViewMode('handshake');
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
          streamingText={streamingText}
          chips={chips}
          onChipSelect={handleChipSelect}
          isExiting={transitionState === 'chat-to-split'}
        />
      );

    case 'split':
      return (
        <SplitView
          conversationId={conversationId}
          messages={messages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          isLoading={isLoading}
          streamingText={streamingText}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          artifacts={artifacts}
          showModal={showModal}
          onModalOpen={handleModalOpen}
          onModalClose={handleModalClose}
          onStartOver={handleStartOver}
        />
      );

    default:
      return null;
  }
}
