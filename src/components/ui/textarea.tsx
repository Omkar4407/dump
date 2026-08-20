import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-2xl border-2 border-border bg-card px-4 py-3 text-base font-medium text-foreground transition-colors outline-none placeholder:font-normal placeholder:text-muted-foreground focus-visible:border-violet disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-destructive aria-invalid:bg-destructive/5",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
