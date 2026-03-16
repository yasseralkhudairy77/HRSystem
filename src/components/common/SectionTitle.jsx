export default function SectionTitle({ title, subtitle }) {
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-soft)]">Ringkasan Halaman</div>
      <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-[var(--text-main)]">{title}</h2>
      <p className="max-w-3xl text-sm leading-6 text-[var(--text-muted)]">{subtitle}</p>
    </div>
  );
}
