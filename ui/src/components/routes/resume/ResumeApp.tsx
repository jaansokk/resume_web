import { useEffect, useRef, useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { postChatStream, type Artifacts, type ClientUI } from '../../../utils/chatApi';
import type { Message } from '../../domain/types';
import { HandshakeView } from './views/HandshakeView';
import { ChatView } from './views/ChatView';
import { SplitView } from './views/SplitView';
import { markHasSeenSplit, clearHasSeenSplit } from '../../../utils/navState';
import { loadConversationState, saveConversationState, clearConversationState } from '../../../utils/conversationState';
import { 
  trackChatMessage, 
  trackSplitViewOpened, 
  trackStartOverClicked,
  trackConversationAbandoned 
} from '../../../utils/posthogTracking';

type MainViewMode = 'handshake' | 'chat' | 'split';
type TransitionState = 'idle' | 'chat-to-split';

const TRANSITION_DURATION = 600; // ms

function hasRenderableArtifacts(a: Artifacts | null | undefined): boolean {
  const briefCount = a?.fitBrief?.sections?.length ?? 0;
  const expCount = a?.relevantExperience?.groups?.length ?? 0;
  return briefCount > 0 || expCount > 0;
}

export default function ConceptAApp() {
  // Initialize with defaults to match SSR, then restore from localStorage after mount
  const [conversationId] = useState(() => {
    if (typeof window === 'undefined') return uuidv4();
    const savedState = loadConversationState();
    return savedState?.conversationId ?? uuidv4();
  });
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<MainViewMode>('handshake'); // Always start with handshake for SSR
  const [chips, setChips] = useState<string[]>([]);
  const [artifacts, setArtifacts] = useState<Artifacts | null>(null);
  const [activeTab, setActiveTab] = useState<'brief' | 'experience'>('brief');
  const [showModal, setShowModal] = useState(false);
  const [transitionState, setTransitionState] = useState<TransitionState>('idle');
  const viewModeRef = useRef<MainViewMode>(viewMode);
  const transitionStateRef = useRef<TransitionState>(transitionState);
  const artifactsRef = useRef<Artifacts | null>(artifacts);
  const pendingSplitRef = useRef<{ activeTab?: 'brief' | 'experience' } | null>(null);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    transitionStateRef.current = transitionState;
  }, [transitionState]);

  useEffect(() => {
    artifactsRef.current = artifacts;
  }, [artifacts]);

  // Restore state from localStorage after mount (client-side only)
  useEffect(() => {
    const savedState = loadConversationState();
    if (savedState) {
      if (savedState.messages) setMessages(savedState.messages);
      if (savedState.viewMode) setViewMode(savedState.viewMode);
      if (savedState.chips) setChips(savedState.chips);
      if (savedState.artifacts) setArtifacts(savedState.artifacts);
      if (savedState.activeTab) setActiveTab(savedState.activeTab);
      
      // Update nav label if restoring split view
      if (savedState.viewMode === 'split') {
        markHasSeenSplit();
      }
    }
  }, []);

  // Handle transition from chat to split with animation
  const transitionToSplit = useCallback((newActiveTab?: 'brief' | 'experience', messageCount?: number) => {
    setTransitionState('chat-to-split');
    
    // Track split view opened
    trackSplitViewOpened({
      messageCount: messageCount || messages.length,
      initialTab: newActiveTab || 'brief',
    });
    
    // After exit animation completes, switch to split view
    setTimeout(() => {
      markHasSeenSplit();
      setViewMode('split');
      if (newActiveTab) {
        setActiveTab(newActiveTab);
      }
      setTransitionState('idle');
    }, TRANSITION_DURATION);
  }, [messages.length]);

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

  // Track conversation abandoned if user leaves before reaching split view
  useEffect(() => {
    const handleBeforeUnload = () => {
      if ((viewMode === 'handshake' || viewMode === 'chat') && messages.length > 0) {
        trackConversationAbandoned({
          messageCount: messages.length,
          viewMode: viewMode === 'handshake' ? 'handshake' : 'chat',
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [viewMode, messages.length]);

  const handleSend = async (text: string, isChipClick = false, chipLabel?: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: text.trim() };
    const newMessages = [...messages, userMessage];
    const messageNumber = newMessages.filter(m => m.role === 'user').length;
    let splitTransitionTriggered = false;
    
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);
    setChips([]);
    setStreamingText(''); // Start with empty streaming text

    // Track chat message
    trackChatMessage({
      messageNumber,
      viewMode: viewMode === 'handshake' ? 'handshake' : viewMode,
      isChipClick,
      chipLabel,
    });

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
        // onUiDirective (early)
        (ui) => {
          // If server suggests split early, only transition immediately if we already have
          // something to render on the artifacts side. Otherwise, wait for the final response
          // (avoids entering split with empty artifacts and getting stuck on placeholders).
          if (ui.view !== 'split') return;
          if (splitTransitionTriggered) return;
          if (viewModeRef.current === 'split') return;
          if (transitionStateRef.current === 'chat-to-split') return;
          pendingSplitRef.current = { activeTab: ui.split?.activeTab };
          if (!hasRenderableArtifacts(artifactsRef.current)) return;
          splitTransitionTriggered = true;
          transitionToSplit(ui.split?.activeTab, newMessages.length);
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

          const responseArtifacts = response.artifacts ?? null;
          const canRender = hasRenderableArtifacts(responseArtifacts);

          // Update UI based on server directive
          if (response.ui.view === 'split' && !splitTransitionTriggered && viewModeRef.current !== 'split' && canRender) {
            // Trigger animated transition from chat to split
            splitTransitionTriggered = true;
            transitionToSplit(response.ui.split?.activeTab, newMessages.length + 1);
          } else if (response.ui.view === 'split' && response.ui.split?.activeTab) {
            // Already in split, just update tab
            setActiveTab(response.ui.split.activeTab);
          }

          // Update chips if provided
          if (response.chips && response.chips.length > 0) {
            setChips(response.chips);
          }

          // Update artifacts only when there is something renderable.
          // If we're not in split, keep artifacts null to avoid "loading" placeholders.
          if (canRender && responseArtifacts) {
            setArtifacts(responseArtifacts);
          } else if (viewModeRef.current !== 'split') {
            setArtifacts(null);
          }

          setIsLoading(false);
          pendingSplitRef.current = null;
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
          pendingSplitRef.current = null;
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
    handleSend(chip, true, chip);
  };

  const handleModalOpen = () => {
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  const handleStartOver = () => {
    // Track start over
    trackStartOverClicked({
      messageCount: messages.length,
      viewMode: viewMode as 'chat' | 'split',
    });

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
