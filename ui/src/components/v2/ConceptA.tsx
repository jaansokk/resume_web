import { useState, useEffect } from 'react';

type Screen = 'handshake' | 'chat' | 'brief';
type UserIntent = 'product' | 'engineer' | 'browsing' | 'other' | null;

const quickReplies = [
  { id: 'product', label: 'Hiring for Product / PO', icon: '◈' },
  { id: 'engineer', label: 'Product Engineer / AI', icon: '⬡' },
  { id: 'browsing', label: 'Just browsing', icon: '○' },
  { id: 'other', label: 'Something else', icon: '◇' },
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
    delay: 0,
  },
  {
    title: "Where I've done this before",
    content: 'Led mobility data platform at Positium (2-year gov prototype). Owned blockchain product strategy at GuardTime. Shipped consumer lending products across 4 European markets at 4Finance.',
    delay: 200,
  },
  {
    title: "Risks I'd watch",
    content: 'My background skews enterprise/B2B — consumer apps would need ramp-up time. Deep ML engineering isn\'t my primary skill, but I\'ve worked closely with ML teams.',
    delay: 400,
  },
  {
    title: 'First 30/60/90 days',
    content: '30: Understand the problem space, talk to 10+ customers, map existing product surface. 60: Ship one high-signal improvement, establish metrics cadence. 90: Present product strategy to leadership.',
    delay: 600,
  },
  {
    title: "Questions I'd ask in interview",
    content: 'How does product interact with engineering leadership? What\'s the biggest bet you\'re making this year? Where has product failed recently and what did you learn?',
    delay: 800,
  },
];

