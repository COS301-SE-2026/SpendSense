import { ArrowRight, Pause, Sparkle } from 'lucide-react'
import { useSimulationCountdown } from '@/hooks/useSimulationCountdown'
import type { CurrentSimulationEvent } from '../../features/simulation/types'

interface EventRevealPopupProps {
  event: CurrentSimulationEvent
  onCompareChoices: () => void
  pausing?: boolean
  onPause?: () => void
}

export function EventRevealPopup({
  event,
  onCompareChoices,
  pausing = false,
  onPause,
}: EventRevealPopupProps) {
  const secondsRemaining = useSimulationCountdown(event.decisionExpiresAt)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091828]/35 px-5 backdrop-blur-[2px]">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="event-reveal-title"
        aria-describedby="event-reveal-context"
        className="w-full max-w-md rounded-[28px] border-2 border-[#091828] bg-[#FFF0F5] px-6 pb-6 pt-8 text-center shadow-[6px_7px_0_#091828] dark:border-[#060E20] dark:bg-[#2D1B2E] dark:shadow-[6px_7px_0_#060E20]"
      >
        <div className="mx-auto grid size-20 place-items-center rounded-full border-2 border-[#091828] bg-[#FFD778] shadow-[4px_5px_0_#091828] dark:border-[#060E20] dark:shadow-[4px_5px_0_#060E20]">
          <Sparkle className="size-8 fill-[#091828] text-[#091828]" aria-hidden="true"/>
        </div>
        <p className="mt-5 text-sm font-black uppercase tracking-[0.1em] text-[#AC2A5D] dark:text-[#FFB1C5]">
          Surprise event · Day {event.triggerDay}
        </p>
        <h1
          id="event-reveal-title"
          className="mt-3 text-3xl font-black leading-tight tracking-tight text-[#091828] dark:text-white"
        >
          {event.title}
        </h1>
        <p
          id="event-reveal-context"
          className="mt-4 text-base leading-relaxed text-[#6B6375] dark:text-[#D9DDE7]"
        >
          {event.context}
        </p>
        {secondsRemaining !== null && (
          <p
            className="mt-3 text-sm font-bold text-[#AC2A5D] dark:text-[#FFB1C5]"
            aria-label={`${secondsRemaining} seconds left to decide`}
          >
            {secondsRemaining}s left to decide
          </p>
        )}
        <button
          type="button"
          onClick={onCompareChoices}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-5 py-4 text-base font-black text-[#091828] shadow-[4px_5px_0_#091828] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-[#060E20] dark:shadow-[4px_5px_0_#060E20]"
        >
          Compare choices
          <ArrowRight className="size-5" strokeWidth={3} aria-hidden="true"/>
        </button>
        {onPause && (
          <button
            type="button"
            onClick={onPause}
            disabled={pausing}
            className="mx-auto mt-3 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold text-[#6B6375] underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:opacity-60 dark:text-[#A0AEC0]"
          >
            <Pause className="size-4" aria-hidden="true"/>
            {pausing ? 'Pausing...' : 'Pause month'}
          </button>
        )}
      </section>
    </div>
  )
}
