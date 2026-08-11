import * as React from "react"
import { cn } from "@/lib/utils"
import { Gauge } from "@/components/ui/gauge"
 

type Band = { from: number; to: number; label: string }
 
const DEFAULT_BANDS: Band[] = [
  { from: 0,   to: 486, label: "Poor" },
  { from: 487, to: 526, label: "Unfavourable" },
  { from: 527, to: 582, label: "Below Average" },
  { from: 583, to: 613, label: "Average" },
  { from: 614, to: 680, label: "Favourable" },
  { from: 681, to: 766, label: "Good" },
  { from: 767, to: 999, label: "Excellent" },
]
 
type GaugeTone = React.ComponentProps<typeof Gauge>["tone"]
 
function toneForScore(score: number, bands: Band[]): GaugeTone {
  const band = bands.find(b => score >= b.from && score <= b.to)
  if (!band) return "pink"
  
  //map by band index: bottom 3 = red, middle = yellow, top 2 = mint
  const i = bands.indexOf(band)
  if (i < 3) return "red"
  if (i < bands.length - 2) return "yellow"
  return "mint"
}

function bandLabel(score: number, bands: Band[]): string | undefined {
  return bands.find(b => score >= b.from && score <= b.to)?.label
}
 
type CreditScoreGaugeProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> & {
    score: number
    min?: number
    max?: number
    bands?: Band[]
    colorByBand?: boolean
    showBandLabel?: boolean
    size?:React.ComponentProps<typeof Gauge>["size"]
    caption?: string
}

export function CreditScoreGauge({
  score,
  min = 0,
  max = 999,
  bands = DEFAULT_BANDS,
  colorByBand = false,
  showBandLabel = false,
  size = "md",
  caption = "CREDIT SCORE",
  className,
  ...props
}: CreditScoreGaugeProps) {
  const tone = colorByBand ? toneForScore(score, bands) : "pink"
  const label = bandLabel(score, bands)
 
  return (
    <div
      data-slot="credit-score-gauge"
      data-band={label}
      className={cn("inline-flex flex-col items-center", className)}
      {...props}
    >
      <Gauge
        value={score}
        min={min}
        max={max}
        tone={tone}
        size={size}
        aria-label={`Credit score ${score} out of ${max}${label ? `, ${label}` : ""}`}
      >
        <span className="text-3xl font-bold leading-none text-[#091828] dark:text-white">
          {score}
        </span>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[#6b6375] dark:text-[#a0aec0]">
          {caption}
        </span>
      </Gauge>
 
      {showBandLabel && label && (
        <span className="-mt-1 text-sm font-semibold text-[#091828] dark:text-white">
          {label}
        </span>
      )}
    </div>
  )
}