import * as React from "react"
import { cn } from "@/lib/utils"

//current streak flame does not match our wireframe 
//but it will be replaced after demo one to improve the look.

const SIZE_MAP = {
  sm: { width: 88,  fontSize: 36, sublabel: 11 },
  md: { width: 140, fontSize: 60, sublabel: 14 },
  lg: { width: 200, fontSize: 86, sublabel: 18 },
} as const
 
type StreakFlameProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children"> & {
    days: number
    label?: string
    size?: keyof typeof SIZE_MAP
}

export function StreakFlame({
  days,
  label = "day streak",
  size = "md",
  className,
  ...props
}: StreakFlameProps) {
  const { width, fontSize, sublabel } = SIZE_MAP[size]
  const height = Math.round(width * (170 / 140))
 
  return (
    <div
      data-slot="streak-flame"
      role="img"
      aria-label={`${days}-${label}`}
      className={cn("relative inline-block shrink-0", className)}
      style={{ width, height }}
      {...props}
    >
      <svg
        viewBox="0 0 140 170"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      >
        {/* Outer hot-pink flame: pointed top, rounded base */}
        <path
          d="M70 6
             C 78 26, 92 32, 96 50
             C 99 64, 88 70, 92 84
             C 96 100, 116 102, 118 120
             C 120 144, 96 162, 70 162
             C 44 162, 20 144, 22 120
             C 24 102, 44 100, 48 84
             C 52 70, 41 64, 44 50
             C 48 32, 62 26, 70 6 Z"
          fill="#FF6B9D"
        />
        {/* Inner orange flame, slightly inset */}
        <path
          d="M70 32
             C 76 46, 84 52, 86 66
             C 88 76, 80 80, 82 92
             C 85 106, 100 110, 102 124
             C 104 142, 88 154, 70 154
             C 52 154, 36 142, 38 124
             C 40 110, 55 106, 58 92
             C 60 80, 52 76, 54 66
             C 56 52, 64 46, 70 32 Z"
          fill="#F7A23B"
        />
      </svg>
 
      {/* Number + label, absolutely centred over the flame */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-[16%]">
        <span
          className="font-bold leading-none text-[#091828]"
          style={{ fontSize }}
        >
          {days}
        </span>
        <span
          className="font-semibold leading-tight text-[#091828]"
          style={{ fontSize: sublabel }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
 