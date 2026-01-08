/**
 * Option B: "Inline Chat"
 * - Non-intrusive message box at bottom center
 * - Expands upwards when user chats
 * - Feels more integrated with the page
 */

import { useState } from 'react';
import { CVContent } from './CVContent';
import { CVTableOfContents } from './CVTableOfContents';
import { CVHeader } from './CVHeader';
import type { Message } from '../../types';

interface CVViewOptionBProps {
  messages: Message[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  isLoading: boolean;
  chips: string[];
  onChipSelect: (chip: string) => void;
}

export function CVViewOptionB({
  messages,
  inputValue,
  onInputChange,
  onSend,
  isLoading,
  chips,
  onChipSelect,
}: CVViewOptionBProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMessages = messages.length > 0;

  // Auto-expand when there are messages
  const shouldShowMessages = hasMessages || isExpanded;

  return (
    <div className="v2-concept min-h-screen">
      <CVHeader />
      
      {/* Main layout */}
      <div className="max-w-6xl mx-auto px-6 pt-24 pb-48">
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

      {/* Bottom chat bar - always visible */}
      <div className="fixed bottom-0 left-0 right-0 z-50">
        {/* Gradient fade */}
        <div className="h-16 bg-gradient-to-t from-[var(--v2-bg)] to-transparent pointer-events-none" />
        
        {/* Chat container */}
        <div className="bg-[var(--v2-bg)] border-t border-[var(--v2-border-subtle)] pb-6">
          <div className="max-w-2xl mx-auto px-6">
            
            {/* Expanded messages area */}
            {shouldShowMessages && (
              <div 
                className={`overflow-hidden transition-all duration-300 ${
                  hasMessages ? 'max-h-64 opacity-100 mb-4' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="pt-4 space-y-3 max-h-56 overflow-y-auto">
                  {messages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                          msg.role === 'user'
                            ? 'bg-[var(--v2-accent)] text-[var(--v2-bg)]'
                            : 'bg-[var(--v2-bg-elevated)] border border-[var(--v2-border-subtle)] text-[var(--v2-text-secondary)]'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[var(--v2-bg-elevated)] border border-[var(--v2-border-subtle)] px-4 py-3 rounded-2xl">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-[var(--v2-text-tertiary)] rounded-full animate-pulse" />
                          <span className="w-2 h-2 bg-[var(--v2-text-tertiary)] rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-[var(--v2-text-tertiary)] rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {chips.length > 0 && (
                    <div className="flex flex-wrap gap-2 justify-start">
                      {chips.map((chip) => (
                        <button
                          key={chip}
                          onClick={() => onChipSelect(chip)}
                          className="px-3 py-1.5 text-xs bg-[var(--v2-bg-elevated)] border border-[var(--v2-border-subtle)]
                                     text-[var(--v2-text-secondary)] rounded-full hover:border-[var(--v2-accent)] 
                                     hover:text-[var(--v2-accent)] transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Input bar */}
            <div className="relative">
              {/* Decorative accent line */}
              <div className="absolute -top-px left-1/2 -translate-x-1/2 w-12 h-px bg-[var(--v2-accent)] opacity-50" />
              
              <div className="flex gap-3 items-center">
                <div className="flex-1 bg-[var(--v2-bg-elevated)] border border-[var(--v2-border-subtle)] rounded-full flex items-center px-2 py-1">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => onInputChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSend(inputValue)}
                    onFocus={() => setIsExpanded(true)}
                    placeholder="Ask about my experience..."
                    className="flex-1 bg-transparent px-4 py-2.5 text-sm placeholder:text-[var(--v2-text-tertiary)]
                               focus:outline-none"
                    disabled={isLoading}
                  />
                  <button
                    onClick={() => onSend(inputValue)}
                    disabled={isLoading || !inputValue.trim()}
                    className="px-5 py-2.5 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full text-sm font-medium
                               hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
              </div>
              
              {/* Hint text when no messages */}
              {!hasMessages && (
                <p className="text-center text-xs text-[var(--v2-text-tertiary)] mt-3">
                  Ask me anything about my experience, skills, or past projects
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

