import { canPaySimulationObligation } from '../../features/simulation/presentation'
import type { SimulationDetail } from '../../features/simulation/types'
import { ObligationRow } from './ObligationRow'

interface UpcomingObligationsProps {
  simulation: SimulationDetail
  onOpenObligation?: (obligationId: string) => void
}

export function UpcomingObligations({
  simulation,
  onOpenObligation,
}: UpcomingObligationsProps) {
  const { currentDay } = simulation.session

  const upcoming = simulation.obligations
    .filter(
      (obligation) =>
        (obligation.status === 'SCHEDULED' || obligation.status === 'PAYABLE') &&
        obligation.dueDay >= currentDay &&
        obligation.dueDay <= simulation.session.daysInMonth,
    )
    .sort((first, second) => first.dueDay - second.dueDay)

  return (
    <section
      aria-labelledby="upcoming-obligations-title"
      className="rounded-[22px] border border-[#D8E8E2] bg-white/70 p-4 dark:border-[#2D3449] dark:bg-[#111c31]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="upcoming-obligations-title"
          className="text-xl font-black text-[#091828] dark:text-white"
        >
          Upcoming obligations
        </h2>
        <span className="text-sm text-[#6B6375] dark:text-[#A0AEC0]">
          {upcoming.length} {upcoming.length === 1 ? 'item' : 'items'}
        </span>
      </div>
      {upcoming.length === 0 ? (
        <p className="mt-3 rounded-2xl bg-[#F4FBF7] px-4 py-5 text-center text-sm font-semibold text-[#6B6375] dark:bg-[#1C263C] dark:text-[#A0AEC0]">
          No obligations remain this month.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {upcoming.map((obligation) => (
            <ObligationRow
              key={obligation.id}
              obligation={obligation}
              currentDay={currentDay}
              payable={canPaySimulationObligation(simulation, obligation)}
              onOpen={onOpenObligation}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
