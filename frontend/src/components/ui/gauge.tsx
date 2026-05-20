import * as React from "react"
import {
  cn,
  gaugeIndicatorVariants,
  type GaugeIndicatorVariants,
} from "@/lib/utils"
 
//gauge for credit score

const RADIUS = 80
const ARC_LENGTH = Math.PI * RADIUS
const STROKE_WIDTH = 18
const ARC_PATH = `M 20 100 A ${RADIUS} ${RADIUS} 0 0 1 180 100`
 
const SIZE_MAP = {
  sm: { width: 160 },
  md: { width: 220 },
  lg: { width: 300 },
} as const
 
type GaugeProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children"> &
  GaugeIndicatorVariants & {
    value: number
    min?: number
    max?: number
    size?: keyof typeof SIZE_MAP
    children?: React.ReactNode
    "aria-label"?: string
}


function Gauge({
  value,
  min = 0,
  max = 100,
  tone = "pink",
  size = "md",
  className,
  children,
  "aria-label": ariaLabel,
  ...props
}: GaugeProps) {

    const clamped = Math.min(Math.max(value, min), max)
    const fraction = max === min ? 0 : (clamped - min) / (max - min)
    const filledLength = fraction * ARC_LENGTH

    const { width } = SIZE_MAP[size]
    const height = Math.round(width * (110 / 200))

    return (
    <div
      data-slot="gauge"
      data-tone={tone}
      data-size={size}
      role="meter"
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={clamped}
      aria-label={ariaLabel ?? `${clamped} out of ${max}`}
      className={cn("relative inline-block shrink-0", className)}
      style={{ width, height: height + Math.round(width * 0.35) }}
      {...props}
    >
      <svg
        viewBox="0 0 200 110"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="block w-full"
      >
        {/*track */}
        <path
          d={ARC_PATH}
          fill="none"
          stroke="#E8EFEC"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
        {/*indicator (filled portion) */}
        <path
          d={ARC_PATH}
          fill="none"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeDasharray={`${filledLength} ${ARC_LENGTH}`}
          className={cn(gaugeIndicatorVariants({ tone }))}
        />
      </svg>
 
      {children && (
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end pb-1 text-center">
          {children}
        </div>
      )}
    </div>
  )
}
 
export { Gauge }
 