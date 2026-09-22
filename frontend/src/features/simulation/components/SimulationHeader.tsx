import { Clock3, WalletCards, PiggyBank } from 'lucide-react'
import { useSimulationCountdown } from '@/hooks/useSimulationCountdown'
import type { SimulationDetail } from '../types'

interface SimulationHeaderProps {
  simulation: SimulationDetail
}

function formatMoney(value: string): string {
  return `R ${Number(value).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function SimulationHeader({
  simulation,
}: SimulationHeaderProps) {
  const { session } = simulation

  const secondsRemaining = useSimulationCountdown(
    session.nextDayAt,
  )

  return (
    <section className="rounded-3xl border-2 border-[#091828] bg-white p-4 shadow-[4px_5px_0_#091828] dark:bg-[#111c31]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wide text-[#AC2A5D]">
            Simulated Month
          </p>
          <h1 className="mt-1 text-2xl font-black text-[#091828] dark:text-white">
            Day {session.currentDay} of {session.daysInMonth}
          </h1>
        </div>
        {session.timedMode && secondsRemaining !== null && (
          <div
            className="flex items-center gap-2 rounded-full bg-[#FFF1C8] px-3 py-2 text-sm font-bold text-[#091828]"
            aria-label={`${secondsRemaining} seconds until the next simulated day`}
          >
            <Clock3 className="size-4"/>
            {secondsRemaining}s
          </div>
        )}
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-[#FFD9E6] p-3">
          <p className="text-xs font-semibold text-[#6B6375]">
            Starting budget
          </p>
          <p className="mt-1 text-lg font-black text-[#091828] dark:text-white">
            {formatMoney(session.startingBudget)}
          </p>
        </div>
        <div className="rounded-2xl bg-[#E6F7F2] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6B6375]">
            <WalletCards className="size-4"/>
            Current
          </div>
          <p className="mt-1 text-lg font-black text-[#091828] dark:text-white">
            {formatMoney(session.currentBalance)}
          </p>
        </div>
        <div className="rounded-2xl bg-[#EFEBFF] p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#6B6375]">
            <PiggyBank className="size-4"/>
            Savings
          </div>
          <p className="mt-1 text-lg font-black text-[#091828] dark:text-white">
            {formatMoney(session.savingsBalance)}
          </p>
        </div>
        <div className="rounded-2xl bg-[#FFF1C8] p-3">
          <p className="text-xs font-semibold text-[#6B6375]">
            Score
          </p>
          <p className="mt-1 text-lg font-black text-[#091828] dark:text-white">
            {session.score}
          </p>
        </div>
      </div>
    </section>
  )
}