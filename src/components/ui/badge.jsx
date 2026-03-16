import { cn } from "@/lib/utils";

const variantClasses = {
  default: "border-transparent bg-[var(--brand-800)] text-white",
  outline: "border-[var(--border-strong)] bg-white text-[var(--text-muted)]",
};

export function Badge({ className, variant = "default", ...props }) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] transition-colors focus:outline-none focus:ring-2 focus:ring-[rgba(30,79,143,0.22)] focus:ring-offset-2",
        variantClasses[variant] || variantClasses.default,
        className,
      )}
      {...props}
    />
  );
}
