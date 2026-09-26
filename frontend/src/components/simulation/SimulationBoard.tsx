import * as React from 'react'
import { useSimulationPolling } from '@/hooks/useSimulationPolling'
import { advanceSimulation, continueSimulation } from '../../features/simulation/api'
import { createIdempotencyKey } from '../../features/simulation/idempotency'
import { useRefetchAtDeadline } from '../../features/simulation/hooks/useRefetchAtDeadline'
import { MonthAgenda } from './MonthAgenda'
import { RecentScoreActivity } from './RecentScoreActivity'
import { SimulationHeader } from './SimulationHeader'
import { UpcomingObligations } from './UpcomingObligations'
import { NewObligationPopup } from './NewObligationPopup'
import { PauseOverlay } from './PauseOverlay'
import { usePauseControls } from '@/hooks/usePauseControls'
import { ExitConfirmation } from './ExitConfirmation'
import { useExitControls } from '@/hooks/useExitControls'
import type { SimulationDetail } from '../../features/simulation/types'

interface SimulationBoardProps {
  simulation: SimulationDetail
  onSimulationChange: (
    simulation: SimulationDetail,
  ) => void
  onRefetch: () => Promise<unknown> | void
  onLeave: () => void
  onDiscarded: () => void
  onOpenObligation?:(obligationId:string)=>void
}

export function SimulationBoard({
  simulation,
  onSimulationChange,
  onRefetch,
  onLeave,
  onDiscarded,
  onOpenObligation,
}: SimulationBoardProps) {
  const [advancing, setAdvancing] = React.useState(false)
  const [advanceError, setAdvanceError] =
    React.useState<string | null>(null)

  const advanceKeyRef = React.useRef<string | null>(null)

  const shouldPoll =
    simulation.session.pending.type === 'NONE' &&
    simulation.session.status === 'ACTIVE' &&
    simulation.session.timedMode

  const canAdvance =
    !simulation.session.timedMode &&
    simulation.allowedActions.includes('ADVANCE_DAY')

  const advancingRef = React.useRef(false)

  const newObligation =
    simulation.session.status === 'ACTIVE' &&
    simulation.session.pending.type === 'NEW_OBLIGATION'
      ? simulation.newObligation
      : null

  const [acknowledging, setAcknowledging] = React.useState(false)
  const [acknowledgeError, setAcknowledgeError] =
    React.useState<string | null>(null)
  const acknowledgeKeyRef = React.useRef<string | null>(null)
  const acknowledgingRef = React.useRef(false)
  
  const [showExit, setShowExit] = React.useState(false)

  const [confirmDiscard, setConfirmDiscard] = React.useState(false)

  const {
    pause,
    resume,
    pausing,
    resuming,
    pauseError,
    resumeError,
  } = usePauseControls({
    simulation,
    onSimulationChange,
  })

  const {
    saveAndExit,
    discard,
    saving,
    discarding,
    saveError,
    discardError,
  } = useExitControls({
  simulation,
  onSimulationChange,
  onLeave,
  onDiscarded,
})

  useSimulationPolling(
    shouldPoll,
    onRefetch,
  )

  useRefetchAtDeadline(
    shouldPoll ? simulation.session.nextDayAt : null,
    onRefetch,
  )

  const handleAcknowledgeNewObligation = async () => {
    if (
      !simulation.allowedActions.includes('ACKNOWLEDGE_NEW_OBLIGATION') ||
      acknowledgingRef.current
    ) {
      return
    }

    acknowledgingRef.current = true
    const idempotencyKey =
      acknowledgeKeyRef.current ?? createIdempotencyKey()
    acknowledgeKeyRef.current = idempotencyKey

    setAcknowledging(true)
    setAcknowledgeError(null)

    try {
      const updatedSimulation = await continueSimulation(
        simulation.session.id,
        idempotencyKey,
      )

      acknowledgeKeyRef.current = null
      onSimulationChange(updatedSimulation)
    } catch {
      setAcknowledgeError(
        'The new obligation could not be acknowledged. Please try again.',
      )
    } finally {
      acknowledgingRef.current = false
      setAcknowledging(false)
    }
  }

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
    <main className="min-h-screen bg-[#F4FBF7] px-5 pb-12 pt-6 dark:bg-[#0b1326]">
      <div className="mx-auto flex w-full max-w-md flex-col gap-4">
        <SimulationHeader
          simulation={simulation}
          onPause={() => void pause()}
          onExit={() => {
            setConfirmDiscard(false)
            setShowExit(true)
          }}
          pausing={pausing}
          canAdvance={canAdvance}
          advancing={advancing}
          onAdvance={() => void handleAdvance()}
        />
        {advanceError && (
          <p
            role="alert"
            className="rounded-2xl bg-[#FFD9E1] px-4 py-3 text-sm font-semibold text-[#AC2A5D]"
          >
            {advanceError}
          </p>
        )}
        <MonthAgenda
          currentDay={simulation.session.currentDay}
          daysInMonth={simulation.session.daysInMonth}
          obligations={simulation.obligations}
        />
        <RecentScoreActivity
          entries={simulation.recentScoreEntries}
        />
        <UpcomingObligations
          simulation={simulation}
          onOpenObligation={onOpenObligation}
        />
        {newObligation && (
          <NewObligationPopup
            obligation={newObligation}
            acknowledging={acknowledging}
            acknowledgeError={acknowledgeError}
            onAcknowledge={() => void handleAcknowledgeNewObligation()}
            pausing={pausing}
            onPause={() => void pause()}
          />
        )}
        {simulation.session.status === 'PAUSED' && (
          <PauseOverlay
            resuming={resuming}
            resumeError={resumeError}
            onResume={() => void resume()}
            onExit={() => {
              setConfirmDiscard(false)
              setShowExit(true)
            }}
          />
        )}
        {pauseError && (
          <p
            role="alert"
            className="rounded-2xl bg-[#FFD9E1] px-4 py-3 text-sm font-semibold text-[#AC2A5D]"
          >
            {pauseError}
          </p>
        )}
        {showExit && (
          <ExitConfirmation
            saving={saving}
            discarding={discarding}
            discardError={
              discardError ?? saveError
            }
            confirmDiscard={confirmDiscard}
            onKeepPlaying={() => {
              setShowExit(false)
              setConfirmDiscard(false)
            }}
            onSaveAndExit={() => {
              void saveAndExit()
            }}
            onRequestDiscard={() => {
              setConfirmDiscard(true)
            }}
            onCancelDiscard={() => {
              setConfirmDiscard(false)
            }}
            onConfirmDiscard={() => {
              void discard()
            }}
          />
        )}
      </div>
    </main>
  )
}