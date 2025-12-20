import { useState, useEffect } from 'react';
import ChatInput from './ChatInput';
import ChatMessage from './ChatMessage';
import { findRelevantExperiences, classifyMessage, type ExperienceMatch } from '../utils/keywordMatching';

interface ChatSplitViewProps {
  initialMessage?: string;
}

// Default experiences to show as examples
const defaultExamples: ExperienceMatch[] = [
  {
    slug: 'positium',
    company: 'Positium',
    role: 'Technical Project Lead',
    period: '2025 — Present',
    summary: 'Leading the Estonian Mobility Modelling initiative — a 2-year nationwide prototype that transforms mobile network data into actionable mobility insights for urban planning and policy decisions.',
    tags: ['Data Analytics', 'Python', 'Org Design', 'Big Data', 'Mobility'],
    relevanceScore: 3,
  },
  {
    slug: 'guardtime-pm',
    company: 'Guardtime',
    role: 'Technical Project Manager / ScrumMaster',
    period: '2019 — 2024',
    summary: 'Managed complex technical projects at scale, from construction asset management in Saudi Arabia to pandemic response infrastructure across the EU.',
    tags: ['Mobile', 'KSI Blockchain', 'Agile', 'ScrumMaster', 'Enterprise'],
    relevanceScore: 2,
  },
  {
    slug: 'playtech',
    company: 'Playtech',
    role: 'Team Lead — Casino Branding',
    period: '2012 — 2017',
    summary: 'Led a front-end development team delivering branding and customization solutions for the world\'s largest gaming operators.',
    tags: ['Gaming', 'Team Lead', 'Scrum', 'Front-end', 'B2B'],
    relevanceScore: 1,
  }
];

export default function ChatSplitView({ initialMessage = '' }: ChatSplitViewProps) {
  const [messages, setMessages] = useState<Array<{ text: string; type: 'user' | 'ai'; showEmailInput?: boolean }>>([]);
  const [messageCount, setMessageCount] = useState(0);
  const [relatedExperiences, setRelatedExperiences] = useState<ExperienceMatch[]>(defaultExamples);
  const [activeTab, setActiveTab] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [experienceContent, setExperienceContent] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialMessage) {
      handleSend(initialMessage);
    }
  }, []);

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

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    
    setMessages(prev => [...prev, { text, type: 'user' }]);
    setMessageCount(prev => prev + 1);
    const currentCount = messageCount + 1;
    setIsLoading(true);

    // Find relevant experiences
    const experiences = findRelevantExperiences(text);
    if (experiences.length > 0) {
      setRelatedExperiences(experiences);
      setActiveTab(0); // Reset to first tab when new experiences are found
    }

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
      {/* Left: Related Experience - scrollable */}
      <div className="flex flex-col h-full overflow-hidden">
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
                  {exp.company}
                </button>
              ))}
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto pb-8">
          {relatedExperiences.length > 0 ? (
            <div>
              {relatedExperiences[activeTab] && (
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-2xl font-bold">{relatedExperiences[activeTab].company}</h3>
                      <span className="text-sm font-medium text-text-dim">{relatedExperiences[activeTab].period}</span>
                    </div>
                    <div className="text-lg font-medium text-accent mb-4">{relatedExperiences[activeTab].role}</div>
                  </div>
                  
                  <p className="text-base text-text-mid leading-relaxed">{relatedExperiences[activeTab].summary}</p>
                  
                  <div className="flex gap-2 flex-wrap">
                    {relatedExperiences[activeTab].tags.map((tag) => (
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
      <div className="h-full flex flex-col bg-bg-alt border border-border">
        <div className="px-5 py-4 border-b border-border flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 bg-accent animate-pulse"></span>
            <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-text-dim">
              Ask me anything
            </span>
          </div>
        </div>
        
        <div className="flex-1 px-5 py-5 overflow-y-auto">
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
        
        <div className="px-5 py-4 border-t border-border flex-shrink-0">
          <ChatInput onSend={handleSend} placeholder="Ask about this role..." disabled={isLoading} />
        </div>
      </div>
    </div>
  );
}

