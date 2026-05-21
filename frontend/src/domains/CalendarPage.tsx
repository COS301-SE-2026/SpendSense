import * as React from "react"
import { Link } from "react-router-dom"
import {
  Home,
  Calendar as CalendarIcon,
  Trophy,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
  Radio,
  Zap,
  Check,
  X,
  Clock,
  AlignJustify,
  Wifi,
  Tv,
} from "lucide-react"

import { CustomCard } from "@/components/ui/CustomCard"
import { cn } from "@/lib/utils"


type EventStatus = "paid" | "due_soon" | "missed" | "bills_due"

interface MonthEvent {
  id: string
  date: number
  name: string
  amount: string
  status: EventStatus
  statusLabel: string
  iconBg: string
  icon: React.ReactNode
  amountColor?: string
}


const EVENTS: MonthEvent[] = [
  {
    id:"spotify",
    date: 1,
    name: "Spotify Premium",
    amount: "R 89",
    status: "paid",
    statusLabel: "PAID ✓",
    iconBg: "bg-[#E9D5FF]",
    icon: <Radio className="size-5 text-[#6B21A8]" />,
  },
  {
    id: "internet",
    date: 3,
    name: "Internet Service",
    amount: "R 54",
    status: "due_soon",
    statusLabel: "DUE SOON",
    iconBg: "bg-[#DCEFE8]",
    icon: <Wifi className="size-5 text-[#16635A]" />,
  },
  {
    id: "netflix",
    date: 5,
    name: "Netflix",
    amount: "R 199",
    status: "missed",
    statusLabel: "MISSED",
    iconBg: "bg-[#FFD9E1]",
    icon: <Tv className="size-5 text-[#AC2A5D]" />,
    amountColor: "text-[#AC2A5D]",
  },
  {
    id: "rent",
    date: 15,
    name: "Rent Payment",
    amount: "R 4,500",
    status: "due_soon",
    statusLabel: "DUE IN 3 DAYS",
    iconBg: "bg-[#091828]",
    icon: <Home className="size-5 text-white" />,
  },
  {
    id: "eskom",
    date: 15,
    name: "Eskom Utility",
    amount: "R 320",
    status: "bills_due",
    statusLabel: "BILLS DUE",
    iconBg: "bg-[#6FC9B0]",
    icon: <Zap className="size-5 text-white" />,
  },
]


// December 2026 starts on Tuesday (index 2, 0=Sun)
const MONTH_START_DAY = 2
const DAYS_IN_MONTH = 31
const DAY_HEADERS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

type DotType = { color: string; check?: boolean }
const EVENT_DOTS: Record<number, DotType[]> = {
  1:[{ color: "bg-[#6FC9B0]", check: true }],
  3:[{ color: "bg-[#F2BF3C]" }],
  5:[{ color: "bg-[#AC2A5D]" }],
  15: [{ color: "bg-[#F2BF3C]" }],
}


const BADGE_STYLES: Record<EventStatus, { bg: string; text: string }> = {
  paid:{ bg: "bg-[#6FC9B0]",  text: "text-white" },
  due_soon:{ bg: "bg-[#FFD9E1]",  text: "text-[#3F001B]" },
  missed:{ bg: "bg-[#AC2A5D]",  text: "text-white" },
  bills_due:{ bg: "bg-[#AC2A5D]",  text: "text-white" },
}


