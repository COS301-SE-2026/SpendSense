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
      style={{ width, height }}
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
          className="stroke-[#E8EFEC] dark:stroke-[#1c263c]"
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

      {/* anchor children just above the arc base (SVG y=100 out of 110 = 90.9% from top) */}
      {children && (
        <div
          className="absolute inset-x-0 flex flex-col items-center text-center"
          style={{ bottom: Math.round(height * 0.12) }}
        >
          {children}
        </div>
      )}
    </div>
  )
}
 
export { Gauge }