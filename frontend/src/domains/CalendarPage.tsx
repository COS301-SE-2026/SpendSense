import * as React from "react"
import { Link, useNavigate } from "react-router-dom"
import {
  Home,
  Calendar as CalendarIcon,
  Trophy,
  User,
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Clock,
  AlignJustify,
  AlertTriangle,
} from "lucide-react"
import { AddTransactionButton } from "@/components/common/AddTransactionButton"
import { CustomCard } from "@/components/ui/CustomCard"
import { cn } from "@/lib/utils"
import { apiFetch } from "@/lib/api"
import { useCalendarOccurrences, type CalendarOccurrence } from "@/hooks/useCalendarOccurrences"
 
 
// TYPES
 
type OccurrenceStatus = "PENDING"|"OVERDUE"|"PAID"|"PAID_LATE"|"MISSED"|"CANCELLED"
 
type DotType = {color: string; check?: boolean}
 
interface OccurrenceDetail{
  occurrence:{
    id: string
    dueDate: string
    amountDue: number
    currency: string
    status: string
    sequenceNumber: number
    paidAt: string|null
    overdueAt: string|null
    missedAt: string|null
  }
  obligation:{
    id: string
    name: string
    type: string
    priority: string
  }
  paymentRecord: null|unknown
  scoreRisk:{
    estimatedPenaltyIfMissed: number
    estimatedPenaltyIfLate: number
    explanation: string
  }
  reminders: unknown[]
}
 
 
// CONSTANTS
 
const MONTH_NAMES =[
  "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
  "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER",
]
 
