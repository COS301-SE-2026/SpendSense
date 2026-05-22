import * as React from "react"
import { Check } from "lucide-react"
import { cn, streakTickVariants, type StreakTickVariants } from "@/lib/utils"
 

//streak ticks for days where an expense was logged and empty circle for days missed

type DayState = NonNullable<StreakTickVariants["state"]>
type DayConfig = { state: DayState; key?: string | number }


type StreakTicksProps = Omit<React.HTMLAttributes<HTMLDivElement>, "children"> &
  Pick<StreakTickVariants, "size"> & {
    days?: DayConfig[]
    total?: number
    completed?: number[]
    currentIndex?: number
    "aria-label"?: string
}

export function StreakTicks({
  days,
  total = 7,
  completed= [],
  currentIndex,
  size= "md",
  className,
  "aria-label": ariaLabel,
  ...props
}: StreakTicksProps) {

  //build the day list from the convenience props if "days" wasn't given.
  const dayList: DayConfig[] = days ?? Array.from({ length: total }, (_, i) => {
    if (completed.includes(i))   
        return { state: "complete", key: i }
    if (currentIndex === i)      
        return { state: "current",  key: i }
    return { state: "upcoming", key: i }
  })
 
  const completeCount = dayList.filter(d => d.state === "complete").length
 
  return (
    <div
      data-slot="streak-ticks"
      role="group"
      aria-label={ariaLabel ?? `${completeCount} of ${dayList.length} days completed`}
      className={cn("flex items-center justify-center gap-2", className)}
      {...props}
    >
      {dayList.map((day, i) => (
        <span
          key={day.key ?? i}
          className={cn(streakTickVariants({ state: day.state, size }))}
          aria-label={
            day.state === "complete" ? `Day ${i + 1} completed` :
            day.state === "current"  ? `Day ${i + 1} (today)` :`Day ${i + 1}`
          }
        >
          {day.state === "complete" && (
            <Check aria-hidden="true" strokeWidth={3} />
          )}
        </span>
      ))}
    </div>
  )
}
