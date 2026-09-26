import * as React from 'react'
import { Check, CircleAlert, ReceiptText } from 'lucide-react'
import {
  formatCompactMoney,
  formatSimulationDay,
} from '../../features/simulation/presentation'
import type { SimulationObligation } from '../../features/simulation/types'

interface MonthAgendaProps {
  currentDay: number
  daysInMonth: number
  obligations: SimulationObligation[]
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

function obligationClasses(
  obligation: SimulationObligation,
  isToday: boolean,
): string {
  if (obligation.status === 'PAID') {
    return 'border-[#B9DFD5] bg-[#E6F7F2] text-[#187A6C] dark:border-[#2D5B57] dark:bg-[#183B39] dark:text-[#8FE0D2]'
  }
  if (obligation.status === 'MISSED') {
    return 'border-[#F1D98A] bg-[#FFF1C8] text-[#7A5710] dark:border-[#6E5411] dark:bg-[#40351B] dark:text-[#FFE59B]'
  }
  if (isToday) {
    return 'border-[#FF9BBC] bg-[#FFE8EF] text-[#091828] dark:border-[#AC2A5D] dark:bg-[#3A1B2A] dark:text-white'
  }
  return 'border-[#D8E8E2] bg-white text-[#091828] dark:border-[#2D3449] dark:bg-[#131B2E] dark:text-white'
}

function ObligationIcon({ status }: { status: SimulationObligation['status'] }) {
  if (status === 'PAID') return <Check className="size-4 shrink-0" aria-hidden="true"/>
  if (status === 'MISSED') return <CircleAlert className="size-4 shrink-0" aria-hidden="true"/>
  return <ReceiptText className="size-4 shrink-0" aria-hidden="true"/>
}

function statusSuffix(status: SimulationObligation['status']): string {
  if (status === 'PAID') return ' (paid)'
  if (status === 'MISSED') return ' (missed)'
  return ''
}

export function MonthAgenda({
  currentDay,
  daysInMonth,
  obligations,
}: MonthAgendaProps) {
  const scrollerRef = React.useRef<HTMLDivElement>(null)
  const currentDayRef = React.useRef<HTMLLIElement>(null)
  const hasCentredRef = React.useRef(false)

  const obligationsByDay = React.useMemo(() => {
    const byDay = new Map<number, SimulationObligation[]>()
    for (const obligation of obligations) {
      if (obligation.dueDay < 1 || obligation.dueDay > daysInMonth) continue
      byDay.set(obligation.dueDay, [...(byDay.get(obligation.dueDay) ?? []), obligation])
    }
    return byDay
  }, [obligations, daysInMonth])

  const todayCount = obligationsByDay.get(currentDay)?.length ?? 0

  React.useLayoutEffect(() => {
    const scroller = scrollerRef.current
    const day = currentDayRef.current
    if (!scroller || !day) return

    const scrollerRect = scroller.getBoundingClientRect()
    const dayRect = day.getBoundingClientRect()
    const top =
      scroller.scrollTop +
      (dayRect.top - scrollerRect.top) -
      scroller.clientHeight / 2 +
      dayRect.height / 2
    const smooth = hasCentredRef.current && !prefersReducedMotion()
    hasCentredRef.current = true

    if (typeof scroller.scrollTo === 'function') {
      scroller.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' })
    } else {
      scroller.scrollTop = top
    }
  }, [currentDay])

  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1)

  return (
    <section aria-labelledby="month-agenda-title">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[#AC2A5D] dark:text-[#FFB1C5]">
            {formatSimulationDay(currentDay, daysInMonth)}
          </p>
          <h2
            id="month-agenda-title"
            className="text-2xl font-black text-[#091828] dark:text-white"
          >
            Month agenda
          </h2>
        </div>
        <span className="rounded-full bg-[#FFD9E6] px-3 py-1 text-sm font-black text-[#AC2A5D]">
          Today ({todayCount})
        </span>
      </div>

      <div className="mt-3 rounded-[22px] border-2 border-[#091828] bg-white shadow-[4px_5px_0_#091828] dark:border-[#060E20] dark:bg-[#111c31] dark:shadow-[4px_5px_0_#060E20]">
        <div
          ref={scrollerRef}
          tabIndex={0}
          aria-label="Days in the simulated month"
          className="relative h-80 overflow-y-auto overscroll-contain rounded-[20px] px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF6B9D]"
        >
          <div className="relative py-[8.5rem]">
          <span
            aria-hidden="true"
            className="absolute bottom-0 left-[9px] top-0 w-0.5 bg-[#CFE6DF] dark:bg-[#2D5B57]"
          />
          <ol className="relative">
            {days.map((day) => {
              const isToday = day === currentDay
              const isPast = day < currentDay
              const dayObligations = obligationsByDay.get(day) ?? []

              return (
                <li
                  key={day}
                  ref={isToday ? currentDayRef : undefined}
                  aria-current={isToday ? 'date' : undefined}
                  className="relative py-1.5 pl-8"
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-3 size-5 rounded-full border-2 ${
                      isToday
                        ? 'border-[#091828] bg-[#FF6B9D]'
                        : isPast
                          ? 'border-[#7CB8A9] bg-[#CFE6DF] dark:border-[#2D5B57] dark:bg-[#183B39]'
                          : 'border-[#6B6375] bg-white dark:bg-[#131B2E]'
                    }`}
                  />
                  <p className={`text-sm font-black ${isPast ? 'text-[#6B6375] dark:text-[#A0AEC0]' : 'text-[#091828] dark:text-white'}`}>
                    Day {day}
                    {isToday && (
                      <span className="ml-2 text-xs font-bold text-[#AC2A5D] dark:text-[#FFB1C5]">
                        Today
                      </span>
                    )}
                  </p>
                  {dayObligations.length === 0 ? (
                    <p className="mt-1 rounded-xl border border-[#D8E8E2] px-3 py-2 text-sm text-[#6B6375] dark:border-[#2D3449] dark:text-[#A0AEC0]">
                      No obligations
                    </p>
                  ) : (
                    <ul className="mt-1 flex flex-col gap-1.5">
                      {dayObligations.map((obligation) => (
                        <li
                          key={obligation.id}
                          className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm ${obligationClasses(obligation, isToday)}`}
                        >
                          <ObligationIcon status={obligation.status}/>
                          <span className={`min-w-0 flex-1 truncate font-semibold ${obligation.status === 'PAID' ? 'line-through decoration-1' : ''}`}>
                            {obligation.name}
                            <span className="sr-only">{statusSuffix(obligation.status)}</span>
                          </span>
                          <span className="shrink-0 font-black">
                            {formatCompactMoney(obligation.amountDue)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
