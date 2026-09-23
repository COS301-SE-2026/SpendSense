import {
    PiggyBank,
    WalletCards,
    CircleCheck,
    Trophy,
    ArrowLeft,
} from 'lucide-react'
import { SimulationPageShell } from './SimulationPageShell'
import { formatSimulationMoney } from '@/features/simulation/presentation'
import type { PaymentSimulationResponse } from '@/features/simulation/types'

interface PaymentResultProps {
  result: PaymentSimulationResponse
  continuing?: boolean
  continueError?: string | null
  onContinue: () => void
}

export function PaymentResult({
  result,
  continuing = false,
  continueError = null,
  onContinue,
}: PaymentResultProps) {
  const obligation = 
    result.obligations.find(
      (item) => item.id === result.payment.obligationId,
    )

    return (
      <SimulationPageShell>
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <section className="rounded-3xl border-2 border-[#091828] bg-white p-6 shadow-[4px_5px_0_#091828] dark:bg-[#111c31]">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-[#E6F7F2] p-3">
              <CircleCheck className="size-6 text-[#091828]"/>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide text-[#AC2A5D]">
                Payment complete
              </p>
              <h1 className="text-2xl font-black text-[#091828] dark:text-white">
                Payment recorded
              </h1>
            </div>
          </div>
          {obligation && (
            <p className="mt-4 text-sm font-semibold text-[#6B6375] dark:text-[#A0AEC0]">
              {obligation.name} has been paid in full.
            </p>
          )}
        </section>
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-3xl border-2 border-[#091828] bg-[#E6F7F2] p-5 shadow-[4px_5px_0_#091828]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#6B6375]">
              <WalletCards className="size-4"/>
              Current used
            </div>
            <p className="mt-2 text-xl font-black text-[#091828]">
              {formatSimulationMoney(
                result.payment.currentUsed,
              )}
            </p>
          </div>
          <div className="rounded-3xl border-2 border-[#091828] bg-[#EFEBFF] p-5 shadow-[4px_5px_0_#091828]">
            <div className="flex items-center gap-2 text-xs font-bold text-[#6B6375]">
              <PiggyBank className="size-4"/>
              Savings used
            </div>
            <p className="mt-2 text-xl font-black text-[#091828]">
              {formatSimulationMoney(
                result.payment.savingsUsed,
              )}
            </p>
          </div>
        </section>
        <section className="rounded-3xl border-2 border-[#091828] bg-white p-5 shadow-[4px_5px_0_#091828] dark:bg-[#111c31]">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-[#AC2A5D]"/>
            <h2 className="text-lg font-black text-[#091828] dark:text-white">
              Score change
            </h2>
          </div>
          <p className="mt-3 text-2xl font-black text-[#091828] dark:text-white">
            {Number(result.payment.pointsAwarded) >= 0
              ? '+'
              : ''}
            {result.payment.pointsAwarded}
          </p>
          {continueError && (
            <p
              role="alert"
              className="mt-4 rounded-2xl bg-[#FFD9E1] px-4 py-3 text-sm font-semibold text-[#AC2A5D]"
            >
              {continueError}
            </p>
          )}
          <button
            type="button"
            onClick={onContinue}
            disabled={continuing}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-5 py-3 text-sm font-black text-[#091828] shadow-[3px_3px_0_#091828] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowLeft className="size-4"/>
            {continuing
              ? 'Returning to month...'
              : 'Return to month'}
          </button>
        </section>
      </div>
    </SimulationPageShell>
    )
}