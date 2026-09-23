import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  LoaderCircle,
  RotateCcw,
} from 'lucide-react'
import { getActiveSimulation, getSimulation } from '@/features/simulation/api'
import { pathForSimulationState } from '@/features/simulation/routing'

type RecoveryState =
  | 'loading'
  | 'error'
  | 'not-found'
  | 'expired'

export default function SimulationRecoveryPage() {
  const navigate = useNavigate()

  const [state, setState] = React.useState<RecoveryState>('loading')

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  const recover = React.useCallback(async () => {
    setState('loading')
    setErrorMessage(null)

    try {
      const active =
        await getActiveSimulation()

      if (!active.active) {
        setState('not-found')
        return
      }

      try {
        const detail =
          await getSimulation(active.active.id)

        if (
          detail.session.status === 'EXPIRED'
        ) {
          setState('expired')
          return
        }

        navigate(
          pathForSimulationState(detail),
          {
            replace: true,
          },
        )
      } catch (caughtError) {
        const apiError = caughtError as {
          statusCode?: number
          error?: {
            code?: string
            message?: string
          }
          message?: string
        }

        if (
          apiError.statusCode === 404 ||
          apiError.error?.code ===
            'SIMULATION_NOT_FOUND'
        ) {
          setState('not-found')
          return
        }

        if (
          apiError.statusCode === 410 ||
          apiError.error?.code ===
            'SIMULATION_EXPIRED'
        ) {
          setState('expired')
          return
        }

        setErrorMessage(
          'Your saved simulation could not be restored. Please try again.',
        )
        setState('error')
      }
    } catch {
      setErrorMessage(
        'Your saved simulation could not be checked. Please try again.',
      )
      setState('error')
    }
  }, [navigate])

  React.useEffect(() => {
    void Promise.resolve().then(() => {
      void recover()
    })
  }, [recover])

  if (state === 'loading') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4FBF7] px-5 dark:bg-[#0b1326]">
        <section className="w-full max-w-md rounded-3xl border-2 border-[#091828] bg-white p-6 text-center shadow-[5px_6px_0_#091828] dark:bg-[#111c31]">
          <LoaderCircle className="mx-auto size-8 animate-spin text-[#AC2A5D]"/>
          <h1 className="mt-4 text-2xl font-black text-[#091828] dark:text-white">
            Restoring your month
          </h1>
          <p className="mt-2 text-sm text-[#6B6375] dark:text-[#A0AEC0]">
            Loading your latest fictional simulation state...
          </p>
        </section>
      </main>
    )
  }

  if (state === 'not-found') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4FBF7] px-5 dark:bg-[#0b1326]">
        <section className="w-full max-w-md rounded-3xl border-2 border-[#091828] bg-white p-6 shadow-[5px_6px_0_#091828] dark:bg-[#111c31]">
          <h1 className="text-2xl font-black text-[#091828] dark:text-white">
            No saved month found
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#6B6375] dark:text-[#A0AEC0]">
            There is no active simulated month available to resume.
          </p>
          <button
            type="button"
            onClick={() => navigate('/simulation')}
            className="mt-6 w-full rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-5 py-3 text-sm font-black text-[#091828] shadow-[3px_3px_0_#091828]"
          >
            Start a new month
          </button>
        </section>
      </main>
    )
  }

  if (state === 'expired') {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4FBF7] px-5 dark:bg-[#0b1326]">
        <section className="w-full max-w-md rounded-3xl border-2 border-[#091828] bg-white p-6 shadow-[5px_6px_0_#091828] dark:bg-[#111c31]">
          <AlertTriangle className="size-7 text-[#AC2A5D]"/>
          <h1 className="mt-4 text-2xl font-black text-[#091828] dark:text-white">
            This month has expired
          </h1>
          <p className="mt-3 text-sm leading-6 text-[#6B6375] dark:text-[#A0AEC0]">
            This saved fictional month can no longer be resumed. You can start a new one.
          </p>
          <button
            type="button"
            onClick={() => navigate('/simulation')}
            className="mt-6 w-full rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-5 py-3 text-sm font-black text-[#091828] shadow-[3px_3px_0_#091828]"
          >
            Start a new month
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4FBF7] px-5 dark:bg-[#0b1326]">
      <section className="w-full max-w-md rounded-3xl border-2 border-[#AC2A5D] bg-white p-6 shadow-[5px_6px_0_#091828] dark:bg-[#111c31]">
        <AlertTriangle className="size-7 text-[#AC2A5D]"/>
        <h1 className="mt-4 text-2xl font-black text-[#091828] dark:text-white">
          Could not restore your month
        </h1>
        <p
          role="alert"
          className="mt-3 text-sm leading-6 text-[#6B6375] dark:text-[#A0AEC0]"
        >
          {errorMessage ??
            'The simulation could not be restored.'}
        </p>
        <button
          type="button"
          onClick={() => void recover()}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-5 py-3 text-sm font-black text-[#091828] shadow-[3px_3px_0_#091828]"
        >
          <RotateCcw className="size-4"/>
          Retry
        </button>
        <button
          type="button"
          onClick={() =>
            navigate('/domains/dashboard')
          }
          className="mt-3 w-full rounded-full border-2 border-[#091828] bg-white px-5 py-3 text-sm font-black text-[#091828] dark:bg-[#1C263C] dark:text-white"
        >
          Return to dashboard
        </button>
      </section>
    </main>
  )
}