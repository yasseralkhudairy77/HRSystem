export default function ModalTriggerCard({ title, description, triggerLabel }) {
  return (
    <div className="rounded-3xl border border-[var(--border-soft)] bg-white p-5 shadow-sm">
      <div className="text-lg font-semibold text-[var(--text-main)]">{title}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">{description}</p>
      <button
        type="button"
        className="mt-4 inline-flex rounded-full border border-[var(--border-soft)] bg-[var(--surface-0)] px-4 py-2 text-sm font-medium text-[var(--text-main)] transition hover:border-[var(--border-strong)] hover:bg-white"
      >
        {triggerLabel}
      </button>
    </div>
  );
}
