import { useState, useEffect } from 'react';

type Screen = 'handshake' | 'chat' | 'brief';
type UserIntent = 'product' | 'engineer' | 'browsing' | 'other' | null;

const quickReplies = [
  { id: 'product', label: 'Product / PO', desc: 'Looking for a product leader', gradient: 'from-teal-500/20 to-cyan-500/10' },
  { id: 'engineer', label: 'Product Engineer', desc: 'Technical + product hybrid', gradient: 'from-cyan-500/20 to-blue-500/10' },
  { id: 'browsing', label: 'Just exploring', desc: 'Curious what this is about', gradient: 'from-blue-500/20 to-indigo-500/10' },
  { id: 'other', label: 'Something else', desc: 'Tell me more', gradient: 'from-indigo-500/20 to-purple-500/10' },
] as const;

const followUpChips = [
  { label: 'B2B SaaS', emoji: '🏢' },
  { label: 'Consumer fintech', emoji: '💳' },
  { label: 'AI/ML platform', emoji: '🤖' },
  { label: 'Marketplace', emoji: '🔄' },
];

const fitBriefSections = [
  {
    id: 'need',
    title: 'What I think you need',
    icon: '◎',
    content: 'A product leader who bridges technical depth with business intuition. Someone who can shape strategy while staying close to the build.',
  },
  {
    id: 'proof',
    title: "Where I've done this",
    icon: '◈',
    content: 'Positium (mobility data platform), GuardTime (blockchain B2B), 4Finance (consumer lending). 15 years shipping across fintech, govtech, and enterprise.',
  },
  {
    id: 'risks',
    title: "Risks I'd flag",
    icon: '◇',
    content: "Heavier on B2B/enterprise than pure consumer. ML engineering isn't my core, but I've productized ML outputs many times.",
  },
  {
    id: 'plan',
    title: '30/60/90 day plan',
    icon: '▹',
    content: '30: Deep customer immersion, map the product surface. 60: Ship one high-signal win, establish metrics rhythm. 90: Present strategy with conviction.',
  },
  {
    id: 'questions',
    title: "Questions I'd ask",
    icon: '?',
    content: 'How does product work with eng leadership? What\'s the biggest bet this year? Where has product failed — and what did you learn?',
  },
];

