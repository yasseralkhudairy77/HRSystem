import { cn } from "@/lib/utils";

export function Avatar({ className, ...props }) {
  return <div className={cn("relative flex shrink-0 overflow-hidden rounded-lg border border-[var(--border-soft)] bg-white", className)} {...props} />;
}

export function AvatarFallback({ className, ...props }) {
  return (
    <div
      className={cn("flex h-full w-full items-center justify-center rounded-lg bg-[var(--surface-2)] text-sm font-semibold text-[var(--text-muted)]", className)}
      {...props}
    />
  );
}
