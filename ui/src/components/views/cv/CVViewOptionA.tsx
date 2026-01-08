/**
 * Option A: Classic "Chat Assistant" 
 * - Floating chat icon bottom-right
 * - Opens sticky conversation area in corner
 * - Familiar pattern from support chat widgets
 */

import { useState } from 'react';
import { CVContent } from './CVContent';
import { CVTableOfContents } from './CVTableOfContents';
import { CVHeader } from './CVHeader';
import type { Message } from '../../types';

interface CVViewOptionAProps {
  messages: Message[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  isLoading: boolean;
  chips: string[];
  onChipSelect: (chip: string) => void;
}

export function CVViewOptionA({
  messages,
  inputValue,
  onInputChange,
  onSend,
  isLoading,
  chips,
  onChipSelect,
}: CVViewOptionAProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="v2-concept min-h-screen">
      <CVHeader />
      
      {/* Main layout */}
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-32">
        <div className="flex gap-16">
          {/* Left: CV Content */}
          <main className="flex-1 min-w-0">
            <CVContent />
          </main>
          
          {/* Right: Table of Contents */}
          <aside className="hidden lg:block w-48 flex-shrink-0">
            <CVTableOfContents />
          </aside>
        </div>
      </div>

      {/* Floating chat button */}
      {!isChatOpen && (
        <button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[var(--v2-accent)] rounded-full 
                     flex items-center justify-center shadow-lg shadow-black/30
                     hover:scale-105 transition-transform"
          aria-label="Open chat"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--v2-bg)]">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {isChatOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[500px] max-h-[70vh] bg-[var(--v2-bg-elevated)] 
                        border border-[var(--v2-border)] rounded-2xl shadow-2xl shadow-black/50
                        flex flex-col overflow-hidden animate-scale-in">
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--v2-border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--v2-accent)]" />
              <span className="text-sm font-medium">Ask about my experience</span>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="p-1 text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text)] transition-colors"
              aria-label="Close chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <p className="text-[var(--v2-text-secondary)] text-sm mb-4">
                  Hi! Ask me anything about my experience, skills, or past projects.
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {['What technologies do you work with?', 'Tell me about your Guardtime work', 'What kind of teams have you led?'].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => onSend(suggestion)}
                      className="px-3 py-1.5 text-xs bg-[var(--v2-bg-card)] border border-[var(--v2-border-subtle)]
                                 text-[var(--v2-text-secondary)] rounded-full hover:border-[var(--v2-accent)] 
                                 hover:text-[var(--v2-accent)] transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-[var(--v2-accent)] text-[var(--v2-bg)]'
                      : 'bg-[var(--v2-bg-card)] text-[var(--v2-text-secondary)]'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[var(--v2-bg-card)] px-4 py-3 rounded-2xl">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-[var(--v2-text-tertiary)] rounded-full animate-pulse" />
                    <span className="w-2 h-2 bg-[var(--v2-text-tertiary)] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-[var(--v2-text-tertiary)] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            {chips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <button
                    key={chip}
                    onClick={() => onChipSelect(chip)}
                    className="px-3 py-1.5 text-xs bg-[var(--v2-bg-card)] border border-[var(--v2-border-subtle)]
                               text-[var(--v2-text-secondary)] rounded-full hover:border-[var(--v2-accent)] 
                               hover:text-[var(--v2-accent)] transition-colors"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="p-3 border-t border-[var(--v2-border-subtle)]">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onSend(inputValue)}
                placeholder="Ask a question..."
                className="flex-1 bg-[var(--v2-bg)] border border-[var(--v2-border-subtle)] rounded-full
                           px-4 py-2.5 text-sm placeholder:text-[var(--v2-text-tertiary)]
                           focus:outline-none focus:border-[var(--v2-accent)]"
                disabled={isLoading}
              />
              <button
                onClick={() => onSend(inputValue)}
                disabled={isLoading || !inputValue.trim()}
                className="px-4 py-2.5 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full text-sm font-medium
                           hover:opacity-90 transition-opacity disabled:opacity-50"
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

