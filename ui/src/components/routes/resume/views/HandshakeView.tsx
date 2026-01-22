import { useMemo } from 'react';
import { Header } from '../../../ui/Header';
import { BackgroundOverlay } from '../../../ui/BackgroundOverlay';
import { QuickReplyGrid } from '../../../features/handshake/QuickReplyGrid';
import { ChatInput } from '../../../features/chat/ChatInput';

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
  isLoading,
}: HandshakeViewProps) {
  // IMPORTANT: Keep SSR and client initial render deterministic.
  // This view previously read sessionStorage during render to decide whether to play an intro.
  // That causes SSR/client className mismatches and can leave the chips/input stuck hidden
  // if hydration/effects don't run (observed when navigating back from other routes).
  //
  // We always render the handshake controls visible; animations are purely decorative.
  const alwaysShow = useMemo(() => true, []);

  return (
    <div className="v2-concept min-h-screen flex flex-col relative overflow-hidden">
      <Header transparent />
      <BackgroundOverlay />

      {/* Main content area */}
      <div className="relative z-10 flex-1 flex flex-col px-6 pt-20 pb-24 justify-center">
        {/* Hero section */}
        <div className="max-w-3xl mx-auto text-center">
          <div
            className="mb-6 animate-fade-up"
            style={{ animationFillMode: 'forwards' }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.15] tracking-[-0.02em]">
              Hey {'\u2014'} I'm <span className="v2-serif text-[var(--v2-accent)]">Jaan</span>.
            </h1>
            <p className="text-xs md:text-[0.7rem] uppercase tracking-[0.1em] text-[var(--v2-accent)] mt-3 mb-6">
              Product Leader / PM <span className="opacity-50">&nbsp;|&nbsp;</span> Web3 Nerd <span className="opacity-50">&nbsp;|&nbsp;</span> Critical Thinker <span className="opacity-50">&nbsp;|&nbsp;</span> Leading Teams for 15y
            </p>
            <p className="text-4xl md:text-5xl lg:text-6xl font-medium leading-[1.15] tracking-[-0.02em]">
              What kind of product<br />
              are you building?
            </p>
          </div>
          
          {/* Subline */}
          <p className="text-lg text-[var(--v2-text-secondary)] max-w-md mx-auto mb-10 animate-fade-in">
            In 60 seconds we'll produce a fit brief you can forward internally to your team.
          </p>
          
          {/* Try asking label */}
          <p className="text-sm text-[var(--v2-text-tertiary)] text-center mb-3 animate-fade-in">
            Try asking...
          </p>
          
          {/* Quick reply chips - 2x2 grid */}
          <QuickReplyGrid onReplySelect={onSend} showButtons={alwaysShow} />
          
          {/* Free text input below chips */}
          <div className="w-full max-w-2xl mx-auto animate-fade-in">
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

