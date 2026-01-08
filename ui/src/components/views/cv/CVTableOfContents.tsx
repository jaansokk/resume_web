import { experiences } from './cvData';

interface CVTableOfContentsProps {
  className?: string;
}

export function CVTableOfContents({ className = '' }: CVTableOfContentsProps) {
  return (
    <nav className={`${className}`}>
      <h3 className="text-xs uppercase tracking-wider text-[var(--v2-text-tertiary)] mb-4 font-medium">
        On this page
      </h3>
      <ul className="space-y-1">
        {experiences.map((exp) => (
          <li key={exp.id}>
            <a
              href={`#${exp.id}`}
              className="group flex items-center gap-3 py-1.5 text-sm text-[var(--v2-text-secondary)] hover:text-[var(--v2-text)] transition-colors"
            >
              <span className="w-1 h-1 rounded-full bg-[var(--v2-text-tertiary)] group-hover:bg-[var(--v2-accent)] transition-colors" />
              <span className="truncate">{exp.company}</span>
            </a>
          </li>
        ))}
      </ul>
      
      <div className="mt-8 pt-6 border-t border-[var(--v2-border-subtle)]">
        <ul className="space-y-1">
          <li>
            <a
              href="#skills"
              className="text-sm text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)] transition-colors"
            >
              Skills
            </a>
          </li>
          <li>
            <a
              href="#education"
              className="text-sm text-[var(--v2-text-tertiary)] hover:text-[var(--v2-text-secondary)] transition-colors"
            >
              Education
            </a>
          </li>
        </ul>
      </div>
    </nav>
  );
}

