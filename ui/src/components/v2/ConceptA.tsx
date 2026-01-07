import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { postChat, type Artifacts, type ClientUI, type FitBriefSection, type RelevantExperienceGroup, type RelevantExperienceItem } from '../../utils/chatApi';

type ViewMode = 'handshake' | 'chat' | 'split';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

const quickReplies = [
  { id: 'product', label: 'Hiring for Product / PO', icon: '◈' },
  { id: 'engineer', label: 'Product Engineer / AI', icon: '⬡' },
  { id: 'browsing', label: 'Just browsing', icon: '○' },
  { id: 'advising', label: 'Advisor / Consultant', icon: '◇' },
] as const;

// Header component used across all screens
function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4">
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-[var(--v2-accent)]" />
        <span className="text-sm font-medium">Jaan Sokk</span>
      </div>
      <nav className="flex items-center gap-6">
        <a 
          href="#" 
          className="text-xs text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)] transition-colors uppercase tracking-wider"
        >
          CV
        </a>
        <a 
          href="https://linkedin.com/in/jaansokk" 
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)] transition-colors uppercase tracking-wider"
        >
          LinkedIn
        </a>
        <a 
          href="#" 
          className="text-xs text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)] transition-colors uppercase tracking-wider"
        >
          Contact
        </a>
      </nav>
    </header>
  );
}

