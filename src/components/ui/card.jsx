import * as React from "react";

import { cn } from "@/lib/utils";

const Card = React.forwardRef(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "enterprise-panel text-[var(--text-main)]",
        className,
      )}
      {...props}
    />
  );
});

const CardHeader = React.forwardRef(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("flex flex-col space-y-1.5 p-5", className)} {...props} />;
});

const CardTitle = React.forwardRef(({ className, ...props }, ref) => {
  return <h3 ref={ref} className={cn("font-semibold leading-none tracking-tight", className)} {...props} />;
});

const CardContent = React.forwardRef(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("p-5 pt-0", className)} {...props} />;
});

Card.displayName = "Card";
CardHeader.displayName = "CardHeader";
CardTitle.displayName = "CardTitle";
CardContent.displayName = "CardContent";

export { Card, CardContent, CardHeader, CardTitle };