function HandshakeScreen({ onSelect }: { onSelect: (id: UserIntent) => void }) {
  const [showSubline, setShowSubline] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowSubline(true), 800);
    const t2 = setTimeout(() => setShowButtons(true), 1200);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="v2-concept min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background image with heavy overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-20"
        style={{ backgroundImage: "url('/20221211-SBW_0367.jpg')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a]/90 to-[#0a0a0a]" />
      
      {/* Subtle radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(79,209,197,0.03)_0%,transparent_70%)]" />
      
      <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
        {/* Main greeting */}
        <div className="animate-fade-up opacity-0 mb-6" style={{ animationFillMode: 'forwards' }}>
          <div className="inline-flex items-center gap-3 mb-8">
            <span className="w-2 h-2 rounded-full bg-[var(--v2-accent)] animate-pulse-subtle" />
            <span className="text-xs uppercase tracking-[0.25em] text-[var(--v2-text-tertiary)]">Online now</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.15] tracking-[-0.02em]">
            Hey — I'm <span className="v2-serif text-[var(--v2-accent)]">Jaan</span>.<br />
            <span className="text-[var(--v2-text-secondary)]">What kind of product</span><br />
            <span className="text-[var(--v2-text-secondary)]">are you building?</span>
          </h1>
        </div>
        
        {/* Subline */}
        <p 
          className={`text-sm md:text-base text-[var(--v2-text-tertiary)] max-w-md mx-auto mb-12 transition-all duration-700 ${
            showSubline ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          In 60 seconds we'll produce a fit brief you can forward internally to your team.
        </p>
        
        {/* Quick reply buttons */}
        <div 
          className={`grid grid-cols-2 gap-3 max-w-lg mx-auto transition-all duration-700 ${
            showButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          {quickReplies.map((reply, idx) => (
            <button
              key={reply.id}
              onClick={() => onSelect(reply.id as UserIntent)}
              className="group relative aspect-[2/1] flex flex-col items-center justify-center gap-2 
                         bg-[var(--v2-bg-elevated)] border border-[var(--v2-border-subtle)] 
                         rounded-2xl overflow-hidden
                         hover:border-[var(--v2-accent)]/30 hover:bg-[var(--v2-bg-card)]
                         transition-all duration-300"
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              <span className="text-lg text-[var(--v2-text-tertiary)] group-hover:text-[var(--v2-accent)] transition-colors">
                {reply.icon}
              </span>
              <span className="text-sm font-medium text-[var(--v2-text-secondary)] group-hover:text-[var(--v2-text)] transition-colors px-4 text-center">
                {reply.label}
              </span>
              
              {/* Hover glow */}
              <div className="absolute inset-0 bg-[var(--v2-accent)]/0 group-hover:bg-[var(--v2-accent)]/5 transition-colors pointer-events-none" />
            </button>
          ))}
        </div>
      </div>
      
      {/* Bottom hint */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-xs text-[var(--v2-text-tertiary)]">
        Press any to continue
      </div>
    </div>
  );
}

function ChatScreen({ intent, onProceed }: { intent: UserIntent; onProceed: () => void }) {
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showChips, setShowChips] = useState(false);
  const [typingEffect, setTypingEffect] = useState(false);

  useEffect(() => {
    // Initial AI message after a brief delay
    const timer = setTimeout(() => {
      setTypingEffect(true);
      setTimeout(() => {
        setTypingEffect(false);
        const msg = intent === 'product' 
          ? "Got it — looking for a Product Owner or PM. What kind of product domain interests you most?"
          : intent === 'engineer'
          ? "Nice — Product Engineer or AI-focused roles. What's the tech stack or problem space you're hiring for?"
          : intent === 'browsing'
          ? "No pressure — feel free to explore. What brings you here today?"
          : "I'm all ears. Tell me what you're looking for and I'll see if there's a fit.";
        setMessages([{ role: 'ai', text: msg }]);
        setTimeout(() => setShowChips(true), 400);
      }, 1500);
    }, 300);
    return () => clearTimeout(timer);
  }, [intent]);

  const handleChipClick = (chip: string) => {
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

  const handleSend = () => {
    if (!inputValue.trim()) return;
    setShowChips(false);
    setMessages(prev => [...prev, { role: 'user', text: inputValue }]);
    setInputValue('');
    
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
    <div className="v2-concept min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--v2-border-subtle)]">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[var(--v2-accent)]" />
          <span className="text-sm font-medium">Jaan Sokk</span>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="text-xs text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)] transition-colors"
        >
          Start over
        </button>
      </header>
      
      {/* Chat area */}
      <div className="flex-1 overflow-y-auto px-6 py-8 max-w-2xl mx-auto w-full">
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
        
        {/* Chips */}
        {showChips && (
          <div className="mt-6 flex flex-wrap gap-2 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
            {followUpChips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
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
      
      {/* Input area */}
      <div className="border-t border-[var(--v2-border-subtle)] px-6 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Or type your own message..."
            className="flex-1 bg-[var(--v2-bg-elevated)] border border-[var(--v2-border-subtle)] 
                       rounded-full px-5 py-3 text-sm
                       placeholder:text-[var(--v2-text-tertiary)]
                       focus:outline-none focus:border-[var(--v2-accent)]/50
                       transition-colors"
          />
          <button
            onClick={handleSend}
            className="px-6 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full
                       text-sm font-medium
                       hover:opacity-90 transition-opacity"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

function BriefScreen() {
  const [visibleSections, setVisibleSections] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<'brief' | 'experience'>('brief');
  const [showModal, setShowModal] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState('');

  useEffect(() => {
    // Animate sections appearing one by one
    fitBriefSections.forEach((_, idx) => {
      setTimeout(() => {
        setVisibleSections(prev => [...prev, idx]);
      }, 600 + (idx * 400));
    });
  }, []);

  return (
    <div className="v2-concept min-h-screen flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-[var(--v2-border-subtle)]">
        <div className="flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-[var(--v2-accent)]" />
          <span className="text-sm font-medium">Jaan Sokk</span>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="text-xs text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)] transition-colors"
        >
          Start over
        </button>
      </header>
      
      {/* Split view */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Fit Brief */}
        <div className="flex-1 lg:w-1/2 border-r border-[var(--v2-border-subtle)] overflow-y-auto">
          {/* Tabs */}
          <div className="sticky top-0 bg-[var(--v2-bg)] border-b border-[var(--v2-border-subtle)] px-6 py-3 flex gap-4">
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
          
          {activeTab === 'brief' ? (
            <div className="p-6 space-y-6">
              {/* Animated status */}
              <div className="flex items-center gap-2 text-xs text-[var(--v2-accent)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--v2-accent)] animate-pulse-subtle" />
                <span className="uppercase tracking-wider">Building your brief...</span>
              </div>
              
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
              
              {/* Share button */}
              {visibleSections.length === fitBriefSections.length && (
                <button
                  onClick={() => setShowModal(true)}
                  className="w-full mt-4 px-6 py-4 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full
                             text-sm font-medium
                             hover:opacity-90 transition-all duration-300
                             animate-fade-up opacity-0"
                  style={{ animationFillMode: 'forwards', animationDelay: '200ms' }}
                >
                  Share this brief
                </button>
              )}
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
        
        {/* Right: Chat */}
        <div className="flex-1 lg:w-1/2 flex flex-col bg-[var(--v2-bg-elevated)]">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              <div>
                <div className="text-xs text-[var(--v2-text-tertiary)] mb-2 uppercase tracking-wider">Jaan</div>
                <p className="text-sm text-[var(--v2-text-secondary)] leading-relaxed">
                  Two quick checks so I don't hallucinate the fit — what's the team size you're hiring for, and is this a new product or existing?
                </p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-[var(--v2-border-subtle)] p-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Ask about this role..."
                className="flex-1 bg-[var(--v2-bg)] border border-[var(--v2-border-subtle)] 
                           rounded-full px-5 py-3 text-sm
                           placeholder:text-[var(--v2-text-tertiary)]
                           focus:outline-none focus:border-[var(--v2-accent)]/50
                           transition-colors"
              />
              <button className="px-6 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Share Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in" style={{ animationFillMode: 'forwards' }}>
          <div className="bg-[var(--v2-bg-card)] border border-[var(--v2-border)] rounded-2xl p-8 max-w-md w-full mx-4 animate-scale-in" style={{ animationFillMode: 'forwards' }}>
            <h2 className="text-xl font-medium mb-2">Great! Let's stay in touch.</h2>
            <p className="text-sm text-[var(--v2-text-tertiary)] mb-6">
              Drop your LinkedIn so we can connect — or grab a shareable link below.
            </p>
            
            <input
              type="text"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="linkedin.com/in/yourprofile"
              className="w-full bg-[var(--v2-bg)] border border-[var(--v2-border-subtle)] 
                         rounded-xl px-5 py-3 text-sm mb-4
                         placeholder:text-[var(--v2-text-tertiary)]
                         focus:outline-none focus:border-[var(--v2-accent)]/50
                         transition-colors"
            />
            
            <div className="flex gap-3">
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
              className="w-full mt-4 px-4 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConceptAApp() {
  const [screen, setScreen] = useState<Screen>('handshake');
  const [intent, setIntent] = useState<UserIntent>(null);

  const handleIntentSelect = (id: UserIntent) => {
    setIntent(id);
    setScreen('chat');
  };

  return (
    <>
      {screen === 'handshake' && <HandshakeScreen onSelect={handleIntentSelect} />}
      {screen === 'chat' && <ChatScreen intent={intent} onProceed={() => setScreen('brief')} />}
      {screen === 'brief' && <BriefScreen />}
    </>
  );
}

