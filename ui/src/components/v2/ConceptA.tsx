import { useState, useEffect, useRef } from 'react';

type Screen = 'home' | 'brief';

const quickReplies = [
  { id: 'product', label: 'Hiring for Product / PO', icon: '◈' },
  { id: 'engineer', label: 'Product Engineer / AI', icon: '⬡' },
  { id: 'browsing', label: 'Just browsing', icon: '○' },
  { id: 'advising', label: 'Advisor / Consultant', icon: '◇' },
] as const;

const followUpChips = [
  'B2B SaaS product',
  'Consumer fintech',
  'AI/ML platform',
  'Marketplace / two-sided',
];

const fitBriefSections = [
  {
    title: 'What I think you need',
    content: 'A product leader who can bridge technical complexity and business outcomes. Someone comfortable with ambiguity who can shape product vision while shipping iteratively.',
  },
  {
    title: "Where I've done this before",
    content: 'Led mobility data platform at Positium (2-year gov prototype). Owned blockchain product strategy at GuardTime. Shipped consumer lending products across 4 European markets at 4Finance.',
  },
  {
    title: "Risks I'd watch",
    content: 'My background skews enterprise/B2B — consumer apps would need ramp-up time. Deep ML engineering isn\'t my primary skill, but I\'ve worked closely with ML teams.',
  },
  {
    title: 'First 30/60/90 days',
    content: '30: Understand the problem space, talk to 10+ customers, map existing product surface. 60: Ship one high-signal improvement, establish metrics cadence. 90: Present product strategy to leadership.',
  },
  {
    title: "Questions I'd ask in interview",
    content: 'How does product interact with engineering leadership? What\'s the biggest bet you\'re making this year? Where has product failed recently and what did you learn?',
  },
];

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

