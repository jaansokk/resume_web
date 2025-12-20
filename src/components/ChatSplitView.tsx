import { useState, useEffect } from 'react';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import { findRelevantExperiences, classifyMessage, type ExperienceMatch } from '../utils/keywordMatching';

interface ChatSplitViewProps {
  initialMessage?: string;
}

export default function ChatSplitView({ initialMessage = '' }: ChatSplitViewProps) {
  const [messages, setMessages] = useState<Array<{ text: string; type: 'user' | 'ai'; showEmailInput?: boolean }>>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [relatedExperiences, setRelatedExperiences] = useState<ExperienceMatch[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialMessage) {
      handleSend(initialMessage);
    }
  }, []);

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    
    setMessages(prev => [...prev, { text, type: 'user' }]);
    setMessageCount(prev => prev + 1);
    const currentCount = messageCount + 1;
    setIsLoading(true);

    // Find relevant experiences
    const experiences = findRelevantExperiences(text);
    setRelatedExperiences(experiences);

    setTimeout(() => {
      setIsLoading(false);
      const classification = classifyMessage(text);
      
      if (currentCount === 1) {
        if (classification === 'opportunity') {
          setMessages(prev => [...prev, {
            text: "That sounds promising. I've led product and engineering at Guardtime, 4Finance, and Playtech. Here are some relevant experiences.",
            type: 'ai'
          }]);
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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-[600px]">
      {/* Left: Related Experience */}
      <div className="bg-bg-alt p-6">
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-mid mb-4 pb-3 border-b border-border">
          Related Experience
        </h2>
        {relatedExperiences.length > 0 ? (
          <div className="space-y-4">
            {relatedExperiences.map((exp) => (
              <a
                href={`/experience/${exp.slug}`}
                key={exp.slug}
                className="block p-4 bg-bg-card border border-border hover:border-accent hover:translate-x-1 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-lg font-bold">{exp.company}</h3>
                  <span className="text-xs font-medium text-text-dim">{exp.period}</span>
                </div>
                <div className="text-sm font-medium text-accent mb-2">{exp.role}</div>
                <p className="text-sm text-text-mid leading-relaxed">{exp.summary}</p>
                <div className="flex gap-2 mt-3 flex-wrap">
                  {exp.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="px-3 py-1.5 bg-bg-alt border border-border text-[0.6875rem] font-semibold uppercase tracking-wide text-text-dim">
                      {tag}
                    </span>
                  ))}
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-text-mid text-sm">Start a conversation to see relevant experience...</p>
        )}
      </div>

      {/* Right: Chat */}
      <div className="bg-bg-alt border border-border flex flex-col">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 bg-accent animate-pulse"></span>
            <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-dim">
              Ask me anything
            </span>
          </div>
        </div>
        
        <div className="flex-1 px-5 py-5 overflow-y-auto min-h-[300px]">
          {messages.length === 0 && (
            <p className="text-text-mid text-sm">Start a conversation...</p>
          )}
          {messages.map((msg, idx) => (
            <ChatMessage
              key={idx}
              text={msg.text}
              type={msg.type}
              showEmailInput={msg.showEmailInput}
              onEmailSubmit={handleEmailSubmit}
            />
          ))}
          {isLoading && (
            <div className="text-text-mid text-sm">Thinking...</div>
          )}
        </div>
        
        <div className="px-5 py-4 border-t border-border">
          <ChatInput onSend={handleSend} placeholder="Ask about this role..." disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}

