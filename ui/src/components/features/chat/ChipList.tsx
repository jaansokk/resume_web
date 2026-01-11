interface ChipListProps {
  chips: string[];
  onChipSelect: (chip: string) => void;
}

export function ChipList({ chips, onChipSelect }: ChipListProps) {
  if (chips.length === 0) return null;

  return (
    <div className="mt-6 flex flex-wrap gap-2 animate-fade-up opacity-0" style={{ animationFillMode: 'forwards' }}>
      {chips.map((chip) => (
        <button
          key={chip}
          onClick={() => onChipSelect(chip)}
          className="px-4 py-2 text-sm rounded-full border border-[var(--v2-border)]
                     text-[var(--v2-text-secondary)] hover:text-[var(--v2-text)]
                     hover:border-[var(--v2-accent)]/50 hover:bg-[var(--v2-accent-dim)]
                     transition-all duration-200"
        >
          {chip}
        </button>
      ))}
    </div>
  );
}