export default function CalendarPage() {
  // null = no date selected → show all month expenses
  const [selectedDate, setSelectedDate] = React.useState<number | null>(null)
  const today = 8

  // Toggle: clicking the active date deselects it
  function handleDateSelect(day: number) {
    setSelectedDate(prev => (prev === day ? null : day))
  }

  const visibleEvents =
    selectedDate === null
      ? [...EVENTS].sort((a, b) => a.date - b.date)
      : EVENTS.filter(e => e.date === selectedDate)

  return (
    <div className="min-h-screen bg-[#F4FBF7] pb-24">
      <div className="mx-auto w-full max-w-md px-5 pt-6">

        {/* ── Header ── */}
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

        {/* ── Month navigation ── */}
        <div className="mt-8 flex items-center justify-between">
          <button
            aria-label="Previous month"
            className="flex size-10 items-center justify-center rounded-full border-2 border-[#FF6B9D] text-[#FF6B9D] bg-[#FFD9E1] shadow-[2px_2px_0_#091828]"
          >
            <ChevronLeft className="size-5" />
          </button>

          <h1 className="text-center text-3xl font-extrabold leading-tight text-[#091828]">
            DECEMBER<br />2026
          </h1>

          <button
            aria-label="Next month"
            className="flex size-10 items-center justify-center rounded-full border-2 border-[#FF6B9D] text-[#FF6B9D] bg-[#FFD9E1] shadow-[2px_2px_0_#091828]"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>

        {/* ── Summary cards ── */}
        <div className="mt-6 flex flex-col gap-3">
          <div style={{ transform: "rotate(-2deg)" }}>
            <div className="rounded-3xl border-2 border-[#091828] bg-white px-5 py-4 shadow-[4px_4px_0_#091828]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6375]">
                PAID THIS MONTH&nbsp;
                <Check className="inline size-3 text-[#6FC9B0]" strokeWidth={3} />
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[#6FC9B0]">R 4,200</p>
            </div>
          </div>

          <div style={{ transform: "rotate(1.5deg)" }}>
            <div className="rounded-3xl border-2 border-[#091828] bg-white px-5 py-4 shadow-[4px_4px_0_#091828]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6375]">
                DUE SOON&nbsp;
                <Clock className="inline size-3 text-[#F2BF3C]" />
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[#F2BF3C]">R 1,580</p>
            </div>
          </div>

          <div>
            <div className="rounded-3xl border-2 border-[#091828] bg-white px-5 py-4 shadow-[4px_4px_0_#091828]">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#6b6375]">
                MISSED&nbsp;
                <X className="inline size-3 text-[#AC2A5D]" strokeWidth={3} />
              </p>
              <p className="mt-1 text-2xl font-extrabold text-[#AC2A5D]">R 250</p>
            </div>
          </div>
        </div>

        {/* ── Calendar grid ── */}
        <div className="mt-6" aria-label="Calendar">
          <div className="grid grid-cols-7">
            {DAY_HEADERS.map(d => (
              <div key={d} className="py-1 text-center text-[10px] font-semibold text-[#6b6375]">
                {d}
              </div>
            ))}
          </div>

          <CalendarGrid
            startDay={MONTH_START_DAY}
            daysInMonth={DAYS_IN_MONTH}
            today={today}
            selectedDate={selectedDate}
            eventDots={EVENT_DOTS}
            onSelect={handleDateSelect}
          />
        </div>

        {/* ── Context panel ── */}
        <div className="mt-6" style={{ transform: "rotate(1deg)" }}>
          <div className="rounded-2xl border-2 border-[#091828] bg-[#FFD9E1] px-5 py-4 shadow-[2px_2px_0_#091828]">
            {selectedDate === null ? (
              <p className="text-xl font-extrabold text-[#091828]" aria-label="Showing all expenses">
                December 2026 —<br />all expenses
              </p>
            ) : (
              <p className="text-xl font-extrabold text-[#091828]">
                Dec {selectedDate} — what's<br />happening
              </p>
            )}
          </div>
        </div>

        {/* ── Event list ── */}
        <div className="mt-4 flex flex-col gap-3">
          {visibleEvents.length === 0 ? (
            <p className="py-6 text-center text-sm text-[#6b6375]">
              No expenses on this date
            </p>
          ) : (
            visibleEvents.map(event => (
              <EventCard
                key={event.id}
                event={event}
                showDate={selectedDate === null}
              />
            ))
          )}
        </div>
      </div>

      <BottomNav active="calendar" />
    </div>
  )
}


function EventCard({
  event,
  showDate,
}: {
  event: MonthEvent
  showDate: boolean
}) {
  const badge = BADGE_STYLES[event.status]
  return (
    <CustomCard className="rounded-3xl border-2 border-[#091828] bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828]",
            event.iconBg,
          )}
        >
          {event.icon}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-[#091828]">{event.name}</p>
            {showDate && (
              <span className="text-[10px] font-semibold text-[#6b6375]">
                Dec {event.date}
              </span>
            )}
          </div>
          <span
            className={cn(
              "mt-1 inline-block rounded-full border border-[#091828] px-2 py-0.5",
              badge.bg,
            )}
          >
            <span className={cn("text-[10px] font-bold", badge.text)}>
              {event.statusLabel}
            </span>
          </span>
        </div>

        <p
          className={cn(
            "text-base font-extrabold",
            event.amountColor ?? "text-[#091828]",
          )}
        >
          {event.amount}
        </p>
      </div>
    </CustomCard>
  )
}


function CalendarGrid({
  startDay,
  daysInMonth,
  today,
  selectedDate,
  eventDots,
  onSelect,
}: {
  startDay: number
  daysInMonth: number
  today: number
  selectedDate: number | null
  eventDots: Record<number, DotType[]>
  onSelect: (d: number) => void
}) {
  const cells: (number | null)[] = [
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
            const isToday= day === today
            const isSelected = day === selectedDate
            return (
              <div key={di} className="flex flex-col items-center pb-1">
                <button
                  onClick={() => onSelect(day)}
                  aria-label={`December ${day}`}
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
                        <div
                          key={i}
                          className={cn(
                            "size-3 rounded-full flex items-center justify-center",
                            dot.color,
                          )}
                        >
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


type BottomNavTab = "home" | "calendar" | "quests" | "profile"

function BottomNav({ active }: { active: BottomNavTab }) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E8E4F4] bg-white/95 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-md items-center justify-around px-4 py-2">
        <BottomNavItem to="/"  icon={<Home className="size-5" />} label="Home" active={active === "home"} />
        <BottomNavItem to="/calendar" icon={<CalendarIcon className="size-5" />} label="Calendar" active={active === "calendar"} />

        <Link
          to="/transactions/new"
          aria-label="Add expense"
          className="flex size-14 -translate-y-3 items-center justify-center rounded-full bg-[#0a1929] text-white shadow-lg ring-4 ring-white"
        >
          <Plus className="size-6" />
        </Link>

        <BottomNavItem to="/quests" icon={<Trophy className="size-5" />} label="Quests" active={active === "quests"} />
        <BottomNavItem to="/profile" icon={<User className="size-5" />} label="Profile" active={active === "profile"} />
      </div>
    </nav>
  )
}

function BottomNavItem({
  to, icon, label, active,
}: {
  to: string; icon: React.ReactNode; label: string; active: boolean
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
        active ? "bg-[#FFD8E6] text-[#ac2a5d]" : "text-[#6b6375] hover:text-[#091828]",
      )}
    >
      {icon}
      <span>{label}</span>
    </Link>
  )
}
