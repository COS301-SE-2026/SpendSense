import { useSimulationPolling } from '@/hooks/useSimulationPolling'
import { useRefetchAtDeadline } from '../hooks/useRefetchAtDeadline'
import type { SimulationDetail } from '../types'

interface SimulationBoardProps {
  simulation: SimulationDetail
  onSimulationChange: (simulation: SimulationDetail) => void
  onRefetch: () => Promise<unknown> | void
}

export function SimulationBoard({
  simulation,
  onRefetch,
}: SimulationBoardProps) {
  const shouldPoll = 
    simulation.session.pending.type === 'NONE' &&
    simulation.session.status === 'ACTIVE' &&
    simulation.session.timedMode

  useSimulationPolling(
    shouldPoll,
    onRefetch,
  )
  useRefetchAtDeadline(
    shouldPoll ? simulation.session.nextDayAt : null,
    onRefetch,
  )

  return(
    <main className="min-h-screen bg-[#F4FBF7] px-4 py-6 dark:bg-[#0b1326]">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-2xl font-black text-[#091828] dark:text-white">
          Simulated Month
        </h1>
        <p className="mt-2 text-[#6b6375] dark:text-[#a0aec0]">
          Day {simulation.session.currentDay} of{' '}
          {simulation.session.daysInMonth}
        </p>
      </div>
    </main>
  )
}