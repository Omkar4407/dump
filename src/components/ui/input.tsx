import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-2xl border-2 border-border bg-card px-4 py-2 text-base font-medium text-foreground transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-semibold file:text-foreground placeholder:font-normal placeholder:text-muted-foreground focus-visible:border-violet disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-destructive aria-invalid:bg-destructive/5",
        className
      )}
      {...props}
    />
  )
}

export { Input }