const DAY_HEADERS =["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]
 
const BADGE_STYLES: Record<OccurrenceStatus, { bg: string; text: string; label: string }> ={
  PENDING: { bg: "bg-[#FFD9E1]", text: "text-[#3F001B]", label: "DUE SOON"},
  OVERDUE: { bg: "bg-[#AC2A5D]", text: "text-white", label: "OVERDUE"},
  PAID: { bg: "bg-[#6FC9B0]", text: "text-white", label: "PAID"},
  PAID_LATE: { bg: "bg-[#6FC9B0]", text: "text-white", label: "PAID LATE"},
  MISSED: { bg: "bg-[#AC2A5D]", text: "text-white", label: "MISSED"},
  CANCELLED: { bg: "bg-[#D3D3D3]", text: "text-[#555]", label: "CANCELLED"},
}
 
 
// HELPERS
 
function getDaysInMonth(year: number, month: number): number{
  return new Date(year, month + 1, 0).getDate()
}
 
function getStartDayOfMonth(year: number, month: number): number{
  return new Date(year, month, 1).getDay()
}
 
function formatCurrency(amount: number): string{
  return `R ${amount.toLocaleString("en-ZA", {minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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
function calcSummary(occurrences: CalendarOccurrence[]){
  let paid = 0
  let dueSoon = 0
  let overdue = 0
  for(const occ of occurrences){
    if(occ.status === "PAID" || occ.status === "PAID_LATE") paid += occ.amountDue
    else if(occ.status === "OVERDUE") overdue += occ.amountDue
    else if(occ.status === "PENDING") dueSoon += occ.amountDue
  }
  return {paid, dueSoon, overdue}
}
 
function dotForStatus(status: OccurrenceStatus): DotType{
  switch (status){
    case "PAID":
    case "PAID_LATE": return { color: "bg-[#6FC9B0]", check: true }
    case "OVERDUE":
    case "MISSED": return { color: "bg-[#AC2A5D]" }
    case "PENDING":
    default: return { color: "bg-[#F2BF3C]" }
  }
}
 
function iconBgForType(type: string): string{
  switch (type){
    case "RENT": return "bg-[#091828]"
    case "SUBSCRIPTION": return "bg-[#E9D5FF]"
    case "UTILITY": return "bg-[#DCEFE8]"
    case "BNPL": return "bg-[#FFE9B5]"
    case "IOU": return "bg-[#FFD9E1]"
    default: return "bg-[#E3EAE6]"
  }
}
 
// single letter icon fallback per obligation type
function ObligationInitial({ type }: { type: string }){
  const letters: Record<string, string>={
    RENT: "R", SUBSCRIPTION: "S", UTILITY: "U", BNPL: "B", IOU: "I", CUSTOM: "C",
  }
  return(
    <span className="text-sm font-bold text-[#091828]">
      {letters[type] ?? "?"}
    </span>
  )
}
 
// GET /payment-occurrences/:id
// doublewrap: { data: { data: { occurrence, obligation, scoreRisk, ... } } }
async function fetchOccurrenceDetail(id: string): Promise<OccurrenceDetail>{
  const response = await apiFetch<{ data: { data: OccurrenceDetail}}>(
    `/payment-occurrences/${id}`,
  )
  const detail = response?.data?.data
  if(!detail) throw new Error("Unexpected response shape from /payment-occurrences/:id")

  return{
    ...detail,
    occurrence:{
      ...detail.occurrence,
      amountDue: Number(detail.occurrence.amountDue),
    },
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
    if (occ.status === "PAID"||occ.status === "PAID_LATE"||occ.status === "CANCELLED") return
 
    setTappingId(occ.id)
    try{
      const detail = await fetchOccurrenceDetail(occ.id)
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
    <div className="min-h-screen bg-[#F4FBF7] pb-24">
      <div className="mx-auto w-full max-w-md px-5 pt-6">
 
        {/* HEADER */}
        <header className="flex items-center gap-3">
          <Link
            to="/"
            aria-label="Go back"
            className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828]"
          >
            <ChevronLeft className="size-5 text-[#6E0034]" />
          </Link>
 
          <div className="flex flex-1 items-center justify-center">
            <div
              className="rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 shadow-[4px_4px_0_#091828]"
              style={{ transform: "rotate(-3deg)" }}
            >
              <span className="text-base font-bold text-[#091828]">Money Calendar</span>
            </div>
          </div>
 
          <button
            aria-label="Calendar settings"
            className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#E3EAE6] shadow-[4px_4px_0_#091828]"
          >
            <AlignJustify className="size-5 text-[#091828]" />
          </button>
        </header>
 
        {/* MONTH NAVIGATION */}
        <div className="mt-8 flex items-center justify-between">
          <button
            aria-label="Previous month"
            onClick={goToPreviousMonth}
            className="flex size-10 items-center justify-center rounded-full border-2 border-[#FF6B9D] text-[#FF6B9D] bg-[#FFD9E1] shadow-[2px_2px_0_#091828]"
          >
            <ChevronLeft className="size-5" />
          </button>
 
          <h1 className="text-center text-3xl font-extrabold leading-tight text-[#091828]">
            {monthLabel}<br />{displayYear}
          </h1>
 
          <button
            aria-label="Next month"
            onClick={goToNextMonth}
            className="flex size-10 items-center justify-center rounded-full border-2 border-[#FF6B9D] text-[#FF6B9D] bg-[#FFD9E1] shadow-[2px_2px_0_#091828]"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
 
        {/* error banner */}
        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border-2 border-[#AC2A5D] bg-[#FFD9E1] px-4 py-3">
            <AlertTriangle className="size-4 shrink-0 text-[#AC2A5D]" />
            <p className="text-sm font-semibold text-[#AC2A5D]">{error}</p>
          </div>
        )}
 
        {/* SUMMARY CARDS */}
        <div className="mt-6 flex flex-col gap-3">
          <div style={{ transform: "rotate(-2deg)" }}>
            <div className="rounded-3xl border-2 border-[#091828] bg-white px-5 py-4 shadow-[4px_4px_0_#091828]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6375]">
                PAID THIS MONTH&nbsp;
                <Check className="inline size-3 text-[#6FC9B0]" strokeWidth={3} />
              </p>
              {loading
                ? <div className="mt-2 h-7 w-24 animate-pulse rounded-full bg-[#E3EAE6]" />
                : <p className="mt-1 text-2xl font-extrabold text-[#6FC9B0]">{formatCurrency(summary.paid)}</p>
              }
            </div>
          </div>
 
          <div style={{ transform: "rotate(1.5deg)" }}>
            <div className="rounded-3xl border-2 border-[#091828] bg-white px-5 py-4 shadow-[4px_4px_0_#091828]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6375]">
                DUE SOON&nbsp;
                <Clock className="inline size-3 text-[#F2BF3C]" />
              </p>
              {loading
                ? <div className="mt-2 h-7 w-24 animate-pulse rounded-full bg-[#E3EAE6]" />
                : <p className="mt-1 text-2xl font-extrabold text-[#F2BF3C]">{formatCurrency(summary.dueSoon)}</p>
              }
            </div>
          </div>
 
          <div>
            <div className="rounded-3xl border-2 border-[#091828] bg-white px-5 py-4 shadow-[4px_4px_0_#091828]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6375]">
                MISSED&nbsp;
                <X className="inline size-3 text-[#AC2A5D]" strokeWidth={3} />
              </p>
              {loading
                ? <div className="mt-2 h-7 w-24 animate-pulse rounded-full bg-[#E3EAE6]" />
                : <p className="mt-1 text-2xl font-extrabold text-[#AC2A5D]">{formatCurrency(summary.overdue)}</p>
              }
            </div>
          </div>
        </div>
 
        {/* CALENDAR GRID */}
        <div className="mt-6" aria-label="Calendar">
          <div className="grid grid-cols-7">
            {DAY_HEADERS.map(d => (
              <div key={d} className="py-1 text-center text-[10px] font-semibold text-[#6b6375]">
                {d}
              </div>
            ))}
          </div>
 
          {loading
            ? (
              <div className="mt-2 grid grid-cols-7 gap-1">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="mx-auto size-10 animate-pulse rounded-full bg-[#E3EAE6]" />
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
          <div className="rounded-2xl border-2 border-[#091828] bg-[#FFD9E1] px-5 py-4 shadow-[2px_2px_0_#091828]">
            {selectedDate === null ? (
              <p className="text-xl font-extrabold text-[#091828]" aria-label="Showing all expenses">
                {monthLabel.charAt(0) + monthLabel.slice(1).toLowerCase()} {displayYear} —<br />all expenses
              </p>
            ) : (
              <p className="text-xl font-extrabold text-[#091828]">
                {monthLabel.charAt(0) + monthLabel.slice(1).toLowerCase()} {selectedDate} — what&apos;s<br />happening
              </p>
            )}
          </div>
        </div>
 
        {/* EVENT LIST */}
        <div className="mt-4 flex flex-col gap-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-3xl bg-[#E3EAE6]" />
            ))
          ) : visibleOccurrences.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#6b6375]">
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
  const isPayable = status === "PENDING" || status === "OVERDUE"
  const dayOfMonth = new Date(occurrence.dueDate).getDate()
  const monthShort = new Date(occurrence.dueDate).toLocaleString("en-ZA", { month: "short" })
 
  return(
    <CustomCard className="rounded-3xl border-2 border-[#091828] bg-white p-4 shadow-sm">
      <button
        type="button"
        disabled={!isPayable || isTapping}
        onClick={onTap}
        className={cn(
          "w-full text-left",
          isPayable && !isTapping ? "cursor-pointer" : "cursor-default",
        )}
        aria-label={
          isPayable
            ? `Pay ${occurrence.obligation.name}, ${formatCurrency(occurrence.amountDue)}`
            : `${occurrence.obligation.name} — ${badge.label}`
        }
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828]",
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
              <p className="text-sm font-bold text-[#091828]">{occurrence.obligation.name}</p>
              {showDate && (
                <span className="text-[10px] font-semibold text-[#6b6375]">
                  {monthShort} {dayOfMonth}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className={cn("inline-block rounded-full border border-[#091828] px-2 py-0.5", badge.bg)}>
                <span className={cn("text-[10px] font-bold", badge.text)}>{badge.label}</span>
              </span>
              {isPayable && !isTapping && (
                <span className="text-[10px] font-semibold text-[#AC2A5D]">Tap to pay →</span>
              )}
            </div>
          </div>
 
          <p className={cn(
            "text-base font-extrabold",
            status === "OVERDUE" ? "text-[#AC2A5D]" : "text-[#091828]",
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
                      ? "rounded-full border-2 border-[#091828] text-[#091828]"
                      : isSelected
                      ? "underline decoration-2 underline-offset-2 text-[#091828]"
                      : "text-[#091828]",
                  )}
                >
                  {day}
                </button>
 
                {eventDots[day] && (
                  <div className="flex gap-1">
                    {eventDots[day].map((dot, i) =>
                      dot.check ? (
                        <div key={i} className={cn("size-3 rounded-full flex items-center justify-center", dot.color)}>
                          <Check className="size-2 text-white" strokeWidth={3} />
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
 
 
// BOTTOM NAV
 
type BottomNavTab = "home" | "calendar" | "quests" | "profile"
 
function BottomNav({ active }: { active: BottomNavTab }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E8E4F4] bg-white/95 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-md items-center justify-around px-4 py-2">
        <BottomNavItem to="/"        icon={<Home className="size-5" />}        label="Home"     active={active === "home"} />
        <BottomNavItem to="/calendar" icon={<CalendarIcon className="size-5" />} label="Calendar" active={active === "calendar"} />
        <AddTransactionButton />
        <BottomNavItem to="/quests"  icon={<Trophy className="size-5" />}      label="Quests"   active={active === "quests"}  disabled={true} />
        <BottomNavItem to="/profile" icon={<User className="size-5" />}        label="Profile"  active={active === "profile"} disabled={true} />
      </div>
    </nav>
  )
}
 
function BottomNavItem({
  to, icon, label, active, disabled,
}: {
  to: string; icon: React.ReactNode; label: string; active: boolean; disabled?: boolean
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      aria-disabled={disabled}
      onClick={(e) => { if (disabled) e.preventDefault() }}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
        active ? "bg-[#FFD8E6] text-[#ac2a5d]" : "text-[#6b6375] hover:text-[#091828]",
        disabled && "opacity-35 pointer-events-none cursor-not-allowed select-none"
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}