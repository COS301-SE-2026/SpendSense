import { Check, CircleAlert, Clock3 } from 'lucide-react'
import type { SimulationObligation } from '../types'

interface ObligationRowProps {
  obligation: SimulationObligation
  canPay: boolean
  onOpen?: (obligationId: string) => void
}

function formatMoney(value: string): string {
  return `R ${Number(value).toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function statusLabel(
  status: SimulationObligation['status'],
): string {
  switch (status) {
    case 'PAYABLE':
      return 'Due now'
    case 'PAID':
      return 'Paid'
    case 'MISSED':
      return 'Missed'
    case 'SCHEDULED':
    default:
      return 'Upcoming'
  }
}
function statusClasses(
  status: SimulationObligation['status'],
): string {
  switch (status) {
    case 'PAYABLE':
      return 'bg-[#FFD9E6] text-[#AC2A5D]'
    case 'PAID':
      return 'bg-[#E6F7F2] text-[#187A6C]'
    case 'MISSED':
      return 'bg-[#FFF1C8] text-[#7A5710]'
    case 'SCHEDULED':
    default:
      return 'bg-[#EFEBFF] text-[#55459A]'
  }
}

export function ObligationRow({
  obligation,
  canPay,
  onOpen,
}: ObligationRowProps) {
  const payable =
    obligation.status === 'PAYABLE' &&
    canPay

  return (
    <article className="flex flex-col gap-3 border-b border-[#D8E8E2] py-4 last:border-b-0 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-[#EFEBFF] text-[#091828]">
          {obligation.status === 'PAID' ? (
            <Check className="size-5" />
          ) : obligation.status === 'MISSED' ? (
            <CircleAlert className="size-5"/>
          ) : (
            <Clock3 className="size-5"/>
          )}
        </div>
        <div className="min-w-0">
          <h3 className="truncate font-bold text-[#091828] dark:text-white">
            {obligation.name}
          </h3>
          <p className="mt-1 text-sm text-[#6B6375] dark:text-[#A0AEC0]">
            {formatMoney(obligation.amountDue)}
            {' · '}
            Day {obligation.dueDay}
          </p>
          <p className="mt-1 text-xs text-[#6B6375] dark:text-[#A0AEC0]">
            {obligation.category}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${statusClasses(
            obligation.status,
          )}`}
        >
          {statusLabel(obligation.status)}
        </span>
        {payable && (
          <button
            type="button"
            onClick={() => onOpen?.(obligation.id)}
            className="rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-4 py-2 text-sm font-black text-[#091828] shadow-[3px_3px_0_#091828]"
          >
            Pay
          </button>
        )}
      </div>
    </article>
  )
}