import { useState } from 'react';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import { postChat, type ChatApiResponse } from '../utils/chatApi';

export default function ChatCard() {
  const [conversationId] = useState<string>(() => {
    try {
      if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
    } catch {
      // ignore
    }
    return `conv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  });

  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; showEmailInput?: boolean }>>(
    [],
  );
  const [showMessages, setShowMessages] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const getClientPageContext = () => {
    const path = window.location.pathname || '/';
    const activeSlug = path.startsWith('/experience/') ? path.split('/')[2] || null : null;
    return { path, activeSlug };
  };

  const extractRelatedSlugs = (resp: ChatApiResponse): string[] => {
    const fromRelated = (resp.related || []).map((r) => r.slug).filter(Boolean);
    if (fromRelated.length > 0) return Array.from(new Set(fromRelated)).slice(0, 6);

    // Fallback: if the backend didn't return related[], use experience citations as a signal
    // to open split-view and populate left panel.
    const fromCitations = (resp.citations || [])
      .filter((c) => c.type === 'experience')
      .map((c) => c.slug)
      .filter(Boolean);
    return Array.from(new Set(fromCitations)).slice(0, 6);
  };

  const handleSend = async (text: string) => {
    if (!text.trim()) return;
    
    setShowMessages(true);
    const nextMessages = [...messages, { role: 'user' as const, text }];
    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const resp = await postChat({
        conversationId,
        client: { origin: window.location.origin, page: getClientPageContext() },
        messages: nextMessages.slice(-20).map((m) => ({ role: m.role, text: m.text })),
      });

      const assistantText = resp?.assistant?.text || "Sorry — I didn't get a response.";
      const showEmailInput = Boolean(resp?.next?.askForEmail);
      const withAssistant = [
        ...nextMessages,
        { role: 'assistant' as const, text: assistantText, showEmailInput },
      ];

      const relatedSlugs = extractRelatedSlugs(resp);
      const shouldExpand = relatedSlugs.length > 0 || resp.classification === 'new_opportunity';

      if (shouldExpand) {
        sessionStorage.setItem(
          'chat_bootstrap_v1',
          JSON.stringify({ conversationId, messages: withAssistant, relatedSlugs }),
        );
        window.location.href = '/chat';
        return;
      }

      setMessages(withAssistant);
    } catch (err) {
      const message =
        err instanceof TypeError
          ? 'Failed to fetch (likely CORS preflight/OPTIONS is not configured on the API Gateway /chat route)'
          : (err as Error)?.message || 'unknown error';
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `Sorry — the chat service is unavailable right now. (${message})`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = (email: string) => {
    if (!email.trim()) return;
    setMessages(prev => [...prev, { role: 'assistant', text: "Perfect — I’ll pass this on to Jaan." }]);
  };

  return (
    <div className="bg-bg-alt border border-border">
      <div className="px-5 py-4 border-b border-border flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <span className="w-2 h-2 bg-accent animate-pulse"></span>
          <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-dim">
            Ask me anything
          </span>
        </div>
      </div>
      
      {showMessages && (
        <div className="px-5 py-5 max-h-[280px] overflow-y-auto">
          {messages.map((msg, idx) => (
            <ChatMessage
              key={idx}
              text={msg.text}
              type={msg.role === 'assistant' ? 'ai' : 'user'}
              showEmailInput={msg.showEmailInput}
              onEmailSubmit={handleEmailSubmit}
            />
          ))}
          {isLoading && <div className="text-text-mid text-sm">Thinking...</div>}
        </div>
      )}
      
      <div className="px-5 py-4 border-t border-border">
        <ChatInput onSend={handleSend} disabled={isLoading} />
      </div>
    </div>
  );
}

