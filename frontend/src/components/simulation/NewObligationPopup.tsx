import { Pause, ReceiptText } from 'lucide-react'
import { formatCompactMoney } from '../../features/simulation/presentation'
import type {
  SimulationNewObligation,
  SimulationObligationImportance,
} from '../../features/simulation/types'

interface NewObligationPopupProps {
  obligation: SimulationNewObligation
  acknowledging?: boolean
  acknowledgeError?: string | null
  onAcknowledge: () => void
  pausing?: boolean
  onPause?: () => void
}

const importanceLabels: Record<SimulationObligationImportance, string> = {
  CRITICAL: 'Critical priority',
  HIGH: 'High priority',
  STANDARD: 'Standard priority',
  LOW: 'Low priority',
}

export function NewObligationPopup({
  obligation,
  acknowledging = false,
  acknowledgeError = null,
  onAcknowledge,
  pausing = false,
  onPause,
}: NewObligationPopupProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091828]/55 px-5 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-obligation-title"
        aria-describedby="new-obligation-note"
        className="w-full max-w-md rounded-3xl border-2 border-[#091828] bg-white p-6 shadow-[5px_6px_0_#091828] dark:bg-[#111c31]"
      >
        <p className="text-center text-xs font-black uppercase tracking-wide text-[#087D6A] dark:text-[#8FE0D2]">
          New obligation · added to your month
        </p>
        <h1
          id="new-obligation-title"
          className="mt-1 text-center text-2xl font-black text-[#091828] dark:text-white"
        >
          A new bill has arrived
        </h1>

        <div className="mt-5 flex items-center gap-3 rounded-2xl border-2 border-[#091828] bg-[#E8F7F2] p-3 shadow-[3px_3px_0_#091828] dark:bg-[#183B39]">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white text-[#091828] dark:bg-[#131B2E] dark:text-white">
            <ReceiptText className="size-5" aria-hidden="true"/>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-black text-[#091828] dark:text-white">
              {obligation.name}
            </p>
            <p className="text-xs text-[#6B6375] dark:text-[#A0AEC0]">
              Due day {obligation.dueDay} · {importanceLabels[obligation.importance] ?? obligation.importance}
            </p>
          </div>
          <p className="shrink-0 font-black text-[#091828] dark:text-white">
            {formatCompactMoney(obligation.amountDue)}
          </p>
        </div>

        <p
          id="new-obligation-note"
          className="mt-4 rounded-2xl bg-[#F4F5F8] px-4 py-3 text-sm leading-6 text-[#6B6375] dark:bg-[#1C263C] dark:text-[#A0AEC0]"
        >
          <strong className="text-[#091828] dark:text-white">No payment is taken now.</strong>{' '}
          It joins your obligations and can be paid in full any time up to day {obligation.dueDay}. If it is still unpaid after that day, it is marked missed.
        </p>

        <button
          type="button"
          onClick={onAcknowledge}
          disabled={acknowledging}
          className="mt-5 w-full rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-5 py-3 text-sm font-black text-[#091828] shadow-[3px_3px_0_#091828] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
        >
          {acknowledging ? 'Continuing...' : 'Acknowledge and continue'}
        </button>
        {onPause && (
          <button
            type="button"
            onClick={onPause}
            disabled={pausing || acknowledging}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-white px-5 py-3 text-sm font-black text-[#091828] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#1C263C] dark:text-white"
          >
            <Pause className="size-4" aria-hidden="true"/>
            {pausing ? 'Pausing...' : 'Pause month'}
          </button>
        )}
        {acknowledgeError && (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-[#FFD9E1] px-4 py-3 text-sm font-semibold text-[#AC2A5D]"
          >
            {acknowledgeError}
          </p>
        )}
      </section>
    </div>
  )
}
