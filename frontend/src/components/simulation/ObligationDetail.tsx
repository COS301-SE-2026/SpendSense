import {
  PiggyBank,
  WalletCards,
  CalendarDays,
  CircleDollarSign,
  ArrowLeft,
} from 'lucide-react'
import { SimulationPageShell } from './SimulationPageShell'
import { formatSimulationMoney } from '@/features/simulation/presentation'
import type { SimulationDetail, SimulationObligation } from '@/features/simulation/types'

interface ObligationDetailPageProps {
  simulation: SimulationDetail
  obligation: SimulationObligation
  onBack: () => void
  onPay: () => void
  paying?: boolean
  paymentError?: string | null
  insufficientFunds?: {
    currentBalance: string
    savingsBalance: string
    remainingAmount: string
  } | null
}

export function ObligationDetailPage({
  simulation,
  obligation,
  onBack,
  onPay,
  paying = false,
  paymentError = null,
  insufficientFunds = null,
}: ObligationDetailPageProps) {
  const canPay =
    simulation.allowedActions.includes('PAY_OBLIGATION') &&
    obligation.status === 'PAYABLE'

  return (
    <SimulationPageShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <button
          type="button"
          onClick={onBack}
          className="flex w-fit items-center gap-2 rounded-full border-2 border-[#091828] bg-white px-4 py-2 text-sm font-bold text-[#091828] shadow-[3px_3px_0_#091828]"
        >
          <ArrowLeft className="size-4" />
          Back
        </button>
        <section className="rounded-3xl border-2 border-[#091828] bg-white p-5 shadow-[4px_5px_0_#091828] dark:bg-[#111c31]">
          <p className="text-xs font-black uppercase tracking-wide text-[#AC2A5D]">
            Obligation
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-black text-[#091828] dark:text-white">
                {obligation.name}
              </h1>
              <p className="mt-1 text-sm font-semibold text-[#6B6375] dark:text-[#A0AEC0]">
                {obligation.category}
              </p>
            </div>
            <span className="w-fit rounded-full bg-[#FFF1C8] px-3 py-1.5 text-xs font-black text-[#091828]">
              {obligation.status}
            </span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#FFD9E6] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#6B6375]">
                <CircleDollarSign className="size-4"/>
                Amount due
              </div>
              <p className="mt-1 text-xl font-black text-[#091828]">
                {formatSimulationMoney(
                  obligation.amountDue,
                )}
              </p>
            </div>
            <div className="rounded-2xl bg-[#FFF1C8] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#6B6375]">
                <CalendarDays className="size-4"/>
                Due day
              </div>
              <p className="mt-1 text-xl font-black text-[#091828]">
                Day {obligation.dueDay}
              </p>
            </div>
          </div>
        </section>
        <section className="rounded-3xl border-2 border-[#091828] bg-white p-5 shadow-[4px_5px_0_#091828] dark:bg-[#111c31]">
          <p className="text-xs font-black uppercase tracking-wide text-[#AC2A5D]">
            Available balances
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-[#E6F7F2] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#6B6375]">
                <WalletCards className="size-4"/>
                Current
              </div>
              <p className="mt-1 text-lg font-black text-[#091828]">
                {formatSimulationMoney(
                  simulation.session.currentBalance,
                )}
              </p>
            </div>
            <div className="rounded-2xl bg-[#EFEBFF] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#6B6375]">
                <PiggyBank className="size-4"/>
                Savings
              </div>
              <p className="mt-1 text-lg font-black text-[#091828]">
                {formatSimulationMoney(
                  simulation.session.savingsBalance,
                )}
              </p>
            </div>
          </div>
        </section>
        <section className="rounded-3xl border-2 border-[#091828] bg-white p-5 shadow-[4px_5px_0_#091828] dark:bg-[#111c31]">
          <h2 className="text-lg font-black text-[#091828] dark:text-white">
            How payment works
          </h2>
          <p className="mt-2 text-sm leading-6 text-[#6B6375] dark:text-[#A0AEC0]">
            This fictional payment is always made in full. The simulation uses your Current balance first, and then Savings if more funds are needed.
          </p>
          {canPay ? (
            <>
              <button
                type="button"
                onClick={onPay}
                disabled={paying}
                className="mt-5 w-full rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-5 py-3 text-sm font-black text-[#091828] shadow-[3px_3px_0_#091828] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {paying
                  ? 'Processing payment...'
                  : 'Pay full amount'}
              </button>
              {paymentError && (
                <p
                  role="alert"
                  className="mt-3 rounded-2xl bg-[#FFD9E1] px-4 py-3 text-sm font-semibold text-[#AC2A5D]"
                >
                  {paymentError}
                </p>
              )}
              {insufficientFunds && (
                <div className="mt-3 rounded-2xl bg-[#FFF1C8] p-4">
                  <p className="text-sm font-black text-[#091828]">
                    Payment shortfall
                  </p>
                  <div className="mt-3 grid gap-2 text-sm text-[#6B6375]">
                    <p>
                      Current available:{' '}
                      <strong className="text-[#091828]">
                        {formatSimulationMoney(
                          insufficientFunds.currentBalance,
                        )}
                      </strong>
                    </p>
                    <p>
                      Savings available:{' '}
                      <strong className="text-[#091828]">
                        {formatSimulationMoney(
                          insufficientFunds.savingsBalance,
                        )}
                      </strong>
                    </p>
                    <p>
                      Still needed:{' '}
                      <strong className="text-[#091828]">
                        {formatSimulationMoney(
                          insufficientFunds.remainingAmount,
                        )}
                      </strong>
                    </p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <p className="mt-5 rounded-2xl bg-[#F4FBF7] px-4 py-3 text-sm font-semibold text-[#6B6375] dark:bg-[#1C263C] dark:text-[#A0AEC0]">
              This obligation cannot be paid right now.
            </p>
          )}
        </section>
      </div>
    </SimulationPageShell>
  )
}