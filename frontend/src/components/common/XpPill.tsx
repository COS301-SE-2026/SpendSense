import * as React from "react"
import { Check } from "lucide-react"
import { cn, xpPillVariants, type XpPillVariants } from "@/lib/utils"
 

type XpPillProps = Omit<React.HTMLAttributes<HTMLSpanElement>, "children"> &
  XpPillVariants & {
    amount: number
    earned?: boolean
    label?: string
}

export function XpPill({
  amount,
  earned = false,
  label,
  tone,
  size = "md",
  className,
  ...props
}: XpPillProps) {
  const resolvedTone = tone ?? (earned ? "muted" : "yellow")
  const displayLabel = label ?? `+${amount} XP`
 

  return (
    <span
      data-slot="xp-pill"
      data-tone={resolvedTone}
      data-earned={earned || undefined}
      className={cn(xpPillVariants({ tone: resolvedTone, size }), className)}
      {...props}
    >
      {earned ? (
        <>
          <span className="line-through">{displayLabel}</span>
          <Check aria-hidden="true" className="size-4" />
        </>
      ) : (
        displayLabel
      )}
    </span>
  )
}
