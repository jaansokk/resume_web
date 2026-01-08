import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { postChat, type ClientUI } from '../utils/chatApi';
import type { Message } from './types';
import { CVViewOptionA } from './views/cv/CVViewOptionA';
import { CVViewOptionB } from './views/cv/CVViewOptionB';
import { CVViewOptionC } from './views/cv/CVViewOptionC';

export type CVLayoutOption = 'A' | 'B' | 'C';

export default function CVApp() {
  const [conversationId] = useState(() => uuidv4());
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chips, setChips] = useState<string[]>([]);
  const [layoutOption, setLayoutOption] = useState<CVLayoutOption>('A');

  const handleSend = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: text.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputValue('');
    setIsLoading(true);
    setChips([]);

    try {
      const clientUI: ClientUI = {
        view: 'chat',
      };

      const response = await postChat({
        conversationId,
        client: {
          origin: window.location.origin,
          page: { path: '/cv' },
          ui: clientUI,
        },
        messages: newMessages.map(m => ({ role: m.role, text: m.text })),
      });

      const assistantMessage: Message = {
        role: 'assistant',
        text: response.assistant.text,
      };

      setMessages(prev => [...prev, assistantMessage]);

      if (response.chips && response.chips.length > 0) {
        setChips(response.chips);
      }

    } catch (err) {
      const errorMessage: Message = {
        role: 'assistant',
        text: `Sorry — the chat service is unavailable right now. (${err instanceof Error ? err.message : 'unknown error'})`,
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChipSelect = (chip: string) => {
    handleSend(chip);
  };

  const commonProps = {
    messages,
    inputValue,
    onInputChange: setInputValue,
    onSend: handleSend,
    isLoading,
    chips,
    onChipSelect: handleChipSelect,
  };

  return (
    <>
      {/* Layout selector - temporary for choosing a design */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-[var(--v2-bg-elevated)] border border-[var(--v2-border)] rounded-full px-2 py-1 flex gap-1">
        {(['A', 'B', 'C'] as const).map((opt) => (
          <button
            key={opt}
            onClick={() => setLayoutOption(opt)}
            className={`px-4 py-2 text-xs font-medium rounded-full transition-all ${
              layoutOption === opt
                ? 'bg-[var(--v2-accent)] text-[var(--v2-bg)]'
                : 'text-[var(--v2-text-secondary)] hover:text-[var(--v2-text)]'
            }`}
          >
            Option {opt}
          </button>
        ))}
      </div>

      {layoutOption === 'A' && <CVViewOptionA {...commonProps} />}
      {layoutOption === 'B' && <CVViewOptionB {...commonProps} />}
      {layoutOption === 'C' && <CVViewOptionC {...commonProps} />}
    </>
  );
}

