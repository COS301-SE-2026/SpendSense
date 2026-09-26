import { ReceiptText } from 'lucide-react'
import { formatCompactMoney } from '../../features/simulation/presentation'
import type { SimulationObligation } from '../../features/simulation/types'

interface ObligationRowProps {
  obligation: SimulationObligation
  currentDay: number
  payable: boolean
  onOpen?: (obligationId: string) => void
}

export function ObligationRow({
  obligation,
  currentDay,
  payable,
  onOpen,
}: ObligationRowProps) {
  const dueToday = obligation.dueDay === currentDay

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-[#D8E8E2] bg-white px-3 py-3 dark:border-[#2D3449] dark:bg-[#131B2E]">
      <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#EFEBFF] text-[#091828] dark:bg-[#282141] dark:text-[#C9B9FF]">
        <ReceiptText className="size-5" aria-hidden="true"/>
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-bold text-[#091828] dark:text-white">
          {obligation.name}
        </h3>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#6B6375] dark:text-[#A0AEC0]">
          <span>{formatCompactMoney(obligation.amountDue)}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
              dueToday
                ? 'bg-[#FFD9E6] text-[#AC2A5D]'
                : 'bg-[#E6F7F2] text-[#187A6C] dark:bg-[#183B39] dark:text-[#8FE0D2]'
            }`}
          >
            {dueToday ? 'Due today' : `Due day ${obligation.dueDay}`}
          </span>
        </p>
      </div>
      {payable && (
        <button
          type="button"
          onClick={() => onOpen?.(obligation.id)}
          aria-label={`Pay ${obligation.name}`}
          className="shrink-0 rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-4 py-2 text-sm font-black text-[#091828] shadow-[3px_3px_0_#091828] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-[#060E20]"
        >
          Pay
        </button>
      )}
    </li>
  )
}
