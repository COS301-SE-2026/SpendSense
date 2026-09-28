import * as React from "react"
import { cn } from "@/lib/utils"

const SIZE_MAP = {
  sm: { width: 88, fontSize: 36, sublabel: 11 },
  md: { width: 140, fontSize: 60, sublabel: 14 },
  lg: { width: 200, fontSize: 86, sublabel: 18 },
} as const

type StreakFlameProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> & {
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
      
        <path
          d="
            M 71 4

            C 55 10, 43 20, 38 34
            C 33 48, 37 59, 43 71

            C 48 82, 47 91, 42 96
            C 37 101, 29 98, 26 92
            C 23 87, 23 80, 25 72

            C 15 82, 9 95, 7 111
            C 4 132, 13 149, 28 159

            C 40 167, 54 169, 70 169
            C 91 169, 108 163, 119 151
            C 130 139, 134 122, 130 107

            C 127 96, 121 88, 113 83
            C 116 91, 115 98, 111 102
            C 107 106, 101 104, 99 99

            C 96 93, 100 86, 104 79
            C 110 69, 111 59, 107 49

            C 103 39, 95 32, 86 26
            C 77 20, 68 14, 71 4

            Z
          "
          fill="#FF6B9D"
        />

        <path
          d="
            M 55 68

            C 48 78, 45 89, 46 101
            C 47 112, 42 119, 36 118

            C 30 116, 28 108, 29 99
            C 22 112, 20 127, 24 140

            C 29 157, 45 167, 65 168
            C 84 169, 101 160, 109 146

            C 116 134, 116 120, 111 109
            C 109 119, 104 124, 98 123

            C 91 122, 90 114, 91 105
            C 92 96, 87 88, 80 80

            C 72 71, 66 63, 67 54
            C 60 59, 57 63, 55 68

            Z
          "
          fill="#F7A23B"
        />

        <path
          d="
            M 69 102

            C 60 113, 55 124, 57 134
            C 53 133, 49 130, 46 126

            C 44 138, 47 150, 55 158
            C 61 164, 68 167, 75 167

            C 87 166, 95 159, 99 149
            C 103 138, 99 129, 91 121

            C 83 114, 76 109, 69 102

            Z
          "
          fill="#F7A23B"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pt-[26%]">
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