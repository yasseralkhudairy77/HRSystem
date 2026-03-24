export default function Breadcrumb({ items = [] }) {
  if (!items.length) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={`${item.label}-${index}`} className="flex items-center gap-2">
            {index > 0 ? <span className="text-[var(--text-soft)]">/</span> : null}
            <span className={isLast ? "font-medium text-[var(--text-main)]" : ""}>{item.label}</span>
          </div>
        );
      })}
    </nav>
  );
}
