import * as React from 'react'
import { updateSimulationStatus, getActiveSimulation } from '@/features/simulation/api'
import { createIdempotencyKey } from '@/features/simulation/idempotency'
import type { SimulationDetail } from '@/features/simulation/types'

interface UseExitControlsOptions {
  simulation: SimulationDetail
  onSimulationChange: (
    simulation: SimulationDetail,
  ) => void
  onLeave: () => void
  onDiscarded: () => void
}

export function useExitControls({
  simulation,
  onSimulationChange,
  onLeave,
  onDiscarded,
}: UseExitControlsOptions) {
  const [discarding, setDiscarding] = React.useState(false)

  const [discardError, setDiscardError] = React.useState<string | null>(null)

  const [saving, setSaving] = React.useState(false)

  const [saveError, setSaveError] = React.useState<string | null>(null)

  const discardKeyRef = React.useRef<string | null>(null)

  const savePauseKeyRef = React.useRef<string | null>(null)

  const discardInFlightRef = React.useRef(false)

  const saveInFlightRef = React.useRef(false)

  const saveAndExit = async () => {
    if (saveInFlightRef.current) {
      return
    }

    if (
      simulation.session.status === 'PAUSED'
    ) {
      onLeave()
      return
    }

    if (
      simulation.session.status !== 'ACTIVE'
    ) {
      onLeave()
      return
    }

    const idempotencyKey =
      savePauseKeyRef.current ??
      createIdempotencyKey()

    savePauseKeyRef.current =
      idempotencyKey

    saveInFlightRef.current = true

    setSaving(true)
    setSaveError(null)

    try {
      const result =
        await updateSimulationStatus(
          simulation.session.id,
          'pause',
          idempotencyKey,
        )

      savePauseKeyRef.current = null
      onSimulationChange(result)
      onLeave()
    } catch {
      setSaveError(
        'The simulation could not be saved for later. Please try again.',
      )
    } finally {
      saveInFlightRef.current = false
      setSaving(false)
    }
  }

  const discard = async () => {
    if (discardInFlightRef.current) {
      return
    }

    const idempotencyKey =
      discardKeyRef.current ??
      createIdempotencyKey()

    discardKeyRef.current = idempotencyKey

    discardInFlightRef.current = true
    setDiscarding(true)
    setDiscardError(null)

    try {
      await updateSimulationStatus(
        simulation.session.id,
        'discard',
        idempotencyKey,
      )

      discardKeyRef.current = null
      onDiscarded()
    } catch (caughtError) {
      const apiError = caughtError as {
        statusCode?: number
        error?: {
          code?: string
          message?: string
        }
      }

      if (
        apiError.statusCode === 409 &&
        apiError.error?.code ===
          'SIMULATION_DISCARD_NOT_ALLOWED'
      ) {
        try {
          await getActiveSimulation()

          discardKeyRef.current = null
          onDiscarded()
          return
        } catch {
          setDiscardError(
            'The latest simulation state could not be loaded. Please try again.',
          )
          return
        }
      }

      setDiscardError(
        'The simulation could not be discarded. Please try again.',
      )
    } finally {
      discardInFlightRef.current = false
      setDiscarding(false)
    }
  }

  return {
    saveAndExit,
    discard,
    saving,
    discarding,
    saveError,
    discardError,
  }
}