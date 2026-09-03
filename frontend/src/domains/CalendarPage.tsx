import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Clock,
  AlignJustify,
  AlertTriangle,
} from "lucide-react"
import { CustomCard } from "@/components/ui/CustomCard"
import { cn } from "@/lib/utils"
import { useCalendarOccurrences, type CalendarOccurrence } from "@/hooks/useCalendarOccurrences"
import { useUserProfile } from "@/hooks/useUserProfile"
import { getOccurrenceDetail } from "@/features/payments/paymentsApi"
import {
  BADGE_STYLES,
  formatCurrency,
  iconBgForType,
  isPayable,
  type OccurrenceStatus,
} from "@/features/payments/occurrenceDisplay"
import { ObligationInitial } from "@/components/common/ObligationInitial"
import { BottomNav } from "@/components/common/BottomNav"
 
 
// TYPES

type DotType = {color: string; check?: boolean}

// CONSTANTS
 
const MONTH_NAMES =[
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]
 
const DAY_HEADERS =["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
 
// HELPERS
 
function getDaysInMonth(year: number, month: number): number{
  return new Date(year, month + 1, 0).getDate()
}
 
function getStartDayOfMonth(year: number, month: number): number{
  return new Date(year, month, 1).getDay()
}
 
// group occurrences by day of month for quick calendar lookup
function groupByDay(occurrences: CalendarOccurrence[]): Record<number, CalendarOccurrence[]>{
  const map: Record<number, CalendarOccurrence[]>={}
  for(const occ of occurrences){
    const day = new Date(occ.dueDate).getDate()
    if(!map[day]) map[day] = []
    map[day].push(occ)
  }
  return map
}
 
// summary totals from occurrence list
// the third card is labelled MISSED but represents money still owed on a past
// due date, so it covers both OVERDUE (past due) and MISSED (past recovery)
function calcSummary(occurrences: CalendarOccurrence[]){
  let paid = 0
  let dueSoon = 0
  let missed = 0
  for(const occ of occurrences){
    if(occ.status === "PAID" || occ.status === "PAID_LATE") paid += occ.amountDue
    else if(occ.status === "OVERDUE" || occ.status === "MISSED") missed += occ.amountDue
    else if(occ.status === "PENDING") dueSoon += occ.amountDue
  }
  return {paid, dueSoon, missed}
}
 
function dotForStatus(status: OccurrenceStatus): DotType{
  switch (status){
    case "PAID":
    case "PAID_LATE": return { color: "bg-[#6FC9B0] dark:bg-[#5eead4]", check: true }
    case "OVERDUE":
    case "MISSED": return { color: "bg-[#AC2A5D] dark:bg-[#ffb4ab]" }
    case "PENDING":
    default: return { color: "bg-[#F2BF3C] dark:bg-[#ffd166]" }
  }
}
 
// MAIN PAGE
 
export default function CalendarPage(){
  const navigate = useNavigate()
 
  const{
    occurrences,
    loading,
    error,
    displayYear,
    displayMonth,
    goToPreviousMonth,
    goToNextMonth,
  } = useCalendarOccurrences()
 
  // null = no date selected, show all month expenses
  const [selectedDate, setSelectedDate] = React.useState<number | null>(null)
  // tracks mid fetch cards so we can show a spinner on it
  const [tappingId, setTappingId] = React.useState<string | null>(null)
 
  const now = new Date()
  const isCurrentMonth = now.getFullYear() === displayYear && now.getMonth() === displayMonth
  const today = isCurrentMonth ? now.getDate() : -1
 
  const byDay = groupByDay(occurrences)
  const summary = calcSummary(occurrences)

  const { user } = useUserProfile()
  const monthlyBudget = user?.monthlyBudget ?? null
  const remainingBudget = 
    monthlyBudget !== null 
      ? Math.max(monthlyBudget - summary.paid, 0) 
      : null
 
  // dot map: at most 2 dots per day, overdue shown first
  const eventDots: Record<number, DotType[]> = {}
  for(const [dayStr, occs] of Object.entries(byDay)){
    const day = Number(dayStr)
    const order: Record<string, number> = { OVERDUE: 0, PENDING: 1, PAID: 2, PAID_LATE: 3, MISSED: 4 }
    const sorted = [...occs].sort((a, b) => (order[a.status] ?? 5) - (order[b.status] ?? 5))
    eventDots[day] = sorted.slice(0, 2).map((o) => dotForStatus(o.status as OccurrenceStatus))
  }
 
  // toggle: clicking the active date deselects it
  function handleDateSelect(day: number){
    setSelectedDate(prev => (prev === day ? null : day))
  }
 
  // tap an occurrence card,fetch detail (for scoreRisk) then carry everything to PaymentForm
  async function handleOccurrenceTap(occ: CalendarOccurrence) {
    if (!isPayable(occ.status as OccurrenceStatus)) return
 
    setTappingId(occ.id)
    try{
      const detail = await getOccurrenceDetail(occ.id)
      navigate("/paymentForm",{
        state:{
          occurrence: detail.occurrence,
          obligation: detail.obligation,
          scoreRisk: detail.scoreRisk,
        },
      })
    } 
    catch(err){
      console.error("Failed to load occurrence detail, falling back to list data:", err)
      navigate("/paymentForm",{
        state:{
          occurrence:{
            id: occ.id,
            dueDate: occ.dueDate,
            amountDue: occ.amountDue,
            currency: occ.currency,
            status: occ.status,
            sequenceNumber: occ.sequenceNumber,
            paidAt: null,
            overdueAt: null,
            missedAt: null,
          },

          obligation: occ.obligation,
          scoreRisk: null,
        },
      })
    } 
    finally{
      setTappingId(null)
    }
  }
 
  const visibleOccurrences = selectedDate === null
      ? [...occurrences].sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
      : (byDay[selectedDate] ?? [])
 
  const monthLabel = MONTH_NAMES[displayMonth]
 
  return(
    <div className="min-h-screen bg-[#F4FBF7] pb-24 dark:bg-[#0b1326]">
      <div className="mx-auto w-full max-w-md px-5 pt-6">
 
        {/* HEADER */}
        <header className="flex items-center gap-3">
          <Link
            to="/"
            aria-label="Go back"
            className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#060e20]"
          >
            <ChevronLeft className="size-5 text-[#6E0034] dark:text-[#650030]" />
          </Link>
 
          <div className="flex flex-1 items-center justify-center">
              <div
                  className="rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#ffb1c5] dark:shadow-[4px_4px_0_#ff6b9d]"
                  style={{transform: "rotate(-3deg)"}}>
                      
                  <span className="text-base font-bold text-[#091828] dark:text-[#091828]">Money Calendar</span>
              </div>
          </div>
 
          <Link
            to="/calendar/scheduled"
            aria-label="All scheduled payments"
            className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#E3EAE6] shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#1c263c] dark:shadow-[4px_4px_0_#060e20]"
          >
            <AlignJustify className="size-5 text-[#091828] dark:text-[#a0aec0]" />
          </Link>
        </header>
 
        {/* MONTH NAVIGATION */}
        <div className="mt-8 flex items-center justify-between">
          <button
            aria-label="Previous month"
            onClick={goToPreviousMonth}
            className="flex size-10 items-center justify-center rounded-full border-2 border-[#FF6B9D] text-[#FF6B9D] bg-[#FFD9E1] shadow-[2px_2px_0_#091828] dark:bg-[#ff6b9d]/20 dark:shadow-[2px_2px_0_#060e20]"
          >
            <ChevronLeft className="size-5" />
          </button>
 
          <h1 className="text-center text-3xl font-extrabold leading-tight text-[#091828] dark:text-white">
            {monthLabel}<br />{displayYear}
          </h1>
 
          <button
            aria-label="Next month"
            onClick={goToNextMonth}
            className="flex size-10 items-center justify-center rounded-full border-2 border-[#FF6B9D] text-[#FF6B9D] bg-[#FFD9E1] shadow-[2px_2px_0_#091828] dark:bg-[#ff6b9d]/20 dark:shadow-[2px_2px_0_#060e20]"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
 
        {/* error banner */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border-2 border-[#AC2A5D] bg-[#FFD9E1] px-4 py-3 dark:border-[#ffb4ab] dark:bg-[#93000a]/30">
            <AlertTriangle className="size-4 shrink-0 text-[#AC2A5D] dark:text-[#ffb4ab]" />
            <p className="text-sm font-semibold text-[#AC2A5D] dark:text-[#ffb4ab]">{error}</p>
          </div>
        )}
 
        {/* SUMMARY CARDS */}
        {monthlyBudget !== null && (
          <div className="mt-6">
            <div className="rounded-3xl border-2 border-[#091828] bg-white px-5 py-4 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[4px_4px_0_#060e20]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6375] dark:text-[#a0aec0]">
                MONTHLY BUDGET LEFT
              </p>

              <p className="mt-1 text-2xl font-extrabold text-[#091828] dark:text-white">
                {formatCurrency(remainingBudget ?? 0)}
                <span className="ml-2 text-sm font-semibold text-[#6b6375] dark:text-[#a0aec0]">
                  of {formatCurrency(monthlyBudget)}
                </span>
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <div style={{ transform: "rotate(-2deg)" }}>
            <div className="rounded-3xl border-2 border-[#091828] bg-white px-5 py-4 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[4px_4px_0_#060e20]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6375] dark:text-[#a0aec0]">
                PAID THIS MONTH&nbsp;
                <Check className="inline size-3 text-[#6FC9B0] dark:text-[#5eead4]" strokeWidth={3} />
              </p>
              {loading
                ? <div className="mt-2 h-7 w-24 animate-pulse rounded-full bg-[#E3EAE6] dark:bg-[#1c263c]" />
                : <p className="mt-1 text-2xl font-extrabold text-[#6FC9B0] dark:text-[#5eead4]">{formatCurrency(summary.paid)}</p>
              }
            </div>
          </div>
 
          <div style={{ transform: "rotate(1.5deg)" }}>
            <div className="rounded-3xl border-2 border-[#091828] bg-white px-5 py-4 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[4px_4px_0_#060e20]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6375] dark:text-[#a0aec0]">
                DUE SOON&nbsp;
                <Clock className="inline size-3 text-[#F2BF3C] dark:text-[#ffd166]" />
              </p>
              {loading
                ? <div className="mt-2 h-7 w-24 animate-pulse rounded-full bg-[#E3EAE6] dark:bg-[#1c263c]" />
                : <p className="mt-1 text-2xl font-extrabold text-[#F2BF3C] dark:text-[#ffd166]">{formatCurrency(summary.dueSoon)}</p>
              }
            </div>
          </div>
 
          <div>
            <div className="rounded-3xl border-2 border-[#091828] bg-white px-5 py-4 shadow-[4px_4px_0_#091828] dark:border-[#060e20] dark:bg-[#131b2e] dark:shadow-[4px_4px_0_#060e20]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6375] dark:text-[#a0aec0]">
                MISSED&nbsp;
                <X className="inline size-3 text-[#AC2A5D] dark:text-[#ffb4ab]" strokeWidth={3} />
              </p>
              {loading
                ? <div className="mt-2 h-7 w-24 animate-pulse rounded-full bg-[#E3EAE6] dark:bg-[#1c263c]" />
                : <p className="mt-1 text-2xl font-extrabold text-[#AC2A5D] dark:text-[#ffb4ab]">{formatCurrency(summary.missed)}</p>
              }
            </div>
          </div>
        </div>
 
        {/* CALENDAR GRID */}
        <div className="mt-6" aria-label="Calendar">
          <div className="grid grid-cols-7">
            {DAY_HEADERS.map(d => (
              <div key={d} className="py-1 text-center text-[10px] font-semibold text-[#6b6375] dark:text-[#a0aec0]">
                {d}
              </div>
            ))}
          </div>
 
          {loading
            ? (
              <div className="mt-2 grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="mx-auto size-10 animate-pulse rounded-full bg-[#E3EAE6] dark:bg-[#1c263c]" />
                ))}
              </div>
            ): (
              <CalendarGrid
                year={displayYear}
                month={displayMonth}
                today={today}
                selectedDate={selectedDate}
                eventDots={eventDots}
                onSelect={handleDateSelect}
              />
            )
          }
        </div>
 
        {/* CONTEXT PANEL */}
        <div className="mt-6" style={{ transform: "rotate(1deg)" }}>
          <div className="rounded-2xl border-2 border-[#091828] bg-[#FFD9E1] px-5 py-4 shadow-[2px_2px_0_#091828] dark:border-[#060e20] dark:bg-[#2d1b2e] dark:shadow-[2px_2px_0_#060e20]">
            {selectedDate === null ? (
              <p className="text-xl font-extrabold text-[#091828] dark:text-white" aria-label="Showing all expenses">
                {monthLabel.charAt(0) + monthLabel.slice(1).toLowerCase()} {displayYear}, <br />all expenses
              </p>
            ) : (
              <p className="text-xl font-extrabold text-[#091828] dark:text-white">
                {monthLabel.charAt(0) + monthLabel.slice(1).toLowerCase()} {selectedDate}, what&apos;s<br />happening
              </p>
            )}
          </div>
        </div>
 
        {/* EVENT LIST */}
        <div className="mt-4 flex flex-col gap-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-3xl bg-[#E3EAE6] dark:bg-[#1c263c]" />
            ))
          ) : visibleOccurrences.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#6b6375] dark:text-[#a0aec0]">
              {selectedDate === null ? "No upcoming payments this month." : "No expenses on this date"}
            </p>
          ) : (
            visibleOccurrences.map(occ => (
              <OccurrenceCard
                key={occ.id}
                occurrence={occ}
                showDate={selectedDate === null}
                isTapping={tappingId === occ.id}
                onTap={() => void handleOccurrenceTap(occ)}
              />
            ))
          )}
        </div>
 
      </div>
      <BottomNav active="calendar" />
    </div>
  )
}
 
 
// OCCURRENCE CARD
// payable statuses (PENDING, OVERDUE) show a tap to pay affordance and navigates to PaymentForm
// statuses that are non payable (PAID, MISSED, etc.) are display only
 
