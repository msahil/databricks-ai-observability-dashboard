interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}

export function SectionHeader({ eyebrow, title, description, action, compact }: Props) {
  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2 ${compact ? 'mb-2' : 'mb-3'}`}
    >
      <div className="min-w-0 flex-1">
        {eyebrow && <p className="text-eyebrow">{eyebrow}</p>}
        <h3
          className={`font-bold tracking-tight text-db-navy ${compact ? 'text-lg' : 'text-xl'} ${eyebrow ? 'mt-0.5' : ''}`}
        >
          {title}
        </h3>
        {description && !compact && (
          <p className="mt-1 max-w-2xl text-sm leading-snug text-db-gray-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
