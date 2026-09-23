import * as React from 'react'
import { updateSimulationStatus } from '@/features/simulation/api'
import { createIdempotencyKey } from '@/features/simulation/idempotency'
import type { SimulationDetail } from '@/features/simulation/types'

interface UsePauseControlsOptions {
  simulation: SimulationDetail
  onSimulationChange: (
    simulation: SimulationDetail,
  ) => void
}

export function usePauseControls({
  simulation,
  onSimulationChange,
}: UsePauseControlsOptions) {
  const [pausing, setPausing] = React.useState(false)

  const [resuming, setResuming] = React.useState(false)

  const [pauseError, setPauseError] = React.useState<string | null>(null)

  const [resumeError, setResumeError] = React.useState<string | null>(null)

  const pauseKeyRef = React.useRef<string | null>(null)

  const resumeKeyRef = React.useRef<string | null>(null)

  const pauseInFlightRef = React.useRef(false)

  const resumeInFlightRef = React.useRef(false)

  const pause = async () => {
    if (
      pauseInFlightRef.current ||
      simulation.session.status !== 'ACTIVE'
    ) {
      return
    }

    const idempotencyKey =
      pauseKeyRef.current ??
      createIdempotencyKey()

    pauseKeyRef.current = idempotencyKey
    pauseInFlightRef.current = true

    setPausing(true)
    setPauseError(null)

    try {
      const result =
        await updateSimulationStatus(
          simulation.session.id,
          'pause',
          idempotencyKey,
        )

      pauseKeyRef.current = null
      onSimulationChange(result)
    } catch {
      setPauseError(
        'The simulation could not be paused. Please try again.',
      )
    } finally {
      pauseInFlightRef.current = false
      setPausing(false)
    }
  }

  const resume = async () => {
    if (
      resumeInFlightRef.current ||
      simulation.session.status !== 'PAUSED'
    ) {
      return
    }

    const idempotencyKey =
      resumeKeyRef.current ??
      createIdempotencyKey()

    resumeKeyRef.current = idempotencyKey
    resumeInFlightRef.current = true

    setResuming(true)
    setResumeError(null)

    try {
      const result =
        await updateSimulationStatus(
          simulation.session.id,
          'resume',
          idempotencyKey,
        )

      resumeKeyRef.current = null
      onSimulationChange(result)
    } catch {
      setResumeError(
        'The simulation could not be resumed. Please try again.',
      )
    } finally {
      resumeInFlightRef.current = false
      setResuming(false)
    }
  }

  return {
    pause,
    resume,
    pausing,
    resuming,
    pauseError,
    resumeError,
  }
}