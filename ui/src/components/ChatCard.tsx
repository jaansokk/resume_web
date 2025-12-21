import { useState } from 'react';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import { findRelevantExperiences } from '../utils/keywordMatching';

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

    // Check if keywords are detected that would trigger split view
    const relevantExperiences = findRelevantExperiences(text);
    const hasKeywords = relevantExperiences.length > 0;
    
    // Also check for opportunity keywords
    const isOpportunity = /pm|product|manager|owner|lead|hire|job|team|opportunity|position|role/i.test(text);

    setTimeout(() => {
      if (currentCount === 1) {
        if (isOpportunity || hasKeywords) {
          setMessages(prev => [...prev, {
            text: "That sounds promising. I've led product and engineering at Guardtime, 4Finance, and Playtech. Here are some relevant experiences.",
            type: 'ai'
          }]);
          // Navigate to split view when keywords are detected
          if (hasKeywords || isOpportunity) {
            setTimeout(() => {
              window.location.href = `/chat?message=${encodeURIComponent(text)}`;
            }, 800);
          }
        } else {
          setMessages(prev => [...prev, {
            text: "Great to connect. I'm a Product Owner & Technical Lead — 15 years across blockchain, fintech, and mobility data. What would you like to know?",
            type: 'ai'
          }]);
        }
      } else if (currentCount === 2 || currentCount === 3) {
        // Check for keywords in subsequent messages too
        const newRelevantExperiences = findRelevantExperiences(text);
        if (newRelevantExperiences.length > 0) {
          setTimeout(() => {
            window.location.href = `/chat?message=${encodeURIComponent(text)}`;
          }, 800);
        }
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