function OccurrenceCard({
  occurrence,
  showDate,
  isTapping,
  onTap,
}: {
  occurrence: CalendarOccurrence
  showDate: boolean
  isTapping: boolean
  onTap: ()=>void
}){
  const status = occurrence.status as OccurrenceStatus
  const badge = BADGE_STYLES[status] ?? BADGE_STYLES.PENDING
  const iconBg = iconBgForType(occurrence.obligation.type)
  const payable = isPayable(status)
  const dayOfMonth = new Date(occurrence.dueDate).getDate()
  const monthShort = new Date(occurrence.dueDate).toLocaleString("en-ZA", { month: "short" })
 
  return(
    <CustomCard className="rounded-3xl border-2 border-[#091828] bg-white p-4 shadow-sm dark:border-[#060e20] dark:bg-[#131b2e]">
      <button
        type="button"
        disabled={!payable || isTapping}
        onClick={onTap}
        className={cn(
          "w-full text-left",
          payable && !isTapping ? "cursor-pointer" : "cursor-default",
        )}
        aria-label={
          payable
            ? `Pay ${occurrence.obligation.name}, ${formatCurrency(occurrence.amountDue)}`
            : `${occurrence.obligation.name}, ${badge.label}`
        }
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] dark:border-[#060e20]",
              iconBg,
            )}
          >
            {isTapping
              ? <div className="size-5 animate-spin rounded-full border-2 border-[#091828] border-t-transparent" />
              : <ObligationInitial type={occurrence.obligation.type} />
            }
          </div>
 
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-bold text-[#091828] dark:text-white">{occurrence.obligation.name}</p>
              {showDate && (
                <span className="text-[10px] font-semibold text-[#6b6375] dark:text-[#a0aec0]">
                  {monthShort} {dayOfMonth}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className={cn("inline-block rounded-full border border-[#091828] px-2 py-0.5 dark:border-[#060e20]", badge.bg)}>
                <span className={cn("text-[10px] font-bold", badge.text)}>{badge.label}</span>
              </span>
              {payable && !isTapping && (
                <span className="text-[10px] font-semibold text-[#AC2A5D] dark:text-[#ff6b9d]">Tap to pay →</span>
              )}
            </div>
          </div>
 
          <p className={cn(
            "text-base font-extrabold",
            status === "OVERDUE" ? "text-[#AC2A5D] dark:text-[#ffb4ab]" : "text-[#091828] dark:text-white",
          )}>
            {formatCurrency(occurrence.amountDue)}
          </p>
        </div>
      </button>
    </CustomCard>
  )
}
 
 
// CALENDAR GRID
 
function CalendarGrid({
  year,
  month,
  today,
  selectedDate,
  eventDots,
  onSelect,
}:{

  year: number
  month: number
  today: number
  selectedDate: number|null
  eventDots: Record<number, DotType[]>
  onSelect: (d: number)=>void
}){

  const daysInMonth = getDaysInMonth(year, month)
  const startDay = getStartDayOfMonth(year, month)
  const monthName = MONTH_NAMES[month]
 
  const cells: (number | null)[] =[
    ...Array(startDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)
 
  const weeks: (number | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
 
  return (
    <div className="flex flex-col">
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day, di) => {
            if (day === null) return <div key={di} />
            const isToday = day === today
            const isSelected = day === selectedDate
            return (
              <div key={di} className="flex flex-col items-center pb-1">
                <button
                  onClick={() => onSelect(day)}
                  aria-label={`${monthName.charAt(0) + monthName.slice(1).toLowerCase()} ${day}`}
                  aria-pressed={isSelected}
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    "flex size-10 items-center justify-center text-xl font-extrabold transition",
                    isToday
                      ? "rounded-full border-2 border-[#091828] text-[#091828] dark:border-[#ff6b9d] dark:text-white"
                      : isSelected
                      ? "underline decoration-2 underline-offset-2 text-[#091828] dark:text-white"
                      : "text-[#091828] dark:text-white",
                  )}
                >
                  {day}
                </button>
 
                {eventDots[day] && (
                  <div className="flex gap-1">
                    {eventDots[day].map((dot, i) =>
                      dot.check ? (
                        <div key={i} className={cn("size-3 rounded-full flex items-center justify-center", dot.color)}>
                          <Check className="size-2 text-white dark:text-[#0b1326]" strokeWidth={3} />
                        </div>
                      ) : (
                        <div key={i} className={cn("size-2.5 rounded-full", dot.color)} />
                      )
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}