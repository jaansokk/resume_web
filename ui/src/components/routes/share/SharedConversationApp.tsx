import { useEffect, useMemo, useState } from 'react';
import { Header } from '../../shared/Header';
import { ArtifactsPanel } from '../../artifacts/ArtifactsPanel';
import { ChatMessage } from '../../chat/ChatMessage';
import type { Message } from '../../types';
import type { Artifacts } from '../../../utils/chatApi';
import { getShare } from '../../../utils/shareApi';
import { markHasSeenSplit } from '../../../utils/navState';
import { saveConversationState } from '../../../utils/conversationState';

function extractShareIdFromPath(pathname: string): string | null {
  // Expect /c/<shareId>
  const parts = pathname.split('/').filter(Boolean);
  if (parts.length !== 2) return null;
  if (parts[0] !== 'c') return null;
  return parts[1] || null;
}

export default function SharedConversationApp() {
  const [activeTab, setActiveTab] = useState<'brief' | 'experience'>('brief');
  const [messages, setMessages] = useState<Message[]>([]);
  const [artifacts, setArtifacts] = useState<Artifacts | null>(null);
  const [title, setTitle] = useState<string>('Shared conversation');
  const [error, setError] = useState<string | null>(null);

  const shareId = useMemo(() => {
    if (typeof window === 'undefined') return null;
    // In production, Caddy rewrites /c/<id> -> /c/ but the browser URL stays /c/<id>,
    // so pathname extraction works.
    const fromPath = extractShareIdFromPath(window.location.pathname);
    if (fromPath) return fromPath;
    // In local dev (no rewrite), allow /c/?shareId=<id>
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('shareId');
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!shareId) {
      setError('Invalid share link.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await getShare(shareId);
        if (cancelled) return;

        const snap = res.snapshot;
        const msgs: Message[] = (snap.messages || []).map((m) => ({
          role: m.role,
          text: m.text,
        }));
        setMessages(msgs);
        setArtifacts((snap.artifacts as unknown as Artifacts) || null);
        const tab = snap.ui?.split?.activeTab === 'experience' ? 'experience' : 'brief';
        setActiveTab(tab);
        if ((snap.artifacts as any)?.fitBrief?.title) setTitle((snap.artifacts as any).fitBrief.title);

        // Important UX behavior:
        // - Mark that the user has "seen split" so the header label becomes "Fit Brief & Experience"
        // - Seed localStorage conversation state so navigating to /cv and back to "/" doesn't drop the user to Handshake.
        //   We intentionally "fork" to a new conversationId per spec (shared links shouldn't inherit the original ID).
        try {
          markHasSeenSplit();
          const forkId =
            typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
              ? crypto.randomUUID()
              : String(snap.conversationId || 'shared');
          saveConversationState({
            conversationId: forkId,
            viewMode: 'split',
            messages: msgs,
            chips: [],
            artifacts: (snap.artifacts as unknown as Artifacts) || null,
            activeTab: tab,
          });
        } catch {
          // ignore localStorage issues
        }
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load share snapshot.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [shareId]);

  return (
    <div className="v2-concept h-screen flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden pt-14">
        <ArtifactsPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          artifacts={artifacts}
          onShareClick={() => {}}
        />

        <div className="flex-1 lg:w-1/2 flex flex-col bg-[var(--v2-bg-elevated)] overflow-hidden">
          <div className="flex-shrink-0 px-6 py-4 border-b border-[var(--v2-border-subtle)] flex items-center justify-between">
            <h2 className="text-lg font-medium text-[var(--v2-text)]">{title}</h2>
            <a
              href="/"
              className="text-xs text-[var(--v2-text-secondary)] hover:text-[var(--v2-text)] transition-colors"
            >
              Start a new chat →
            </a>
          </div>

          <div className="flex-1 overflow-y-auto p-6 pb-6">
            {error ? (
              <div className="text-sm text-red-300">{error}</div>
            ) : (
              <div className="space-y-6">
                {messages.map((msg, idx) => (
                  <ChatMessage key={idx} message={msg} index={idx} isInSplitView />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