export default function ConceptAApp() {
  const [conversationId] = useState(() => uuidv4());
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('handshake');
  const [chips, setChips] = useState<string[]>([]);
  const [artifacts, setArtifacts] = useState<Artifacts | null>(null);
  const [activeTab, setActiveTab] = useState<'brief' | 'experience'>('brief');
  const [contentOverflows, setContentOverflows] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  
  // Handshake animation states
  const [showSubline, setShowSubline] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Handshake animation effect
  useEffect(() => {
    if (viewMode === 'handshake') {
      const t1 = setTimeout(() => setShowSubline(true), 800);
      const t2 = setTimeout(() => setShowButtons(true), 1200);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [viewMode]);

  // Check if content overflows viewport
  useEffect(() => {
    if (chatContainerRef.current && viewMode === 'chat') {
      const checkOverflow = () => {
        const container = chatContainerRef.current;
        if (container) {
          setContentOverflows(container.scrollHeight > window.innerHeight - 200);
        }
      };
      checkOverflow();
      window.addEventListener('resize', checkOverflow);
      return () => window.removeEventListener('resize', checkOverflow);
    }
  }, [messages, viewMode]);

  // Auto-scroll to bottom in chat view
  useEffect(() => {
    if (viewMode === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, viewMode, isLoading]);

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

  const handleQuickReply = (label: string) => {
    handleSend(label);
  };

  const handleLinkedInSubmit = () => {
    if (linkedinUrl.trim()) {
      setModalStep(2);
    }
  };

  const openModal = () => {
    setShowModal(true);
    setModalStep(1);
  };

  // Handshake view
  if (viewMode === 'handshake') {
    return (
      <div className="v2-concept min-h-screen flex flex-col relative overflow-hidden">
        <Header />
        
        {/* Background image with heavy overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/20221211-SBW_0367.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/50 to-[#0a0a0a]" />
        
        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(164,198,190,0.03)_0%,transparent_70%)]" />

        {/* Main content area */}
        <div className="relative z-10 flex-1 flex flex-col px-6 pt-20 pb-24 justify-center">
          {/* Hero section */}
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-fade-up opacity-0 mb-6" style={{ animationFillMode: 'forwards' }}>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.15] tracking-[-0.02em]">
                Hey — I'm <span className="v2-serif text-[var(--v2-accent)]">Jaan</span>.<br />
                <span className="text-[var(--v2-text-secondary)]">What kind of product</span><br />
                <span className="text-[var(--v2-text-secondary)]">are you building?</span>
              </h1>
            </div>
            
            {/* Subline */}
            <p 
              className={`text-lg text-[var(--v2-text-secondary)] max-w-md mx-auto mb-10 transition-all duration-700 ${
                showSubline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
            >
              In 60 seconds we'll produce a fit brief you can forward internally to your team.
            </p>
            
            {/* Quick reply chips - 2x2 grid */}
            <div 
              className={`grid grid-cols-2 gap-3 w-full max-w-2xl mx-auto mb-6 transition-all duration-700 ${
                showButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
            >
              {quickReplies.map((reply, idx) => (
                <button
                  key={reply.id}
                  onClick={() => handleQuickReply(reply.label)}
                  className="group flex items-center gap-2 px-4 py-3
                             bg-[var(--v2-bg-elevated)] border border-[var(--v2-border-subtle)] 
                             rounded-full
                             hover:border-[var(--v2-accent)]/30 hover:bg-[var(--v2-bg-card)]
                             transition-all duration-300"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <span className="text-sm text-[var(--v2-text-tertiary)] group-hover:text-[var(--v2-accent)] transition-colors">
                    {reply.icon}
                  </span>
                  <span className="text-sm text-[var(--v2-text-secondary)] group-hover:text-[var(--v2-text)] transition-colors">
                    {reply.label}
                  </span>
                </button>
              ))}
            </div>
            
            {/* Free text input below chips */}
            <div 
              className={`w-full max-w-2xl mx-auto transition-all duration-700 ${
                showButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
              }`}
              style={{ transitionDelay: '100ms' }}
            >
              <div className="bg-[var(--v2-bg-elevated)] border border-[var(--v2-border-subtle)] 
                              rounded-full flex items-center px-2 py-1">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
                  placeholder="Or tell me what you're looking for..."
                  className="flex-1 bg-transparent px-5 py-3 text-sm
                             placeholder:text-[var(--v2-text-tertiary)]
                             focus:outline-none"
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSend(inputValue)}
                  disabled={isLoading}
                  className="px-6 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full
                             text-sm font-medium
                             hover:opacity-90 transition-opacity
                             disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Chat view (single column)
  if (viewMode === 'chat') {
    return (
      <div className="v2-concept min-h-screen flex flex-col relative overflow-hidden">
        <Header />
        
        {/* Background image with heavy overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/20221211-SBW_0367.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/50 to-[#0a0a0a]" />
        
        {/* Subtle radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(164,198,190,0.03)_0%,transparent_70%)]" />

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
                <div 
                  key={idx} 
                  className={`animate-fade-up opacity-0 ${msg.role === 'user' ? 'text-right' : ''}`}
                  style={{ animationFillMode: 'forwards', animationDelay: `${idx * 100}ms` }}
                >
                  <div className={`inline-block max-w-[85%] ${
                    msg.role === 'user' 
                      ? 'bg-[var(--v2-accent-dim)] text-[var(--v2-text)] rounded-3xl rounded-br-lg px-5 py-3'
                      : 'text-left'
                  }`}>
                    {msg.role === 'assistant' && (
                      <div className="text-xs text-[var(--v2-text-tertiary)] mb-2 uppercase tracking-wider">Jaan</div>
                    )}
                    <p className={`text-base leading-relaxed ${msg.role === 'assistant' ? 'text-[var(--v2-text-secondary)]' : ''}`}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="animate-fade-in opacity-0" style={{ animationFillMode: 'forwards' }}>
                  <div className="text-xs text-[var(--v2-text-tertiary)] mb-2 uppercase tracking-wider">Jaan</div>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--v2-text-tertiary)] animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[var(--v2-text-tertiary)] animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-[var(--v2-text-tertiary)] animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
            </div>
            
            {/* Follow-up chips */}
            {chips.length > 0 && !isLoading && (
              <div className="mt-6 flex flex-wrap gap-2 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
                {chips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleChipSelect(chip)}
                    className="px-4 py-2 text-sm rounded-full border border-[var(--v2-border)]
                               text-[var(--v2-text-secondary)] hover:text-[var(--v2-text)]
                               hover:border-[var(--v2-accent)]/50 hover:bg-[var(--v2-accent-dim)]
                               transition-all duration-200"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            <div ref={chatBottomRef} />
          </div>
        </div>
        
        {/* Fixed input at bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--v2-bg)] via-[var(--v2-bg)] to-transparent pt-8 pb-6 px-6 z-20">
          <div className="max-w-2xl mx-auto">
            <div className="bg-[var(--v2-bg-elevated)] border border-[var(--v2-border-subtle)] 
                            rounded-full flex items-center px-2 py-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
                placeholder="Type your message..."
                className="flex-1 bg-transparent px-5 py-3 text-sm
                           placeholder:text-[var(--v2-text-tertiary)]
                           focus:outline-none"
                disabled={isLoading}
              />
              <button
                onClick={() => handleSend(inputValue)}
                disabled={isLoading}
                className="px-6 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full
                           text-sm font-medium
                           hover:opacity-90 transition-opacity
                           disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Split view
  return (
    <div className="v2-concept h-screen flex flex-col overflow-hidden">
      <Header />
      
      {/* Split view - fixed height, no page scroll */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden pt-14">
        {/* Left: Artifacts */}
        <div className="flex-1 lg:w-1/2 border-r border-[var(--v2-border-subtle)] flex flex-col overflow-hidden">
          {/* Fixed header: Tabs + Title/Share */}
          <div className="flex-shrink-0 bg-[var(--v2-bg)] border-b border-[var(--v2-border-subtle)]">
            {/* Tabs row */}
            <div className="px-6 py-3 flex gap-4">
              <button
                onClick={() => setActiveTab('brief')}
                className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                  activeTab === 'brief' 
                    ? 'border-[var(--v2-accent)] text-[var(--v2-text)]' 
                    : 'border-transparent text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)]'
                }`}
              >
                Fit Brief
              </button>
              <button
                onClick={() => setActiveTab('experience')}
                className={`text-sm font-medium pb-1 border-b-2 transition-colors ${
                  activeTab === 'experience' 
                    ? 'border-[var(--v2-accent)] text-[var(--v2-text)]' 
                    : 'border-transparent text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)]'
                }`}
              >
                Relevant Experience
              </button>
            </div>
            
            {/* Title + Share row (brief tab only) */}
            {activeTab === 'brief' && artifacts?.fitBrief && (
              <div className="px-6 py-3 flex items-center justify-between gap-4 border-t border-[var(--v2-border-subtle)]">
                <div className="flex items-center gap-2 text-xs text-[var(--v2-accent)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--v2-accent)] animate-pulse-subtle" />
                  <span className="uppercase tracking-wider">{artifacts.fitBrief.title}</span>
                </div>
                
                {/* Share button - inline (deferred functionality) */}
                <button
                  onClick={openModal}
                  className="px-4 py-2 border border-[var(--v2-border)] rounded-full
                             text-xs text-[var(--v2-text-secondary)]
                             hover:text-[var(--v2-text)] hover:border-[var(--v2-accent)]/50
                             transition-all duration-200"
                >
                  Share
                </button>
              </div>
            )}
          </div>
          
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'brief' ? (
              <div className="p-6 space-y-6">
                {artifacts?.fitBrief?.sections && artifacts.fitBrief.sections.length > 0 ? (
                  artifacts.fitBrief.sections.map((section: FitBriefSection, idx: number) => (
                    <div 
                      key={section.id}
                      className="transition-all duration-500 opacity-100 translate-y-0"
                    >
                      <div className="border border-[var(--v2-border-subtle)] rounded-xl p-5 bg-[var(--v2-bg-elevated)]">
                        <h3 className="text-xs uppercase tracking-wider text-[var(--v2-accent)] mb-3">
                          {section.title}
                        </h3>
                        <p className="text-sm text-[var(--v2-text-secondary)] leading-relaxed">
                          {section.content}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--v2-text-tertiary)]">Building your fit brief...</p>
                )}
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {artifacts?.relevantExperience?.groups && artifacts.relevantExperience.groups.length > 0 ? (
                  artifacts.relevantExperience.groups.map((group: RelevantExperienceGroup, groupIdx: number) => (
                    <div key={groupIdx}>
                      {group.title && (
                        <h3 className="text-xs uppercase tracking-wider text-[var(--v2-accent)] mb-3">{group.title}</h3>
                      )}
                      {group.items.map((item: RelevantExperienceItem, itemIdx: number) => (
                        <div 
                          key={`${groupIdx}-${itemIdx}`}
                          className="border border-[var(--v2-border-subtle)] rounded-xl p-5 bg-[var(--v2-bg-elevated)]
                                     hover:border-[var(--v2-accent)]/30 transition-colors cursor-pointer mb-4"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <h4 className="font-medium text-[var(--v2-text)]">{item.title}</h4>
                            {item.period && (
                              <span className="text-xs text-[var(--v2-text-tertiary)]">{item.period}</span>
                            )}
                          </div>
                          {item.role && (
                            <p className="text-xs text-[var(--v2-accent)] mb-2">{item.role}</p>
                          )}
                          {item.bullets && item.bullets.length > 0 && (
                            <ul className="text-sm text-[var(--v2-text-secondary)] space-y-1">
                              {item.bullets.map((bullet: string, bIdx: number) => (
                                <li key={bIdx}>• {bullet}</li>
                              ))}
                            </ul>
                          )}
                          {item.whyRelevant && (
                            <p className="text-xs text-[var(--v2-text-tertiary)] mt-3 italic">{item.whyRelevant}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-[var(--v2-text-tertiary)]">Finding relevant experience...</p>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Right: Chat */}
        <div className="flex-1 lg:w-1/2 flex flex-col bg-[var(--v2-bg-elevated)] overflow-hidden">
          {/* Scrollable chat area */}
          <div className="flex-1 overflow-y-auto p-6 pb-4">
            <div className="space-y-6">
              {messages.map((msg, idx) => (
                <div key={idx}>
                  {msg.role === 'assistant' && (
                    <div className="text-xs text-[var(--v2-text-tertiary)] mb-2 uppercase tracking-wider">Jaan</div>
                  )}
                  <p className={`text-sm leading-relaxed ${
                    msg.role === 'assistant' ? 'text-[var(--v2-text-secondary)]' : 'text-[var(--v2-text)]'
                  }`}>
                    {msg.text}
                  </p>
                </div>
              ))}
              {isLoading && (
                <div>
                  <div className="text-xs text-[var(--v2-text-tertiary)] mb-2 uppercase tracking-wider">Jaan</div>
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[var(--v2-text-tertiary)] animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-[var(--v2-text-tertiary)] animate-bounce" style={{ animationDelay: '0.15s' }} />
                    <span className="w-2 h-2 rounded-full bg-[var(--v2-text-tertiary)] animate-bounce" style={{ animationDelay: '0.3s' }} />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Fixed input at bottom with gradient fade */}
          <div className="flex-shrink-0 bg-gradient-to-t from-[var(--v2-bg-elevated)] via-[var(--v2-bg-elevated)] to-transparent pt-6 pb-4 px-4">
            <div className="bg-[var(--v2-bg)] border border-[var(--v2-border-subtle)] 
                            rounded-full flex items-center px-2 py-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
                placeholder="Ask about this role..."
                className="flex-1 bg-transparent px-5 py-3 text-sm
                           placeholder:text-[var(--v2-text-tertiary)]
                           focus:outline-none"
                disabled={isLoading}
              />
              <button 
                onClick={() => handleSend(inputValue)}
                disabled={isLoading}
                className="px-6 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Share Modal - 2 step (functionality deferred) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
          <div className="bg-[var(--v2-bg-card)] border border-[var(--v2-border)] rounded-2xl p-8 max-w-md w-full mx-4 animate-scale-in" style={{ animationFillMode: 'forwards' }}>
            
            {modalStep === 1 ? (
              <>
                <h2 className="text-xl font-medium mb-2">Let's swap LinkedIn's</h2>
                <p className="text-sm text-[var(--v2-text-tertiary)] mb-6">
                  Drop your LinkedIn profile so we can stay in touch.
                </p>
                
                <input
                  type="text"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleLinkedInSubmit()}
                  placeholder="linkedin.com/in/yourprofile"
                  className="w-full bg-[var(--v2-bg)] border border-[var(--v2-border-subtle)] 
                             rounded-xl px-5 py-3 text-sm mb-4
                             placeholder:text-[var(--v2-text-tertiary)]
                             focus:outline-none focus:border-[var(--v2-accent)]/50
                             transition-colors"
                  autoFocus
                />
                
                <button 
                  onClick={handleLinkedInSubmit}
                  disabled={!linkedinUrl.trim()}
                  className="w-full px-4 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full text-sm font-medium 
                             hover:opacity-90 transition-opacity
                             disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
                
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-full mt-3 px-4 py-2 text-xs text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)] transition-colors"
                >
                  Skip for now
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[var(--v2-accent)]">✓</span>
                  <span className="text-sm text-[var(--v2-text-secondary)]">LinkedIn saved (Share feature coming soon)</span>
                </div>
                
                <h2 className="text-xl font-medium mb-2">Share this conversation</h2>
                <p className="text-sm text-[var(--v2-text-tertiary)] mb-6">
                  Forward this fit brief to your team or save it for later.
                </p>
                
                <div className="flex gap-3 mb-4">
                  <button 
                    disabled
                    className="flex-1 px-4 py-3 border border-[var(--v2-border)] rounded-full text-sm
                               opacity-50 cursor-not-allowed"
                  >
                    Copy link
                  </button>
                  <button 
                    disabled
                    className="flex-1 px-4 py-3 border border-[var(--v2-border)] rounded-full text-sm
                               opacity-50 cursor-not-allowed"
                  >
                    Download PDF
                  </button>
                </div>
                
                <button 
                  onClick={() => setShowModal(false)}
                  className="w-full px-4 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
