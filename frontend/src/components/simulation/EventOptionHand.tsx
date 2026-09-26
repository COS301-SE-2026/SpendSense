import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Ban, CalendarClock, ChevronLeft, ChevronRight, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { formatCompactMoney } from '../../features/simulation/presentation'
import type { SimulationEventOption } from '../../features/simulation/types'

interface EventOptionHandProps {
  options: SimulationEventOption[]
  selectedOptionId: string | null
  onSelect: (optionId: string) => void
  disabled?: boolean
  hideNavigation?: boolean
}

const cardColours = [
  'bg-[#FFE09A] dark:bg-[#4A3C17]',
  'bg-[#BDE7DC] dark:bg-[#1D4A43]',
  'bg-[#D8CCFF] dark:bg-[#352B5C]',
  'bg-[#FFD1E0] dark:bg-[#4E2438]',
]

function shuffleOptions(options: SimulationEventOption[]): SimulationEventOption[] {
  const shuffled = [...options]
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[swapIndex]
    shuffled[swapIndex] = current
  }
  return shuffled
}

function hasAmount(value: string): boolean {
  return Number(value) > 0
}

function optionIcon(option: SimulationEventOption): LucideIcon {
  if (option.inMonthObligation || option.installments.length > 0) return CalendarClock
  if (!hasAmount(option.cashRequiredNow)) return Ban
  return Wallet
}

function describeEventOption(option: SimulationEventOption): string {
  const parts: string[] = []
  const fee = hasAmount(option.feeChargedNow)
  const cost = hasAmount(option.immediateCost)

  let today = `${formatCompactMoney(option.cashRequiredNow)} today`
  if (fee && cost) {
    today += ` (${formatCompactMoney(option.immediateCost)} + ${formatCompactMoney(option.feeChargedNow)} fee)`
  } else if (fee) {
    today += ` (${formatCompactMoney(option.feeChargedNow)} fee)`
  }
  parts.push(today)

  parts.push(
    option.affordable
      ? 'Affordable'
      : `${formatCompactMoney(option.shortfall)} short`,
  )

  if (option.inMonthObligation) {
    parts.push(
      `One ${formatCompactMoney(option.inMonthObligation.amountDue)} bill due Day ${option.inMonthObligation.dueDay}`,
    )
  }
  for (const installment of option.installments) {
    parts.push(
      `${formatCompactMoney(installment.amountDue)} installment due Day ${installment.dueDay}`,
    )
  }
  if (!option.inMonthObligation && option.installments.length === 0) {
    parts.push('No new bill')
  }

  return parts.join(' · ')
}

function cardPosition(index: number, activeIndex: number): CSSProperties {
  const offset = index - activeIndex
  if (offset === 0) {
    return {
      transform: 'translateX(-50%) translateY(-12px) rotate(0deg) scale(1.04)',
      zIndex: 50,
    }
  }
  return {
    transform: `translateX(calc(-50% + ${offset * 64}px)) translateY(${Math.abs(offset) * 16 + 12}px) rotate(${offset * 9}deg)`,
    zIndex: 40 - Math.abs(offset),
  }
}

