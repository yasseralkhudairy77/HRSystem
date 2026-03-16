import { cn } from "@/lib/utils";

export const Input = ({ className, type = "text", ...props }) => {
  return (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-lg border bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--text-soft)] focus-visible:ring-2 focus-visible:ring-[rgba(30,79,143,0.22)] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
};