function HomeScreen({ onProceed }: { onProceed: () => void }) {
  const [showSubline, setShowSubline] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showChips, setShowChips] = useState(false);
  const [typingEffect, setTypingEffect] = useState(false);
  const [contentOverflows, setContentOverflows] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t1 = setTimeout(() => setShowSubline(true), 800);
    const t2 = setTimeout(() => setShowButtons(true), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  // Check if content overflows viewport
  useEffect(() => {
    if (chatContainerRef.current) {
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
  }, [messages]);

  const startChat = (initialMessage: string, fromChip: boolean = false) => {
    setChatStarted(true);
    setMessages([{ role: 'user', text: initialMessage }]);
    
    setTimeout(() => {
      setTypingEffect(true);
      setTimeout(() => {
        setTypingEffect(false);
        const aiResponse = fromChip 
          ? `Got it — you're looking for ${initialMessage.toLowerCase().includes('product') ? 'product leadership' : initialMessage.toLowerCase().includes('engineer') ? 'a product engineer' : 'something specific'}. What kind of product domain interests you most?`
          : "Thanks for reaching out! What kind of product domain are you working in?";
        setMessages(prev => [...prev, { role: 'ai', text: aiResponse }]);
        setTimeout(() => setShowChips(true), 400);
      }, 1500);
    }, 300);
  };

  const handleChipSelect = (label: string) => {
    startChat(label, true);
  };

  const handleInputSend = () => {
    if (!inputValue.trim()) return;
    const text = inputValue;
    setInputValue('');
    startChat(text, false);
  };

  const handleFollowUpChip = (chip: string) => {
    setShowChips(false);
    setMessages(prev => [...prev, { role: 'user', text: chip }]);
    
    setTimeout(() => {
      setTypingEffect(true);
      setTimeout(() => {
        setTypingEffect(false);
        setMessages(prev => [...prev, { 
          role: 'ai', 
          text: `Perfect — ${chip.toLowerCase()} is right in my wheelhouse. Let me pull together a fit brief based on my experience in that space...` 
        }]);
        setTimeout(onProceed, 1500);
      }, 1200);
    }, 500);
  };

  const handleChatSend = () => {
    if (!inputValue.trim()) return;
    setShowChips(false);
    const text = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    
    setTimeout(() => {
      setTypingEffect(true);
      setTimeout(() => {
        setTypingEffect(false);
        setMessages(prev => [...prev, { 
          role: 'ai', 
          text: "Great context — let me assemble a fit brief tailored to what you're building..." 
        }]);
        setTimeout(onProceed, 1500);
      }, 1200);
    }, 500);
  };

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
          chatStarted && !contentOverflows ? 'justify-center' : chatStarted ? 'justify-start pt-24' : 'justify-center'
        }`}
      >
        {/* Hero section - fades out when chat starts */}
        <div 
          className={`max-w-2xl mx-auto text-center transition-all duration-700 ${
            chatStarted ? 'opacity-0 h-0 overflow-hidden mb-0' : 'opacity-100 mb-8'
          }`}
        >
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
                onClick={() => handleChipSelect(reply.label)}
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
                onKeyDown={(e) => e.key === 'Enter' && handleInputSend()}
                placeholder="Or tell me what you're looking for..."
                className="flex-1 bg-transparent px-5 py-3 text-sm
                           placeholder:text-[var(--v2-text-tertiary)]
                           focus:outline-none"
              />
              <button
                onClick={handleInputSend}
                className="px-6 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full
                           text-sm font-medium
                           hover:opacity-90 transition-opacity"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Chat messages - appears after chat starts, vertically centered */}
        {chatStarted && (
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
                    {msg.role === 'ai' && (
                      <div className="text-xs text-[var(--v2-text-tertiary)] mb-2 uppercase tracking-wider">Jaan</div>
                    )}
                    <p className={`text-base leading-relaxed ${msg.role === 'ai' ? 'text-[var(--v2-text-secondary)]' : ''}`}>
                      {msg.text}
                    </p>
                  </div>
                </div>
              ))}
              
              {typingEffect && (
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
            {showChips && (
              <div className="mt-6 flex flex-wrap gap-2 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
                {followUpChips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => handleFollowUpChip(chip)}
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
          </div>
        )}
      </div>
      
      {/* Fixed input at bottom when chat started */}
      {chatStarted && (
        <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--v2-bg)] via-[var(--v2-bg)] to-transparent pt-8 pb-6 px-6 z-20">
          <div className="max-w-2xl mx-auto">
            <div className="bg-[var(--v2-bg-elevated)] border border-[var(--v2-border-subtle)] 
                            rounded-full flex items-center px-2 py-1">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChatSend()}
                placeholder="Type your message..."
                className="flex-1 bg-transparent px-5 py-3 text-sm
                           placeholder:text-[var(--v2-text-tertiary)]
                           focus:outline-none"
              />
              <button
                onClick={handleChatSend}
                className="px-6 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full
                           text-sm font-medium
                           hover:opacity-90 transition-opacity"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function BriefScreen() {
  const [visibleSections, setVisibleSections] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'brief' | 'experience'>('brief');
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<1 | 2>(1);
  const [linkedinUrl, setLinkedinUrl] = useState('');

  useEffect(() => {
    fitBriefSections.forEach((_, idx) => {
      setTimeout(() => {
        setVisibleSections(prev => [...prev, idx]);
      }, 600 + (idx * 400));
    });
  }, []);

  const handleLinkedInSubmit = () => {
    if (linkedinUrl.trim()) {
      setModalStep(2);
    }
  };

  const openModal = () => {
    setShowModal(true);
    setModalStep(1);
  };

  return (
    <div className="v2-concept h-screen flex flex-col overflow-hidden">
      <Header />
      
      {/* Split view - fixed height, no page scroll */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden pt-14">
        {/* Left: Fit Brief */}
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
            {activeTab === 'brief' && (
              <div className="px-6 py-3 flex items-center justify-between gap-4 border-t border-[var(--v2-border-subtle)]">
                <div className="flex items-center gap-2 text-xs text-[var(--v2-accent)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--v2-accent)] animate-pulse-subtle" />
                  <span className="uppercase tracking-wider">Fit Brief - Jaan Sokk / Driver Experience PM</span>
                </div>
                
                {/* Share button - inline */}
                {visibleSections.length === fitBriefSections.length && (
                  <button
                    onClick={openModal}
                    className="px-4 py-2 border border-[var(--v2-border)] rounded-full
                               text-xs text-[var(--v2-text-secondary)]
                               hover:text-[var(--v2-text)] hover:border-[var(--v2-accent)]/50
                               transition-all duration-200"
                  >
                    Share
                  </button>
                )}
              </div>
            )}
          </div>
          
          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'brief' ? (
              <div className="p-6 space-y-6">
                {/* Sections */}
                {fitBriefSections.map((section, idx) => (
                  <div 
                    key={section.title}
                    className={`transition-all duration-500 ${
                      visibleSections.includes(idx) 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 translate-y-4'
                    }`}
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
                ))}
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {['Positium — Technical Project Lead', 'GuardTime — Product Owner', '4Finance — Product Manager'].map((role, idx) => (
                  <div 
                    key={role}
                    className="border border-[var(--v2-border-subtle)] rounded-xl p-5 bg-[var(--v2-bg-elevated)]
                               hover:border-[var(--v2-accent)]/30 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-medium text-[var(--v2-text)]">{role.split(' — ')[0]}</h3>
                      <span className="text-xs text-[var(--v2-text-tertiary)]">
                        {idx === 0 ? '2025–Present' : idx === 1 ? '2024–2025' : '2017–2019'}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--v2-accent)] mb-2">{role.split(' — ')[1]}</p>
                    <p className="text-sm text-[var(--v2-text-secondary)]">
                      {idx === 0 
                        ? 'Leading nationwide mobility data initiative transforming telecom data into urban planning insights.'
                        : idx === 1 
                        ? 'Owned product strategy for enterprise blockchain solutions in green energy and payments.'
                        : 'Led risk assessment and customer journey optimization across European markets.'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Right: Chat */}
        <div className="flex-1 lg:w-1/2 flex flex-col bg-[var(--v2-bg-elevated)] overflow-hidden">
          {/* Scrollable chat area */}
          <div className="flex-1 overflow-y-auto p-6 pb-4">
            <div className="space-y-6">
              <div>
                <div className="text-xs text-[var(--v2-text-tertiary)] mb-2 uppercase tracking-wider">Jaan</div>
                <p className="text-sm text-[var(--v2-text-secondary)] leading-relaxed">
                  Two quick checks so I don't hallucinate the fit — what's the team size you're hiring for, and is this a new product or existing?
                </p>
              </div>
            </div>
          </div>
          
          {/* Fixed input at bottom with gradient fade */}
          <div className="flex-shrink-0 bg-gradient-to-t from-[var(--v2-bg-elevated)] via-[var(--v2-bg-elevated)] to-transparent pt-6 pb-4 px-4">
            <div className="bg-[var(--v2-bg)] border border-[var(--v2-border-subtle)] 
                            rounded-full flex items-center px-2 py-1">
              <input
                type="text"
                placeholder="Ask about this role..."
                className="flex-1 bg-transparent px-5 py-3 text-sm
                           placeholder:text-[var(--v2-text-tertiary)]
                           focus:outline-none"
              />
              <button className="px-6 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Share Modal - 2 step */}
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
                  <span className="text-sm text-[var(--v2-text-secondary)]">LinkedIn saved</span>
                </div>
                
                <h2 className="text-xl font-medium mb-2">Share this conversation</h2>
                <p className="text-sm text-[var(--v2-text-tertiary)] mb-6">
                  Forward this fit brief to your team or save it for later.
                </p>
                
                <div className="flex gap-3 mb-4">
                  <button className="flex-1 px-4 py-3 border border-[var(--v2-border)] rounded-full text-sm
                                     hover:border-[var(--v2-accent)]/50 transition-colors">
                    Copy link
                  </button>
                  <button className="flex-1 px-4 py-3 border border-[var(--v2-border)] rounded-full text-sm
                                     hover:border-[var(--v2-accent)]/50 transition-colors">
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

export default function ConceptAApp() {
  const [screen, setScreen] = useState<Screen>('home');

  return (
    <>
      {screen === 'home' && <HomeScreen onProceed={() => setScreen('brief')} />}
      {screen === 'brief' && <BriefScreen />}
    </>
  );
}
