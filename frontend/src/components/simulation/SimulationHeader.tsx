import { ChevronLeft, Clock3, Pause } from 'lucide-react'
import { useSimulationCountdown } from '@/hooks/useSimulationCountdown'
import { formatCompactMoney, formatPoints } from '../../features/simulation/presentation'
import type { SimulationDetail } from '../../features/simulation/types'

interface SimulationHeaderProps {
  simulation: SimulationDetail
  onPause?: () => void
  pausing?: boolean
  onExit?: () => void
  canAdvance?: boolean
  advancing?: boolean
  onAdvance?: () => void
}

export function SimulationHeader({
  simulation,
  onPause,
  pausing = false,
  onExit,
  canAdvance = false,
  advancing = false,
  onAdvance,
}: SimulationHeaderProps) {
  const { session } = simulation

  const secondsRemaining = useSimulationCountdown(
    session.nextDayAt,
  )

  return (
    <header className="flex flex-col">
      <div className="flex items-center gap-3 pb-5">
        {onExit ? (
          <button
            type="button"
            onClick={onExit}
            aria-label="Exit"
            className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-[#060E20] dark:bg-[#FFB1C5] dark:shadow-[4px_4px_0_#060E20]"
          >
            <ChevronLeft className="size-5 text-[#6E0034] dark:text-[#650030]" aria-hidden="true"/>
          </button>
        ) : (
          <span className="size-12 shrink-0" aria-hidden="true"/>
        )}
        <div className="flex flex-1 items-center justify-center">
          <h1 className="whitespace-nowrap rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 text-base font-bold text-[#091828] shadow-[4px_4px_0_#091828] [transform:rotate(-3deg)] dark:border-[#060E20] dark:bg-[#FFB1C5] dark:text-[#091828] dark:shadow-[4px_4px_0_#FF6B9D]">
            Simulated Month
          </h1>
        </div>
        {onPause ? (
          <button
            type="button"
            onClick={onPause}
            disabled={pausing}
            aria-label="Pause"
            aria-busy={pausing}
            className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FFF1C8] shadow-[4px_4px_0_#091828] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#060E20] dark:bg-[#3D351B] dark:shadow-[4px_4px_0_#060E20]"
          >
            <Pause className="size-5 fill-current text-[#091828] dark:text-[#FFE59B]" aria-hidden="true"/>
          </button>
        ) : (
          <span className="size-12 shrink-0" aria-hidden="true"/>
        )}
      </div>

      <dl className="grid grid-cols-2 border-y border-[#D8E8E2] py-3 text-center dark:border-[#2D3449]">
        <div className="flex flex-col-reverse border-r border-[#D8E8E2] dark:border-[#2D3449]">
          <dt className="text-xs text-[#6B6375] dark:text-[#A0AEC0]">
            Current
          </dt>
          <dd className="text-base font-black text-[#091828] dark:text-white">
            {formatCompactMoney(session.currentBalance)}
          </dd>
        </div>
        <div className="flex flex-col-reverse">
          <dt className="text-xs text-[#6B6375] dark:text-[#A0AEC0]">
            Savings
          </dt>
          <dd className="text-base font-black text-[#091828] dark:text-white">
            {formatCompactMoney(session.savingsBalance)}
          </dd>
        </div>
      </dl>

      <div className="flex items-center justify-between gap-3 border-b border-[#D8E8E2] py-3 dark:border-[#2D3449]">
        <p className="leading-tight">
          <span className="block text-xl font-black text-[#091828] dark:text-white">
            {formatPoints(session.score)}
          </span>
          <span className="text-xs text-[#6B6375] dark:text-[#A0AEC0]">
            points
          </span>
        </p>
        {canAdvance && onAdvance ? (
          <button
            type="button"
            disabled={advancing}
            onClick={onAdvance}
            className="rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-5 py-2.5 text-sm font-black text-[#091828] shadow-[3px_3px_0_#091828] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#060E20]"
          >
            {advancing ? 'Advancing...' : (
              <>
                <span aria-hidden="true">→ </span>
                Advance day
              </>
            )}
          </button>
        ) : session.timedMode && secondsRemaining !== null ? (
          <div
            className="flex items-center gap-2 rounded-full bg-[#FFF1C8] px-3 py-2 text-sm font-bold text-[#091828]"
            aria-label={`${secondsRemaining} seconds until the next simulated day`}
          >
            <Clock3 className="size-4" aria-hidden="true"/>
            {secondsRemaining}s
          </div>
        ) : null}
      </div>
    </header>
  )
}
