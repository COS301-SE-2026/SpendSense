import type { SimulationObligation } from '../../features/simulation/types'
import { ObligationRow } from './ObligationRow'

interface MonthAgendaProps {
  currentDay: number
  daysInMonth: number
  obligations: SimulationObligation[]
  canPay: boolean
  onOpenObligation?: (obligationId: string) => void
}

export function MonthAgenda({
  currentDay,
  daysInMonth,
  obligations,
  canPay,
  onOpenObligation,
}: MonthAgendaProps) {
  const progress =
    daysInMonth > 0
      ? Math.min(100, Math.max(0, (currentDay/daysInMonth) * 100))
      : 0

  const todayObligations = obligations.filter(
    (obligation) => obligation.dueDay === currentDay,
  )

  return (
    <section className="rounded-3xl border-2 border-[#091828] bg-white p-4 shadow-[4px_5px_0_#091828] dark:bg-[#111c31]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#AC2A5D]">
            Day {currentDay} of {daysInMonth}
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#091828] dark:text-white">
            Month agenda
          </h2>
        </div>
        <span className="rounded-full bg-[#FFD9E6] px-3 py-1 text-xs font-bold text-[#AC2A5D]">
          Today ({todayObligations.length})
        </span>
      </div>
      <div className="mt-4">
        <div
          className="h-2 overflow-hidden rounded-full bg-[#DCE9E5]"
          aria-label={`Month ${Math.round(progress)} percent complete`}
        >
          <div
            className="h-full rounded-full bg-[#FF6B9D]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <div className="mt-5">
        {obligations.length === 0 ? (
          <div className="rounded-2xl bg-[#F4FBF7] px-4 py-6 text-center dark:bg-[#1C263C]">
            <p className="text-sm font-semibold text-[#6B6375] dark:text-[#A0AEC0]">
              No obligations are scheduled for this month.
            </p>
          </div>
        ) : (
          obligations.map((obligation) => (
            <ObligationRow
              key={obligation.id}
              obligation={obligation}
              canPay={canPay}
              onOpen={onOpenObligation}
            />
          ))
        )}
      </div>
    </section>
  )
}