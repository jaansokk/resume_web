/**
 * Option C: "Slide-in Panel"
 * - Chat triggers a slide-in panel from the right
 * - Similar to split view but overlay style
 * - Maintains CV context while chatting
 */

import { useState } from 'react';
import { CVContent } from './CVContent';
import { CVTableOfContents } from './CVTableOfContents';
import { CVHeader } from './CVHeader';
import type { Message } from '../../types';

interface CVViewOptionCProps {
  messages: Message[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  isLoading: boolean;
  chips: string[];
  onChipSelect: (chip: string) => void;
}

export function CVViewOptionC({
  messages,
  inputValue,
  onInputChange,
  onSend,
  isLoading,
  chips,
  onChipSelect,
}: CVViewOptionCProps) {
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  return (
    <div className="v2-concept min-h-screen">
      <CVHeader />
      
      {/* Main layout - shifts when panel is open */}
      <div 
        className={`transition-all duration-300 ${
          isPanelOpen ? 'lg:mr-[400px]' : ''
        }`}
      >
        <div className="max-w-6xl mx-auto px-6 pt-24 pb-32">
          <div className="flex gap-16">
            {/* Left: CV Content */}
            <main className="flex-1 min-w-0">
              <CVContent />
            </main>
            
            {/* Right: Table of Contents - hidden when panel open on smaller screens */}
            <aside className={`hidden w-48 flex-shrink-0 ${isPanelOpen ? 'xl:block' : 'lg:block'}`}>
              <CVTableOfContents />
            </aside>
          </div>
        </div>
      </div>

      {/* Toggle button - fixed position */}
      <button
        onClick={() => setIsPanelOpen(!isPanelOpen)}
        className={`fixed bottom-6 z-50 flex items-center gap-2 px-5 py-3 
                   bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full
                   shadow-lg shadow-black/30 hover:opacity-90 transition-all
                   ${isPanelOpen ? 'right-[416px]' : 'right-6'}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="text-sm font-medium">
          {isPanelOpen ? 'Close' : 'Ask about my CV'}
        </span>
      </button>

      {/* Slide-in panel */}
      <div 
        className={`fixed top-0 right-0 h-full w-[400px] bg-[var(--v2-bg-elevated)] 
                    border-l border-[var(--v2-border)] z-40
                    transform transition-transform duration-300 ease-out
                    ${isPanelOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--v2-border-subtle)] mt-14">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[var(--v2-accent)]" />
            <div>
              <h2 className="text-sm font-medium">Chat with Jaan</h2>
              <p className="text-xs text-[var(--v2-text-tertiary)]">Ask about experience, skills, projects</p>
            </div>
          </div>
        </div>

        {/* Messages area */}
        <div className="h-[calc(100%-180px)] overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-[var(--v2-accent-dim)] flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--v2-accent)]">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <p className="text-[var(--v2-text-secondary)] text-sm mb-6">
                Ask me anything about my background, experience, or what I'm looking for.
              </p>
              <div className="space-y-2">
                {[
                  'What blockchain projects have you worked on?',
                  'Tell me about your agile experience',
                  'What scale of teams have you managed?',
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => onSend(suggestion)}
                    className="w-full px-4 py-3 text-sm text-left bg-[var(--v2-bg-card)] border border-[var(--v2-border-subtle)]
                               text-[var(--v2-text-secondary)] rounded-xl hover:border-[var(--v2-accent)] 
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
                className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
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
                <div className="flex gap-1.5">
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
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[var(--v2-border-subtle)] bg-[var(--v2-bg-elevated)]">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend(inputValue)}
              placeholder="Type your question..."
              className="flex-1 bg-[var(--v2-bg)] border border-[var(--v2-border-subtle)] rounded-full
                         px-4 py-3 text-sm placeholder:text-[var(--v2-text-tertiary)]
                         focus:outline-none focus:border-[var(--v2-accent)]"
              disabled={isLoading}
            />
            <button
              onClick={() => onSend(inputValue)}
              disabled={isLoading || !inputValue.trim()}
              className="px-5 py-3 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full text-sm font-medium
                         hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isPanelOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsPanelOpen(false)}
        />
      )}
    </div>
  );
}

