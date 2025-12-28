import { useState, useEffect } from 'react';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import { postChat, type ChatApiResponse } from '../utils/chatApi';
import {
  getDefaultExperienceItems,
  resolveExperienceItems,
  type ContentIndexItem,
} from '../utils/contentIndex';

interface ChatSplitViewProps {
  initialMessage?: string;
}

type UiMessage = { role: 'user' | 'assistant'; text: string; showEmailInput?: boolean };

function makeConversationId(): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  } catch {
    // ignore
  }
  return `conv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function getClientPageContext() {
  const path = window.location.pathname || '/';
  const activeSlug = path.startsWith('/experience/') ? path.split('/')[2] || null : null;
  return { path, activeSlug };
}

function extractRelatedSlugs(resp: ChatApiResponse): string[] {
  return (resp.related || []).map((r) => r.slug).filter(Boolean);
}

export default function ChatSplitView({ initialMessage = '' }: ChatSplitViewProps) {
  const [conversationId, setConversationId] = useState<string>(() => makeConversationId());
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [relatedExperiences, setRelatedExperiences] = useState<ContentIndexItem[]>([]);
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [experienceContent, setExperienceContent] = useState<Record<string, string>>({});
  const [didBootstrap, setDidBootstrap] = useState(false);

  useEffect(() => {
    // Bootstrap from the floating widget (ChatCard), if present.
    const raw = sessionStorage.getItem('chat_bootstrap_v1');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as {
          conversationId?: string;
          messages?: UiMessage[];
          relatedSlugs?: string[];
        };
        if (parsed.conversationId) setConversationId(parsed.conversationId);
        if (Array.isArray(parsed.messages)) setMessages(parsed.messages);
        if (Array.isArray(parsed.relatedSlugs) && parsed.relatedSlugs.length > 0) {
          resolveExperienceItems(parsed.relatedSlugs)
            .then((items) => setRelatedExperiences(items))
            .catch(() => {});
        }
        setDidBootstrap(true);
      } catch {
        // ignore invalid bootstrap payload
      } finally {
        sessionStorage.removeItem('chat_bootstrap_v1');
      }
    }

    // Always ensure we have something in the left panel as a fallback.
    getDefaultExperienceItems(3)
      .then((items) => {
        setRelatedExperiences((prev) => (prev.length > 0 ? prev : items));
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!didBootstrap && initialMessage) handleSend(initialMessage);
  }, [didBootstrap]);

  // Load experience content when tabs change
  useEffect(() => {
    if (relatedExperiences.length > 0 && activeTab < relatedExperiences.length) {
      const exp = relatedExperiences[activeTab];
      if (!experienceContent[exp.slug]) {
        fetch(`/experience/${exp.slug}`)
          .then(res => res.text())
          .then(html => {
            // Extract the main content from the HTML
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const mainContent = doc.querySelector('main')?.innerHTML || '';
            setExperienceContent(prev => ({ ...prev, [exp.slug]: mainContent }));
          })
          .catch(err => console.error('Failed to load experience:', err));
      }
    }
  }, [activeTab, relatedExperiences]);

  const handleSend = async (text: string) => {
    if (!text.trim()) return;

    const nextMessages: UiMessage[] = [...messages, { role: 'user', text }];
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
      const withAssistant: UiMessage[] = [...nextMessages, { role: 'assistant', text: assistantText, showEmailInput }];
      setMessages(withAssistant);

      const slugs = extractRelatedSlugs(resp);
      if (slugs.length > 0) {
        const items = await resolveExperienceItems(slugs);
        if (items.length > 0) {
          setRelatedExperiences(items);
          setActiveTab(0);
        }
      }
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full min-h-0">
      {/* Left: Related Experience - scrollable */}
      <div className="flex flex-col h-full min-h-0 overflow-hidden">
        <div className="flex items-center gap-6 mb-6 flex-shrink-0">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-mid whitespace-nowrap">
            Related Experience
          </h2>
          {relatedExperiences.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {relatedExperiences.slice(0, 3).map((exp, idx) => (
                <button
                  key={exp.slug}
                  onClick={() => setActiveTab(idx)}
                  className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-all whitespace-nowrap ${
                    activeTab === idx
                      ? 'bg-accent text-bg border border-accent'
                      : 'bg-bg-alt border border-border text-text-dim hover:border-accent'
                  }`}
                >
                  {exp.company || exp.title || exp.slug}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto pb-8">
          {relatedExperiences.length > 0 ? (
            <div>
              {relatedExperiences[activeTab] && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-2xl font-bold">
                        {relatedExperiences[activeTab].company || relatedExperiences[activeTab].title || relatedExperiences[activeTab].slug}
                      </h3>
                      <span className="text-sm font-medium text-text-dim">{relatedExperiences[activeTab].period || ''}</span>
                    </div>
                    <div className="text-lg font-medium text-accent mb-4">{relatedExperiences[activeTab].role || ''}</div>
                  </div>
                  
                  <p className="text-base text-text-mid leading-relaxed">{relatedExperiences[activeTab].summary || ''}</p>
                  
                  <div className="flex gap-2 flex-wrap">
                    {(relatedExperiences[activeTab].tags || []).map((tag) => (
                      <span key={tag} className="px-3 py-1.5 bg-bg-alt border border-border text-[0.6875rem] font-semibold uppercase tracking-wide text-text-dim">
                        {tag}
                      </span>
                    ))}
                  </div>
                  
                  {experienceContent[relatedExperiences[activeTab].slug] && (
                    <div className="prose prose-invert prose-sm max-w-none mt-8 border-t border-border pt-8">
                      <div dangerouslySetInnerHTML={{ __html: experienceContent[relatedExperiences[activeTab].slug] }} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="text-text-mid text-sm">Start a conversation to see relevant experience...</p>
          )}
        </div>
      </div>

      {/* Right: Chat - fills remaining height */}
      <div className="h-full min-h-0 flex flex-col bg-bg-alt border border-border">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 bg-accent animate-pulse"></span>
            <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-dim">
              Ask me anything
            </span>
          </div>
        </div>
        
        <div className="flex-1 min-h-0 px-5 py-5 overflow-y-auto">
          {messages.length === 0 && (
            <p className="text-text-mid text-sm">Start a conversation...</p>
          )}
          {messages.map((msg, idx) => (
            <ChatMessage
              key={idx}
              text={msg.text}
              type={msg.role === 'assistant' ? 'ai' : 'user'}
              showEmailInput={msg.showEmailInput}
              onEmailSubmit={handleEmailSubmit}
            />
          ))}
          {isLoading && (
            <div className="text-text-mid text-sm">Thinking...</div>
          )}
        </div>
        
        <div className="px-5 py-4 border-t border-border flex-shrink-0">
          <ChatInput onSend={handleSend} placeholder="Ask about this role..." disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}

