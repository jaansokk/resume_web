import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { postChat, type ClientUI } from '../../../utils/chatApi';
import type { Message } from '../../types';

export function CVChatWidget() {
  const [conversationId] = useState(() => uuidv4());
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isChatOpen) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, isChatOpen]);

  const handleSend = async (rawText: string) => {
    const text = rawText.trim();
    if (!text || isLoading) return;

    const userMessage: Message = { role: 'user', text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);
    setChips([]);

    try {
      const clientUI: ClientUI = { view: 'chat' };

      const response = await postChat({
        conversationId,
        client: {
          origin: window.location.origin,
          page: { path: '/cv' },
          ui: clientUI,
        },
        messages: newMessages.map((m) => ({ role: m.role, text: m.text })),
      });

      setMessages((prev) => [...prev, { role: 'assistant', text: response.assistant.text }]);
      if (response.chips?.length) setChips(response.chips);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Sorry — the chat service is unavailable right now. (${err instanceof Error ? err.message : 'unknown error'})`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating chat button */}
      {!isChatOpen && (
        <button
          type="button"
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[var(--v2-accent)] rounded-full 
                     flex items-center justify-center shadow-lg shadow-black/30
                     hover:scale-105 transition-transform"
          aria-label="Open chat"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-[var(--v2-bg)]"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </button>
      )}

      {/* Chat panel */}
      {isChatOpen && (
        <div
          className="fixed bottom-6 right-6 z-50 w-96 h-[500px] max-h-[70vh] bg-[var(--v2-bg-elevated)] 
                     border border-[var(--v2-border)] rounded-2xl shadow-2xl shadow-black/50
                     flex flex-col overflow-hidden animate-scale-in"
          role="dialog"
          aria-label="Chat"
        >
          {/* Chat header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--v2-border-subtle)]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--v2-accent)]" />
              <span className="text-sm font-medium">Ask about my experience</span>
            </div>
            <button
              type="button"
              onClick={() => setIsChatOpen(false)}
              className="p-1 text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text)] transition-colors"
              aria-label="Close chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages area with fade-out at bottom */}
          <div className="flex-1 overflow-y-auto relative">
            <div className="p-4 pb-24 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-[var(--v2-text-secondary)] text-sm mb-4">
                    Hi! Ask me anything about my experience, skills, or past projects.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      'What technologies do you work with?',
                      'Tell me about your Guardtime work',
                      'What kind of teams have you led?',
                    ].map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSend(suggestion)}
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
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
                      <span
                        className="w-2 h-2 bg-[var(--v2-text-tertiary)] rounded-full animate-pulse"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-2 h-2 bg-[var(--v2-text-tertiary)] rounded-full animate-pulse"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {chips.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {chips.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleSend(chip)}
                      className="px-3 py-1.5 text-xs bg-[var(--v2-bg-card)] border border-[var(--v2-border-subtle)]
                                 text-[var(--v2-text-secondary)] rounded-full hover:border-[var(--v2-accent)] 
                                 hover:text-[var(--v2-accent)] transition-colors"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Floating input area with gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <div className="h-16 bg-gradient-to-t from-[var(--v2-bg-elevated)] to-transparent" />

            <div className="bg-[var(--v2-bg-elevated)] px-4 pb-4 pointer-events-auto">
              <div className="bg-[var(--v2-bg)] border border-[var(--v2-border-subtle)] rounded-full flex items-center px-2 py-1">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
                  placeholder="Ask a question..."
                  className="flex-1 bg-transparent px-4 py-2.5 text-sm placeholder:text-[var(--v2-text-tertiary)]
                             focus:outline-none"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => handleSend(inputValue)}
                  disabled={isLoading || !inputValue.trim()}
                  className="px-5 py-2.5 bg-[var(--v2-accent)] text-[var(--v2-bg)] rounded-full text-sm font-medium
                             hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

