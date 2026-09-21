import * as React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, LoaderCircle } from 'lucide-react'
import { SimulationBoard } from '@/features/simulation/components/SimulationBoard'
import { routeForSimulationState } from '@/features/simulation/routing'
import { useSimulation } from '@/hooks/useSimulation'

export default function SimulationBoardPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const navigate = useNavigate()
  const {
    data: 
    simulation,
    loading,
    error,
    refetch,
    setSimulation,
  } = useSimulation(sessionId)

  React.useEffect(() => {
    if (!simulation) {
      return
    }

    const route = routeForSimulationState(simulation)
    if (route !== 'board') {
      console.info(
        'Simulation should route to:',
        route,
      )
      // temp until the remaining simulation routes are connected
    }
  }, [simulation])

  if (!sessionId) {
    return (
      <main className="min-h-screen bg-[#F4FBF7] px-5 py-8 dark:bg-[#0b1326]">
        <div className="mx-auto max-w-md rounded-3xl border-2 border-[#AC2A5D] bg-[#FFD9E1] p-5 dark:border-[#ffb4ab] dark:bg-[#93000a]/30">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#AC2A5D]" />
            <div>
              <h1 className="font-bold text-[#091828] dark:text-white">
                Could not load simulation
              </h1>
              <p className="mt-2 text-sm text-[#6b6375] dark:text-[#a0aec0]">
                Simulation could not be found.
              </p>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="mt-4 rounded-full border-2 border-[#091828] bg-white px-4 py-2 text-sm font-bold"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (loading && !simulation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4FBF7] dark:bg-[#0b1326]">
        <div className="flex items-center gap-3 text-[#091828] dark:text-white">
          <LoaderCircle className="size-5 animate-spin"/>
          <span className="font-semibold">
            Loading simulated month...
          </span>
        </div>
      </main>
    )
  }

  if (!simulation) {
    return (
      <main className="min-h-screen bg-[#F4FBF7] px-5 py-8 dark:bg-[#0b1326]">
        <div className="mx-auto max-w-md rounded-3xl border-2 border-[#AC2A5D] bg-[#FFD9E1] p-5 dark:border-[#ffb4ab] dark:bg-[#93000a]/30">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#AC2A5D]"/>
            <div>
              <h1 className="font-bold text-[#091828] dark:text-white">
                Could not load simulation
              </h1>
              <p className="mt-2 text-sm text-[#6b6375] dark:text-[#a0aec0]">
                {error ?? 'The simulation could not load. Please try again.'}
              </p>
              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-4 py-2 text-sm font-bold shadow-[3px_3px_0_#091828]"
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="rounded-full border-2 border-[#091828] bg-white px-4 py-2 text-sm font-bold"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <>
      {error && (
        <div
          role="alert"
          className="bg-[#FFF1C8] px-4 py-3 text-center text-sm font-semibold text-[#091828]"
        >
          The simulation could not be refreshed. Showing the last confirmed state.
        </div>
      )}

      <SimulationBoard
        simulation={simulation}
        onSimulationChange={setSimulation}
        onRefetch={refetch}
      />
    </>
  )
}