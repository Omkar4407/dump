import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

/*
 * Chunky extruded controls.
 *
 * Each variant sets `--edge` to its own deep
 * partner colour, which `press-3d` renders as
 * the solid slab underneath the surface.
 */
const buttonVariants = cva(
  "press-3d group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-sans font-semibold whitespace-nowrap outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-violet text-white [--edge:var(--violet-deep)] hover:brightness-108",
        coral:
          "bg-coral text-ink [--edge:var(--coral-deep)] hover:brightness-105",
        mint:
          "bg-mint text-ink [--edge:var(--mint-deep)] hover:brightness-105",
        lemon:
          "bg-lemon text-ink [--edge:var(--lemon-deep)] hover:brightness-105",
        outline:
          "bg-card text-foreground [--edge:var(--border)] hover:bg-secondary",
        secondary:
          "bg-secondary text-secondary-foreground [--edge:var(--border)] hover:brightness-98",
        ghost:
          "bg-transparent text-foreground shadow-none hover:bg-secondary active:not-disabled:translate-y-0 active:not-disabled:shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground [--edge:color-mix(in_oklch,var(--destructive),black_18%)] hover:brightness-108",
        link: "bg-transparent text-violet underline-offset-4 shadow-none hover:underline active:not-disabled:translate-y-0 active:not-disabled:shadow-none",
      },
      size: {
        default: "h-10 px-4 text-sm",
        xs: "h-7 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 px-3.5 text-[0.8125rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 px-6 text-base",
        xl: "h-14 px-7 text-lg",
        icon: "size-10",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-9",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
