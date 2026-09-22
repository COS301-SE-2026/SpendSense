import { useSimulationPolling } from '@/hooks/useSimulationPolling'
import { useRefetchAtDeadline } from '../hooks/useRefetchAtDeadline'
import { SimulationHeader } from './SimulationHeader'
import { MonthAgenda } from './MonthAgenda'
import { RecentScoreActivity } from './RecentScoreActivity'
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
  const canPay = simulation.allowedActions.includes('PAY_OBLIGATION')

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
        <SimulationHeader simulation={simulation}/>
        <MonthAgenda
          currentDay={simulation.session.currentDay}
          daysInMonth={simulation.session.daysInMonth}
          obligations={simulation.obligations}
          CanPay={canPay}
        />
        <RecentScoreActivity
          entries={simulation.recentScoreEntries}
        />
      </div>
    </main>
  )
}