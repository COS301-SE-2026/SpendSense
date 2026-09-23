import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LoaderCircle, AlertTriangle } from 'lucide-react'
import { useSimulation } from '@/hooks/useSimulation'
import { ObligationDetailPage } from '@/components/simulation/ObligationDetail'
import { continueSimulation, paySimulationObligation } from '@/features/simulation/api'
import { createIdempotencyKey } from '@/features/simulation/idempotency'
import { PaymentResult } from '@/components/simulation/PaymentResult'
import { ResultAcknowledgement } from '@/components/simulation/ResultAcknowledgement'
import { routeForSimulationState } from '@/features/simulation/routing'
import type { PaymentSimulationResponse } from '@/features/simulation/types'

interface InsufficientFundsDetails {
  currentBalance: string
  savingsBalance: string
  remainingAmount: string
}

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
    data: 
    simulation,
    loading,
    error,
    setSimulation,
    refetch,
  } = useSimulation(sessionId)

  const [paying, setPaying] = React.useState(false)

  const [paymentError, setPaymentError] = React.useState<string | null>(null)

  const paymentKeyRef = React.useRef<string | null>(null)

  const paymentInFlightRef = React.useRef(false)

  const [paymentResult, setPaymentResult] =
    React.useState<PaymentSimulationResponse | null>(
      null,
    )

  const [continuing, setContinuing] = React.useState(false)

  const [continueError, setContinueError] = React.useState<string | null>(null)

  const continueKeyRef = React.useRef<string | null>(null)

  const continueInFlightRef = React.useRef(false)

  const [insufficientFunds, setInsufficientFunds] = 
    React.useState<InsufficientFundsDetails | null>(
      null,
    )

  const handleStaleSimulationState = async () => {
    const refreshed = await refetch()

    if (!refreshed) {
      setPaymentError(
        'The latest state could not be loaded after the simulation state changed. Please try again.',
      )

      return
    }

    setSimulation(refreshed)
    const route = routeForSimulationState(refreshed)

    console.info(
      'Simulation should route to: ',
      route,
    )
  }

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

  const handlePay = async () => {
    if (
      !sessionId ||
      !obligation ||
      paymentInFlightRef.current
    ) {
      return
    }

    const canPay =
      simulation.allowedActions.includes(
        'PAY_OBLIGATION',
      ) &&
      obligation.status === 'PAYABLE'

    if (!canPay) {
      return
    }

    const idempotencyKey =
      paymentKeyRef.current ??
      createIdempotencyKey()

    paymentKeyRef.current = idempotencyKey
    paymentInFlightRef.current = true

    setPaying(true)
    setPaymentError(null)
    setInsufficientFunds(null)

    try {
      const result =
        await paySimulationObligation(
          sessionId,
          obligation.id,
          idempotencyKey,
        )

      paymentKeyRef.current = null

      setSimulation(result)
      setPaymentResult(result)
    } catch (caughtError) {
      const apiError = caughtError as {
        statusCode?: number
        error?: {
          code?: string
          message?: string
          currentBalance?: string
          savingsBalance?: string
          remainingAmount?: string
        }
        message?: string
      }

      if (
        apiError.statusCode === 409 &&
        apiError.error?.code === 'INSUFFICIENT_SIMULATION_FUNDS'
      ) {
        setPaymentError(
          apiError.error.message ??
            'There are not enough simulated funds to pay this obligation.',
        )

        if (
          apiError.error.currentBalance &&
          apiError.error.savingsBalance &&
          apiError.error.remainingAmount
        ) {
          setInsufficientFunds({
            currentBalance:
              apiError.error.currentBalance,
            savingsBalance:
              apiError.error.savingsBalance,
            remainingAmount:
              apiError.error.remainingAmount,
          })
        }
      } else if (apiError.statusCode === 409) {
        await handleStaleSimulationState()
      } else {
        setPaymentError(
          'The payment could not be confirmed. Please try again.',
        )
      }
    } finally {
      paymentInFlightRef.current = false
      setPaying(false)
    }
  }

  const handleContinue = async () => {
    if (
      !sessionId ||
      continueInFlightRef.current
    ) {
      return
    }

    const idempotencyKey = continueKeyRef.current ?? createIdempotencyKey()

    continueKeyRef.current = idempotencyKey
    continueInFlightRef.current = true
    setContinuing(true)
    setContinueError(null)

    try {
      const result =
        await continueSimulation(
          sessionId,
          idempotencyKey,
        )

      continueKeyRef.current = null

      setSimulation(result)
      setPaymentResult(null)
      navigate(-1) // temp nav for now (until all routes connected)
    } catch {
      setContinueError(
        'Could not return to the month. Please try again.',
      )
    } finally {
      continueInFlightRef.current = false
      setContinuing(false)
    }
  }

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

  if (paymentResult) {
    return (
      <PaymentResult
        result={paymentResult}
        continuing={continuing}
        continueError={continueError}
        onContinue={() => void handleContinue()}
      />
    )
  }

  if (
    simulation.session.pending.type === 'PAYMENT_RESULT'
  ) {
    return (
      <ResultAcknowledgement
        detail={simulation}
        kind='payment'
        onContinue={() => void handleContinue()}
      />
    )
  }

  return (
    <ObligationDetailPage
      simulation={simulation}
      obligation={obligation}
      onBack={() => navigate(-1)}
      onPay={() => void handlePay()}
      paying={paying}
      paymentError={paymentError}
      insufficientFunds={insufficientFunds}
    />
  )
}