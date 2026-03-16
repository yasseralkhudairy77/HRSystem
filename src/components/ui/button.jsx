import * as React from "react";

import { cn } from "@/lib/utils";

const variantClasses = {
  default: "border border-[var(--brand-800)] bg-[var(--brand-800)] text-white hover:bg-[var(--brand-900)] hover:border-[var(--brand-900)]",
  outline: "border border-[var(--border-strong)] bg-white text-[var(--text-main)] hover:bg-[var(--surface-0)]",
  subtle: "border border-transparent bg-[var(--surface-2)] text-[var(--text-main)] hover:bg-[#e8eef6]",
};

const sizeClasses = {
  default: "h-10 px-4 py-2",
  sm: "h-8 px-3 text-[13px]",
  lg: "h-11 px-5",
};

const Button = React.forwardRef(({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-[rgba(30,79,143,0.22)] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant] || variantClasses.default,
        sizeClasses[size] || sizeClasses.default,
        className,
      )}
      {...props}
    />
  );
});

Button.displayName = "Button";

export { Button };
