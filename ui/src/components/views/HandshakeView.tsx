import { useEffect, useState } from 'react';
import { Header } from '../shared/Header';
import { BackgroundOverlay } from '../shared/BackgroundOverlay';
import { QuickReplyGrid } from '../handshake/QuickReplyGrid';
import { ChatInput } from '../chat/ChatInput';

interface HandshakeViewProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  isLoading: boolean;
}

export function HandshakeView({ 
  inputValue, 
  onInputChange, 
  onSend, 
  isLoading 
}: HandshakeViewProps) {
  const [showSubline, setShowSubline] = useState(false);
  const [showButtons, setShowButtons] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowSubline(true), 800);
    const t2 = setTimeout(() => setShowButtons(true), 1200);
    return () => { 
      clearTimeout(t1); 
      clearTimeout(t2); 
    };
  }, []);

  return (
    <div className="v2-concept min-h-screen flex flex-col relative overflow-hidden">
      <Header />
      <BackgroundOverlay />

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
          <QuickReplyGrid onReplySelect={onSend} showButtons={showButtons} />
          
          {/* Free text input below chips */}
          <div 
            className={`w-full max-w-2xl mx-auto transition-all duration-700 ${
              showButtons ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
            style={{ transitionDelay: '100ms' }}
          >
            <ChatInput
              value={inputValue}
              onChange={onInputChange}
              onSend={() => onSend(inputValue)}
              placeholder="Or tell me what you're looking for..."
              isLoading={isLoading}
              variant="handshake"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

