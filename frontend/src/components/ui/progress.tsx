import * as React from "react"
import { Progress as ProgressPrimitive } from "radix-ui"
import {
  cn,
  progressTrackVariants,
  progressIndicatorVariants,
  type ProgressTrackVariants,
  type ProgressIndicatorVariants,
} from "@/lib/utils"
 

type ProgressProps = React.ComponentProps<typeof ProgressPrimitive.Root> &
  ProgressTrackVariants &
  ProgressIndicatorVariants & {
    value?: number | null
    max?: number
}

function Progress({
  className,
  tone = "pink",
  size = "md",
  value = 0,
  max = 100,
  ...props
}: ProgressProps) {
  const safeValue =
    value == null ? null : Math.min(Math.max(value, 0), Math.max(max, 1))
  const percent = safeValue == null ? 0 : (safeValue / max) * 100
 
 return (
    <ProgressPrimitive.Root
      data-slot="progress"
      data-tone={tone}
      data-size={size}
      value={safeValue}
      max={max}
      className={cn(progressTrackVariants({ size }), className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className={cn(progressIndicatorVariants({ tone }))}
        style={{ width: `${percent}%` }}
      />
    </ProgressPrimitive.Root>
  )
} 

export { Progress }