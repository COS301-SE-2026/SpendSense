import {
  Play,
  PauseCircle,
  LogOut,
} from 'lucide-react'

interface PauseOverlayProps {
  resuming?: boolean
  resumeError?: string | null
  onResume: () => void
  onExit: () => void
}

export function PauseOverlay({
  resuming = false,
  resumeError = null,
  onResume,
  onExit,
}: PauseOverlayProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091828]/55 px-5 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="simulation-paused-title"
        className="w-full max-w-md rounded-3xl border-2 border-[#091828] bg-white p-6 shadow-[5px_6px_0_#091828] dark:bg-[#111c31]"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-[#FFF1C8] p-3">
            <PauseCircle className="size-6 text-[#091828]"/>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-[#AC2A5D]">
              Simulation paused
            </p>
            <h1
              id="simulation-paused-title"
              className="text-2xl font-black text-[#091828] dark:text-white"
            >
              Take a break
            </h1>
          </div>
        </div>
        <p className="mt-4 text-sm leading-6 text-[#6B6375] dark:text-[#A0AEC0]">
          Your fictional month is paused. Resume when you are ready to continue.
        </p>
        <button
          type="button"
          onClick={onResume}
          disabled={resuming}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-5 py-3 text-sm font-black text-[#091828] shadow-[3px_3px_0_#091828] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Play className="size-4"/>
          {resuming
            ? 'Resuming...'
            : 'Resume month'}
        </button>
        <button
          type="button"
          onClick={onExit}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-white px-5 py-3 text-sm font-black text-[#091828] dark:bg-[#1C263C] dark:text-white"
        >
          <LogOut className="size-4"/>
          Leave simulation
        </button>
        {resumeError && (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-[#FFD9E1] px-4 py-3 text-sm font-semibold text-[#AC2A5D]"
          >
            {resumeError}
          </p>
        )}
      </section>
    </div>
  )
}