import * as React from 'react'
import { useSimulationPolling } from '@/hooks/useSimulationPolling'
import { advanceSimulation } from '../api'
import { createIdempotencyKey } from '../idempotency'
import { useRefetchAtDeadline } from '../hooks/useRefetchAtDeadline'
import { MonthAgenda } from './MonthAgenda'
import { RecentScoreActivity } from './RecentScoreActivity'
import { SimulationHeader } from './SimulationHeader'
import type { SimulationDetail } from '../types'

interface SimulationBoardProps {
  simulation: SimulationDetail
  onSimulationChange: (simulation: SimulationDetail) => void
  onRefetch: () => Promise<unknown> | void
}

export function SimulationBoard({
  simulation,
  onSimulationChange,
  onRefetch,
}: SimulationBoardProps) {
  const [advancing, setAdvancing] = React.useState(false)
  const [advanceError, setAdvanceError] =
    React.useState<string | null>(null)

  const advanceKeyRef = React.useRef<string | null>(null)

  const shouldPoll =
    simulation.session.pending.type === 'NONE' &&
    simulation.session.status === 'ACTIVE' &&
    simulation.session.timedMode

  const canPay =
    simulation.allowedActions.includes('PAY_OBLIGATION')

  const canAdvance =
    !simulation.session.timedMode &&
    simulation.allowedActions.includes('ADVANCE_DAY')

  const advancingRef = React.useRef(false)

  useSimulationPolling(
    shouldPoll,
    onRefetch,
  )

  useRefetchAtDeadline(
    shouldPoll ? simulation.session.nextDayAt : null,
    onRefetch,
  )

  const handleAdvance = async () => {
    if (!canAdvance || advancingRef.current) {
      return
    }

    advancingRef.current = true

    const idempotencyKey =
      advanceKeyRef.current ?? createIdempotencyKey()

      
    advanceKeyRef.current = idempotencyKey

    setAdvancing(true)
    setAdvanceError(null)

    try {
      const updatedSimulation = await advanceSimulation(
        simulation.session.id,
        idempotencyKey,
      )

      advanceKeyRef.current = null
      onSimulationChange(updatedSimulation)
    } catch {
      setAdvanceError(
        'The day could not be advanced. Please try again.',
      )
    } finally {
      advancingRef.current = false
      setAdvancing(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#F4FBF7] px-4 py-6 dark:bg-[#0b1326]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <SimulationHeader simulation={simulation}/>
        <MonthAgenda
          currentDay={simulation.session.currentDay}
          daysInMonth={simulation.session.daysInMonth}
          obligations={simulation.obligations}
          canPay={canPay}
        />
        <RecentScoreActivity
          entries={simulation.recentScoreEntries}
        />
        {canAdvance && (
          <section className="rounded-3xl border-2 border-[#091828] bg-white p-4 shadow-[4px_5px_0_#091828] dark:bg-[#111c31]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-black text-[#091828] dark:text-white">
                  Ready for the next day?
                </h2>
                <p className="mt-1 text-sm text-[#6B6375] dark:text-[#A0AEC0]">
                  Advance when you are ready to continue the simulation.
                </p>
              </div>
              <button
                type="button"
                disabled={advancing}
                onClick={() => void handleAdvance()}
                className="rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-5 py-2.5 text-sm font-black text-[#091828] shadow-[3px_3px_0_#091828] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {advancing
                  ? 'Advancing...'
                  : 'Advance day'}
              </button>
            </div>
            {advanceError && (
              <p
                role="alert"
                className="mt-3 text-sm font-semibold text-[#AC2A5D]"
              >
                {advanceError}
              </p>
            )}
          </section>
        )}
      </div>
    </main>
  )
}