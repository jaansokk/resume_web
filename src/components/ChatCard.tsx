import { useState } from 'react';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';

export default function ChatCard() {
  const [messages, setMessages] = useState<Array<{ text: string; type: 'user' | 'ai'; showEmailInput?: boolean }>>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [showMessages, setShowMessages] = useState(false);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    
    setShowMessages(true);
    setMessages(prev => [...prev, { text, type: 'user' }]);
    setMessageCount(prev => prev + 1);
    const currentCount = messageCount + 1;

    setTimeout(() => {
      const isOpportunity = /pm|product|manager|owner|lead|hire|job|team|opportunity|position|role/i.test(text);
      
      if (currentCount === 1) {
        if (isOpportunity) {
          setMessages(prev => [...prev, {
            text: "That sounds promising. I've led product and engineering at Guardtime, 4Finance, and Playtech. Check out my experience timeline.",
            type: 'ai'
          }]);
          setTimeout(() => {
            window.location.href = `/chat?message=${encodeURIComponent(text)}`;
          }, 800);
        } else {
          setMessages(prev => [...prev, {
            text: "Great to connect. I'm a Product Owner & Technical Lead — 15 years across blockchain, fintech, and mobility data. What would you like to know?",
            type: 'ai'
          }]);
        }
      } else if (currentCount === 2 || currentCount === 3) {
        setMessages(prev => [...prev, {
          text: "Do you want to see more examples of my past experience that would relate to this?",
          type: 'ai'
        }]);
      } else if (currentCount >= 3) {
        setMessages(prev => [...prev, {
          text: "This could be a great fit. Could I get your email so Jaan can follow up?",
          type: 'ai',
          showEmailInput: true
        }]);
      }
    }, 400);
  };

  const handleEmailSubmit = (email: string) => {
    if (!email.trim()) return;
    setMessages(prev => [...prev, {
      text: "Perfect. Jaan will reach out soon.",
      type: 'ai'
    }]);
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
              type={msg.type}
              showEmailInput={msg.showEmailInput}
              onEmailSubmit={handleEmailSubmit}
            />
          ))}
        </div>
      )}
      
      <div className="px-5 py-4 border-t border-border">
        <ChatInput onSend={handleSend} />
      </div>
    </div>
  );
}