function HandshakeScreen({ onSelect }: { onSelect: (id: UserIntent) => void }) {
  const [mounted, setMounted] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setShowOptions(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="glass-concept min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0">
        {/* Photo with heavy treatment */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-15 blur-sm scale-105"
          style={{ backgroundImage: "url('/20221211-SBW_0367.jpg')" }}
        />
        
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#050505] via-[#050505]/95 to-[#0a1512]" />
        
        {/* Accent glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[var(--glass-accent)]/5 blur-[120px] rounded-full" />
        
        {/* Subtle grid */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>
      
      <div className="relative z-10 w-full max-w-3xl mx-auto px-6">
        {/* Main card */}
        <div className={`glass-card-elevated rounded-3xl p-10 md:p-14 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Status badge */}
          <div className="flex items-center gap-3 mb-10">
            <div className="relative">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--glass-accent)] block" />
              <span className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[var(--glass-accent)] animate-ping" />
            </div>
            <span className="text-xs font-medium tracking-widest uppercase text-[var(--glass-text-tertiary)]">
              Available for opportunities
            </span>
          </div>
          
          {/* Greeting */}
          <div className="mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.1] tracking-tight mb-5">
              <span className={`block animate-glass-fade-up ${mounted ? '' : 'opacity-0'}`}>
                Hey — I'm{' '}
                <span className="glass-serif italic text-[var(--glass-accent)]">Jaan</span>.
              </span>
              <span className={`block text-[var(--glass-text-secondary)] animate-glass-fade-up delay-200 ${mounted ? '' : 'opacity-0'}`}>
                What kind of product
              </span>
              <span className={`block text-[var(--glass-text-secondary)] animate-glass-fade-up delay-300 ${mounted ? '' : 'opacity-0'}`}>
                are you building?
              </span>
            </h1>
            
            <p className={`text-base text-[var(--glass-text-tertiary)] max-w-md animate-glass-fade-up delay-500 ${mounted ? '' : 'opacity-0'}`}>
              In 60 seconds we'll produce a fit brief you can forward internally to your team.
            </p>
          </div>
          
          {/* Options grid */}
          <div className={`grid grid-cols-2 gap-4 transition-all duration-700 delay-700 ${showOptions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {quickReplies.map((option, idx) => (
              <button
                key={option.id}
                onClick={() => onSelect(option.id as UserIntent)}
                className={`group relative text-left p-5 rounded-2xl
                           glass-card hover:border-[var(--glass-border-strong)]
                           transition-all duration-300 hover:scale-[1.02]
                           animate-glass-fade-up`}
                style={{ animationDelay: `${700 + idx * 100}ms` }}
              >
                {/* Hover gradient */}
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${option.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />
                
                <div className="relative">
                  <span className="text-base font-medium block mb-1 group-hover:text-[var(--glass-accent)] transition-colors">
                    {option.label}
                  </span>
                  <span className="text-xs text-[var(--glass-text-tertiary)]">
                    {option.desc}
                  </span>
                </div>
                
                {/* Arrow */}
                <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[var(--glass-text-tertiary)] group-hover:text-[var(--glass-accent)] group-hover:translate-x-1 transition-all">
                  →
                </div>
              </button>
            ))}
          </div>
        </div>
        
        {/* Floating decorative elements */}
        <div className="absolute -top-20 -right-20 w-40 h-40 border border-[var(--glass-border)] rounded-full opacity-30 animate-glass-float" />
        <div className="absolute -bottom-10 -left-10 w-24 h-24 border border-[var(--glass-accent)]/20 rounded-full opacity-40 animate-glass-float" style={{ animationDelay: '-2s' }} />
      </div>
    </div>
  );
}

function ChatScreen({ intent, onProceed }: { intent: UserIntent; onProceed: () => void }) {
  const [messages, setMessages] = useState<{ role: 'ai' | 'user'; text: string }[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [showChips, setShowChips] = useState(false);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        const msg = intent === 'product' 
          ? "Great — you're looking for product leadership. What's the domain or problem space?"
          : intent === 'engineer'
          ? "Product Engineer — love it. What tech stack or platform are we talking about?"
          : intent === 'browsing'
          ? "No worries, take your time. What caught your eye?"
          : "I'm curious — tell me what you have in mind.";
        setMessages([{ role: 'ai', text: msg }]);
        setTimeout(() => setShowChips(true), 300);
      }, 1200);
    }, 400);
    return () => clearTimeout(timer);
  }, [intent]);

  const handleChipClick = (chip: typeof followUpChips[0]) => {
    setShowChips(false);
    setMessages(prev => [...prev, { role: 'user', text: chip.label }]);
    
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { 
          role: 'ai', 
          text: `${chip.label} — that's definitely in my wheelhouse. Building your personalized fit brief now...` 
        }]);
        setTimeout(onProceed, 1200);
      }, 1000);
    }, 400);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;
    setShowChips(false);
    const text = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    
    setTimeout(() => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setMessages(prev => [...prev, { 
          role: 'ai', 
          text: "Perfect — let me pull together a fit brief based on that..." 
        }]);
        setTimeout(onProceed, 1200);
      }, 1000);
    }, 400);
  };

  return (
    <div className="glass-concept min-h-screen flex flex-col">
      {/* Ambient background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-[#050505]" />
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-[var(--glass-accent)]/3 blur-[150px] rounded-full" />
      </div>
      
      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-[var(--glass-border)]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full glass-card flex items-center justify-center">
            <span className="text-lg">JS</span>
          </div>
          <div>
            <span className="text-sm font-medium block">Jaan Sokk</span>
            <span className="text-xs text-[var(--glass-text-tertiary)]">Product Leader</span>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="text-xs text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-secondary)] 
                     px-4 py-2 rounded-full glass-card transition-colors"
        >
          Restart
        </button>
      </header>
      
      {/* Chat */}
      <div className="relative z-10 flex-1 flex flex-col max-w-2xl mx-auto w-full">
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`animate-glass-fade-up ${msg.role === 'user' ? 'flex justify-end' : ''}`}
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              {msg.role === 'ai' ? (
                <div className="max-w-[85%]">
                  <div className="text-xs text-[var(--glass-accent)] mb-2 font-medium">JAAN</div>
                  <div className="glass-card rounded-2xl rounded-tl-md px-5 py-4">
                    <p className="text-[15px] text-[var(--glass-text-secondary)] leading-relaxed">
                      {msg.text}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-w-[75%]">
                  <div className="bg-[var(--glass-accent-soft)] border border-[var(--glass-accent)]/20 rounded-2xl rounded-br-md px-5 py-4">
                    <p className="text-[15px] leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {isTyping && (
            <div className="animate-glass-fade-in">
              <div className="text-xs text-[var(--glass-accent)] mb-2 font-medium">JAAN</div>
              <div className="glass-card rounded-2xl rounded-tl-md px-5 py-4 inline-block">
                <div className="flex gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--glass-text-tertiary)] animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-[var(--glass-text-tertiary)] animate-bounce" style={{ animationDelay: '0.15s' }} />
                  <span className="w-2 h-2 rounded-full bg-[var(--glass-text-tertiary)] animate-bounce" style={{ animationDelay: '0.3s' }} />
                </div>
              </div>
            </div>
          )}
          
          {/* Chips */}
          {showChips && (
            <div className="flex flex-wrap gap-3 pt-2 animate-glass-fade-up">
              {followUpChips.map((chip) => (
                <button
                  key={chip.label}
                  onClick={() => handleChipClick(chip)}
                  className="px-5 py-2.5 rounded-full glass-card
                             text-sm text-[var(--glass-text-secondary)]
                             hover:text-[var(--glass-text)] hover:border-[var(--glass-accent)]/30
                             transition-all duration-200 flex items-center gap-2"
                >
                  <span>{chip.emoji}</span>
                  <span>{chip.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Input */}
        <div className="p-6 border-t border-[var(--glass-border)]">
          <div className="glass-card rounded-full flex items-center px-2 py-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Or describe in your own words..."
              className="flex-1 bg-transparent px-5 py-3 text-sm
                         placeholder:text-[var(--glass-text-tertiary)]
                         focus:outline-none"
            />
            <button
              onClick={handleSend}
              className="px-6 py-3 bg-[var(--glass-accent)] text-[var(--glass-bg)] rounded-full
                         text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BriefScreen() {
  const [visibleSections, setVisibleSections] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'brief' | 'experience'>('brief');
  const [showModal, setShowModal] = useState(false);
  const [linkedinUrl, setLinkedinUrl] = useState('');

  useEffect(() => {
    fitBriefSections.forEach((section, idx) => {
      setTimeout(() => {
        setVisibleSections(prev => [...prev, section.id]);
      }, 400 + (idx * 350));
    });
  }, []);

  return (
    <div className="glass-concept min-h-screen flex flex-col">
      {/* Background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-[#050505]" />
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[var(--glass-accent)]/4 blur-[180px] rounded-full" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-cyan-500/3 blur-[150px] rounded-full" />
      </div>
      
      {/* Header */}
      <header className="relative z-20 flex items-center justify-between px-8 py-5 border-b border-[var(--glass-border)]">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-full glass-card flex items-center justify-center">
            <span className="text-lg">JS</span>
          </div>
          <div>
            <span className="text-sm font-medium block">Jaan Sokk</span>
            <span className="text-xs text-[var(--glass-text-tertiary)]">Fit Brief</span>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="text-xs text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-secondary)] 
                     px-4 py-2 rounded-full glass-card transition-colors"
        >
          Restart
        </button>
      </header>
      
      {/* Main content */}
      <div className="relative z-10 flex-1 flex flex-col lg:flex-row">
        {/* Left: Brief */}
        <div className="flex-1 lg:w-3/5 border-r border-[var(--glass-border)] overflow-y-auto">
          {/* Tabs */}
          <div className="sticky top-0 bg-[var(--glass-bg)]/80 backdrop-blur-xl border-b border-[var(--glass-border)] px-8 py-4 flex gap-6">
            <button
              onClick={() => setActiveTab('brief')}
              className={`text-sm font-medium transition-colors ${
                activeTab === 'brief' 
                  ? 'text-[var(--glass-accent)]' 
                  : 'text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-secondary)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full transition-colors ${activeTab === 'brief' ? 'bg-[var(--glass-accent)]' : 'bg-transparent'}`} />
                Fit Brief
              </span>
            </button>
            <button
              onClick={() => setActiveTab('experience')}
              className={`text-sm font-medium transition-colors ${
                activeTab === 'experience' 
                  ? 'text-[var(--glass-accent)]' 
                  : 'text-[var(--glass-text-tertiary)] hover:text-[var(--glass-text-secondary)]'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full transition-colors ${activeTab === 'experience' ? 'bg-[var(--glass-accent)]' : 'bg-transparent'}`} />
                Relevant Experience
              </span>
            </button>
          </div>
          
          {activeTab === 'brief' ? (
            <div className="p-8">
              {/* Status */}
              <div className="flex items-center gap-3 mb-8 animate-glass-fade-up">
                <div className="px-4 py-2 rounded-full glass-card flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--glass-accent)] animate-pulse" />
                  <span className="text-xs font-medium text-[var(--glass-accent)]">Building your brief</span>
                </div>
              </div>
              
              {/* Sections */}
              <div className="space-y-5">
                {fitBriefSections.map((section) => (
                  <div 
                    key={section.id}
                    className={`transition-all duration-600 ${
                      visibleSections.includes(section.id) 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 translate-y-6 pointer-events-none'
                    }`}
                  >
                    <div className="glass-card-elevated rounded-2xl p-6 hover:border-[var(--glass-border-strong)] transition-colors">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-[var(--glass-accent)] text-lg">{section.icon}</span>
                        <h3 className="text-xs font-semibold tracking-widest uppercase text-[var(--glass-text-tertiary)]">
                          {section.title}
                        </h3>
                      </div>
                      <p className="text-[15px] text-[var(--glass-text-secondary)] leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Share button */}
              {visibleSections.length === fitBriefSections.length && (
                <div className="mt-8 animate-glass-fade-up" style={{ animationDelay: '200ms' }}>
                  <button
                    onClick={() => setShowModal(true)}
                    className="w-full py-4 rounded-full bg-[var(--glass-accent)] text-[var(--glass-bg)]
                               text-sm font-semibold hover:opacity-90 transition-all
                               shadow-[0_0_30px_var(--glass-accent-glow)]"
                  >
                    Share this brief →
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 space-y-4">
              {[
                { company: 'Positium', role: 'Technical Project Lead', period: '2025 — Present', desc: 'Leading Estonian Mobility Modelling initiative — nationwide prototype transforming telecom data into urban planning insights.' },
                { company: 'GuardTime', role: 'Product Owner', period: '2024 — 2025', desc: 'Owned product strategy for enterprise blockchain solutions: green energy certification and digital payments infrastructure.' },
                { company: '4Finance Group', role: 'Product Manager', period: '2017 — 2019', desc: 'Led product development for risk assessment and customer journey optimization across European consumer lending markets.' },
              ].map((exp, idx) => (
                <div 
                  key={exp.company}
                  className="glass-card-elevated rounded-2xl p-6 hover:border-[var(--glass-border-strong)] transition-all cursor-pointer group animate-glass-fade-up"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg group-hover:text-[var(--glass-accent)] transition-colors">{exp.company}</h3>
                    <span className="text-xs text-[var(--glass-text-tertiary)]">{exp.period}</span>
                  </div>
                  <p className="text-xs text-[var(--glass-accent)] mb-3 font-medium">{exp.role}</p>
                  <p className="text-sm text-[var(--glass-text-secondary)] leading-relaxed">{exp.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Right: Chat */}
        <div className="flex-1 lg:w-2/5 flex flex-col">
          <div className="flex-1 overflow-y-auto p-8">
            <div className="space-y-6">
              <div className="animate-glass-fade-up">
                <div className="text-xs text-[var(--glass-accent)] mb-2 font-medium">JAAN</div>
                <div className="glass-card rounded-2xl rounded-tl-md px-5 py-4">
                  <p className="text-[15px] text-[var(--glass-text-secondary)] leading-relaxed">
                    Two quick checks so I don't hallucinate the fit — what's the team size, and is this greenfield or existing product?
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6 border-t border-[var(--glass-border)]">
            <div className="glass-card rounded-full flex items-center px-2 py-1">
              <input
                type="text"
                placeholder="Ask about this role..."
                className="flex-1 bg-transparent px-5 py-3 text-sm
                           placeholder:text-[var(--glass-text-tertiary)]
                           focus:outline-none"
              />
              <button className="px-6 py-3 bg-[var(--glass-accent)] text-[var(--glass-bg)] rounded-full text-sm font-medium hover:opacity-90 transition-opacity">
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 animate-glass-fade-in">
          <div className="glass-card-elevated rounded-3xl p-10 max-w-md w-full mx-4 animate-glass-scale-up">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-[var(--glass-accent-soft)] border border-[var(--glass-accent)]/30 flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl">🤝</span>
              </div>
              <h2 className="text-2xl font-semibold mb-2">Let's stay in touch</h2>
              <p className="text-sm text-[var(--glass-text-tertiary)]">
                Drop your LinkedIn — or grab a shareable link.
              </p>
            </div>
            
            <div className="glass-card rounded-xl flex items-center px-4 py-1 mb-5">
              <span className="text-[var(--glass-text-tertiary)]">in/</span>
              <input
                type="text"
                value={linkedinUrl}
                onChange={(e) => setLinkedinUrl(e.target.value)}
                placeholder="yourprofile"
                className="flex-1 bg-transparent px-2 py-3 text-sm focus:outline-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <button className="py-3 rounded-full glass-card text-sm font-medium
                                 hover:border-[var(--glass-border-strong)] transition-colors">
                📋 Copy link
              </button>
              <button className="py-3 rounded-full glass-card text-sm font-medium
                                 hover:border-[var(--glass-border-strong)] transition-colors">
                📄 Download PDF
              </button>
            </div>
            
            <button 
              onClick={() => setShowModal(false)}
              className="w-full py-4 rounded-full bg-[var(--glass-accent)] text-[var(--glass-bg)]
                         text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConceptBApp() {
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

