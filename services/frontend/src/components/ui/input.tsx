import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Base styles with better visibility
        "flex h-10 w-full rounded-md border border-input bg-card px-3 py-2 text-base text-foreground",
        // Placeholder and selection
        "placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
        // Focus states
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        // Disabled state
        "disabled:cursor-not-allowed disabled:opacity-50",
        // File input specific
        "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        // Invalid state
        "aria-invalid:border-destructive aria-invalid:ring-destructive",
        // Dark mode support
        "dark:bg-input/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
