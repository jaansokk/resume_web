import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { postChat, type ClientUI } from '../utils/chatApi';
import type { Message } from './types';
import { CVView } from './views/cv/CVView';

export default function CVApp() {
  const [conversationId] = useState(() => uuidv4());
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chips, setChips] = useState<string[]>([]);

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

  return (
    <CVView
      messages={messages}
      inputValue={inputValue}
      onInputChange={setInputValue}
      onSend={handleSend}
      isLoading={isLoading}
      chips={chips}
      onChipSelect={handleChipSelect}
    />
  );
}

