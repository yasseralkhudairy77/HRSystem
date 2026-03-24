import { Inbox } from "lucide-react";

export default function EmptyState({ title, description, actionLabel }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(241,245,249,0.74))] p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[var(--brand-800)] shadow-sm">
        <Inbox className="h-6 w-6" />
      </div>
      <div className="mt-4 text-xl font-semibold text-[var(--text-main)]">{title}</div>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">{description}</p>
      {actionLabel ? (
        <div className="mt-4 inline-flex rounded-full border border-[var(--border-soft)] bg-white px-4 py-2 text-sm font-medium text-[var(--text-main)] shadow-sm">
          {actionLabel}
        </div>
      ) : null}
    </div>
  );
}