export function EventOptionHand({
  options,
  selectedOptionId,
  onSelect,
  disabled = false,
  hideNavigation = false,
}: EventOptionHandProps) {
  const displayOptions = useMemo(() => shuffleOptions(options), [options])
  const selectedIndex = displayOptions.findIndex((option) => option.id === selectedOptionId)
  const [activeIndex, setActiveIndex] = useState(() =>
    selectedIndex >= 0 ? selectedIndex : 0,
  )
  const active = Math.min(activeIndex, Math.max(0, displayOptions.length - 1))
  const arrowClasses =
    'absolute top-1/2 z-[60] grid size-11 -translate-y-1/2 place-items-center rounded-full border-2 border-[#091828] bg-white text-[#091828] shadow-[3px_3px_0_#091828] transition active:translate-x-[2px] active:shadow-none disabled:cursor-not-allowed disabled:opacity-40 dark:border-[#060E20] dark:bg-[#1C263C] dark:text-white dark:shadow-[3px_3px_0_#060E20]'

  return (
    <fieldset disabled={disabled} className="-mx-5 min-w-0 overflow-hidden px-5">
      <legend className="sr-only">Choose how to respond</legend>
      <div className="relative mx-auto h-[23rem] w-full max-w-sm">
        {displayOptions.map((option, index) => {
          const selected = selectedOptionId === option.id
          const Icon = optionIcon(option)
          const unavailable = !option.affordable

          return (
            <label
              key={option.id}
              style={cardPosition(index, active)}
              onClick={() => setActiveIndex(index)}
              className={`absolute left-1/2 top-6 flex h-[18rem] w-[13.5rem] flex-col rounded-[22px] border-2 p-5 text-left transition-transform duration-300 ease-out motion-reduce:transition-none has-[:focus-visible]:outline has-[:focus-visible]:outline-4 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#FF6B9D] ${
                unavailable
                  ? 'cursor-not-allowed border-[#8C8F95] bg-[#ECE3E6] text-[#6B6375] shadow-[4px_6px_0_#8C8F95] dark:border-[#4A5063] dark:bg-[#2A2F3D] dark:text-[#A0AEC0] dark:shadow-[4px_6px_0_#1A1F2B]'
                  : `cursor-pointer border-[#091828] text-[#091828] shadow-[5px_7px_0_#091828] dark:border-[#060E20] dark:text-white dark:shadow-[5px_7px_0_#060E20] ${cardColours[index % cardColours.length]}`
              }`}
            >
              <input
                type="radio"
                name="event-option"
                value={option.id}
                checked={selected}
                disabled={unavailable}
                onChange={() => {
                  setActiveIndex(index)
                  if (!unavailable) onSelect(option.id)
                }}
                className="sr-only"
              />
              <span className="flex items-start justify-between">
                <span
                  aria-hidden="true"
                  className={`grid size-12 place-items-center rounded-2xl border-2 bg-white/75 shadow-[2px_2px_0_currentColor] dark:bg-white/10 ${
                    unavailable ? 'border-[#8C8F95]' : 'border-[#091828] dark:border-white/70'
                  }`}
                >
                  <Icon className="size-6" />
                </span>
                <span
                  aria-hidden="true"
                  className={`mt-1 grid size-6 place-items-center rounded-full border-2 ${
                    selected
                      ? 'border-[#AC2A5D] bg-[#FFD1E0]'
                      : unavailable
                        ? 'border-[#8C8F95] bg-white/60'
                        : 'border-[#091828] bg-white dark:border-white/70 dark:bg-transparent'
                  }`}
                >
                  {selected && <span className="size-3 rounded-full bg-[#AC2A5D]" />}
                </span>
              </span>
              <span className="mt-5 text-xl font-black leading-tight">
                {option.label}
              </span>
              <span
                className={`mt-2 text-sm leading-snug ${
                  unavailable ? '' : 'text-[#3E3A48] dark:text-[#D9DDE7]'
                }`}
              >
                {describeEventOption(option)}
              </span>
            </label>
          )
        })}
        {!hideNavigation && displayOptions.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous option"
              disabled={active === 0}
              onClick={() => setActiveIndex(active - 1)}
              className={`${arrowClasses} left-0`}
            >
              <ChevronLeft className="size-6" strokeWidth={3} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Next option"
              disabled={active === displayOptions.length - 1}
              onClick={() => setActiveIndex(active + 1)}
              className={`${arrowClasses} right-0`}
            >
              <ChevronRight className="size-6" strokeWidth={3} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      {displayOptions.length > 1 && (
        <p
          aria-live="polite"
          className="mt-1 text-center text-xs font-bold text-[#6B6375] dark:text-[#A0AEC0]"
        >
          Option {active + 1} of {displayOptions.length}
        </p>
      )}
    </fieldset>
  )
}
