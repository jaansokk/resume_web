import { experiences, skills, education, type Experience } from './cvData';

interface CVContentProps {
  className?: string;
}

function ExperienceCard({ experience, index }: { experience: Experience; index: number }) {
  return (
    <article 
      id={experience.id}
      className="group scroll-mt-24"
      style={{ animationDelay: `${index * 100}ms` }}
    >
      <div className="relative pl-6 pb-12 border-l border-[var(--v2-border-subtle)] last:pb-0">
        {/* Timeline dot */}
        <div className="absolute -left-[5px] top-1 w-[9px] h-[9px] rounded-full bg-[var(--v2-accent)] opacity-60 group-hover:opacity-100 transition-opacity" />
        
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-lg font-medium text-[var(--v2-text)]">
                {experience.title}
              </h3>
              <p className="text-[var(--v2-accent)] font-medium">
                {experience.company}
              </p>
            </div>
            <span className="text-sm text-[var(--v2-text-tertiary)] font-mono whitespace-nowrap">
              {experience.period}
            </span>
          </div>
          
          {/* Tags */}
          <div className="flex flex-wrap gap-2 mt-3">
            {experience.tags.map((tag) => (
              <span 
                key={tag}
                className="px-2 py-0.5 text-xs bg-[var(--v2-accent-dim)] text-[var(--v2-accent)] rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
        
        {/* Summary */}
        <p className="text-[var(--v2-text-secondary)] mb-4 leading-relaxed">
          {experience.summary}
        </p>
        
        {/* Highlights */}
        <ul className="space-y-2">
          {experience.highlights.map((highlight, idx) => (
            <li 
              key={idx}
              className="flex items-start gap-3 text-sm text-[var(--v2-text-secondary)]"
            >
              <span className="text-[var(--v2-accent)] mt-1.5 text-[8px]">●</span>
              <span>{highlight}</span>
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function CVContent({ className = '' }: CVContentProps) {
  return (
    <div className={`${className}`}>
      {/* Header / About */}
      <section className="mb-16">
        <h1 className="text-4xl md:text-5xl font-medium mb-2">
          Jaan <span className="v2-serif text-[var(--v2-accent)]">Sokk</span>
        </h1>
        <p className="text-xl text-[var(--v2-text-secondary)] mb-6">
          Product Manager & Technical Lead
        </p>
        <p className="text-[var(--v2-text-secondary)] max-w-2xl leading-relaxed">
          A hands-on product leader who can balance strategic vision with tactical execution, 
          work closely with engineering teams, and drive results through data and user feedback 
          rather than just process. 10+ years across fintech, blockchain, gaming, and mobility.
        </p>
      </section>

      {/* Experience */}
      <section id="experience" className="mb-16">
        <h2 className="text-xs uppercase tracking-wider text-[var(--v2-text-tertiary)] mb-8 font-medium">
          Experience
        </h2>
        <div className="space-y-0">
          {experiences.map((exp, idx) => (
            <ExperienceCard key={exp.id} experience={exp} index={idx} />
          ))}
        </div>
      </section>

      {/* Skills */}
      <section id="skills" className="mb-16">
        <h2 className="text-xs uppercase tracking-wider text-[var(--v2-text-tertiary)] mb-8 font-medium">
          Skills
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-sm font-medium text-[var(--v2-text)] mb-3">Product</h3>
            <ul className="space-y-1.5">
              {skills.product.map((skill) => (
                <li key={skill} className="text-sm text-[var(--v2-text-secondary)]">{skill}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-[var(--v2-text)] mb-3">Technical</h3>
            <ul className="space-y-1.5">
              {skills.technical.map((skill) => (
                <li key={skill} className="text-sm text-[var(--v2-text-secondary)]">{skill}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-medium text-[var(--v2-text)] mb-3">Process</h3>
            <ul className="space-y-1.5">
              {skills.process.map((skill) => (
                <li key={skill} className="text-sm text-[var(--v2-text-secondary)]">{skill}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Education */}
      <section id="education" className="mb-16">
        <h2 className="text-xs uppercase tracking-wider text-[var(--v2-text-tertiary)] mb-8 font-medium">
          Education & Certifications
        </h2>
        <div className="space-y-4">
          {education.map((edu) => (
            <div key={edu.degree} className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-[var(--v2-text)]">{edu.degree}</p>
                <p className="text-sm text-[var(--v2-text-secondary)]">{edu.school}</p>
              </div>
              <span className="text-sm text-[var(--v2-text-tertiary)] font-mono">{edu.year}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

