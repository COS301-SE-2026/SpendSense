import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LoaderCircle, AlertTriangle } from 'lucide-react'
import { useSimulation } from '@/hooks/useSimulation'
import { ObligationDetailPage } from '@/components/simulation/ObligationDetail'

export default function SimulationObligationDetailPage() {
  const {
      sessionId,
      obligationId,
  } = useParams<{
      sessionId: string
      obligationId: string
  }>()

  const navigate = useNavigate()

  const {
    data: simulation,
    loading,
    error,
  } = useSimulation(sessionId)

  if (!simulation && loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F4FBF7] dark:bg-[#0b1326]">
        <div className="flex items-center gap-3 text-[#091828] dark:text-white">
          <LoaderCircle className="size-5 animate-spin"/>
          <span className="font-semibold">
            Loading obligation...
          </span>
        </div>
      </main>
    )
  }

  const obligation =
    simulation?.obligations.find(
      (item) => item.id === obligationId,
    )

  if (
    !sessionId ||
    !obligationId ||
    !obligation ||
    !simulation
  ) {
    return (
      <main className="min-h-screen bg-[#F4FBF7] px-5 py-8 dark:bg-[#0b1326]">
        <div className="mx-auto max-w-md rounded-3xl border-2 border-[#AC2A5D] bg-[#FFD9E1] p-5">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-[#AC2A5D]"/>
            <div>
              <h1 className="font-bold text-[#091828]">
                Could not load obligation
              </h1>
              <p className="mt-2 text-sm text-[#6B6375]">
                {error ??
                  'This obligation could not be found.'}
              </p>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mt-4 rounded-full border-2 border-[#091828] bg-white px-4 py-2 text-sm font-bold"
              >
                Go back
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <ObligationDetailPage
      simulation={simulation}
      obligation={obligation}
      onBack={() => navigate(-1)}
      onPay={() => {
        console.info(
          'Pay obligation:',
          obligation.id,
        )
      }}
    />
  )
}