interface ChatMessageProps {
  text: string;
  type: 'user' | 'ai';
  showEmailInput?: boolean;
  onEmailSubmit?: (email: string) => void;
}

export default function ChatMessage({ text, type, showEmailInput = false, onEmailSubmit }: ChatMessageProps) {
  return (
    <div className={`mb-4 animate-[rise_0.3s_ease] ${type === 'user' ? 'text-right' : ''}`}>
      <div className={`inline-block px-4 py-3 text-[0.9375rem] max-w-[90%] ${
        type === 'user'
          ? 'bg-accent text-bg font-medium'
          : 'bg-bg-card border border-border'
      }`}>
        {text}
      </div>
      {showEmailInput && type === 'ai' && (
        <div className="mt-3 flex gap-0">
          <input
            type="email"
            placeholder="your@email.com"
            className="flex-1 px-3.5 py-2.5 bg-bg border border-border border-r-0 font-sans text-[0.8125rem] text-text outline-none focus:border-accent"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && onEmailSubmit) {
                const target = e.target as HTMLInputElement;
                onEmailSubmit(target.value);
                target.value = '';
              }
            }}
          />
          <button
            onClick={(e) => {
              const input = (e.target as HTMLElement).previousElementSibling as HTMLInputElement;
              if (input.value && onEmailSubmit) {
                onEmailSubmit(input.value);
                input.value = '';
              }
            }}
            className="px-4 py-2.5 bg-accent border-none font-sans text-[0.6875rem] font-bold uppercase tracking-wide text-bg cursor-pointer"
          >
            Submit
          </button>
        </div>
      )}
    </div>
  );
}

