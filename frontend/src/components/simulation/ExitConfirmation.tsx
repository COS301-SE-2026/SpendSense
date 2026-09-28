import {
  LogOut,
  Trash2,
  ArrowLeft,
} from 'lucide-react'

interface ExitConfirmationProps {
  saving?: boolean
  discarding?: boolean
  discardError?: string | null
  confirmDiscard?: boolean
  onKeepPlaying: () => void
  onSaveAndExit: () => void
  onRequestDiscard: () => void
  onCancelDiscard: () => void
  onConfirmDiscard: () => void
}

export function ExitConfirmation({
  saving = false,
  discarding = false,
  discardError = null,
  confirmDiscard = false,
  onKeepPlaying,
  onSaveAndExit,
  onRequestDiscard,
  onCancelDiscard,
  onConfirmDiscard,
}: ExitConfirmationProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091828]/55 px-5 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="simulation-exit-title"
        className="w-full max-w-md rounded-3xl border-2 border-[#091828] bg-white p-6 shadow-[5px_6px_0_#091828] dark:bg-[#111c31]"
      >
        {!confirmDiscard ? (
          <>
            <p className="text-xs font-black uppercase tracking-wide text-[#AC2A5D]">
              Exit simulation
            </p>
            <h1
              id="simulation-exit-title"
              className="mt-1 text-2xl font-black text-[#091828] dark:text-white"
            >
              Leave this month?
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#6B6375] dark:text-[#A0AEC0]">
              Your fictional progress can be saved for later, or you can discard this run.
            </p>
            <button
              type="button"
              onClick={onKeepPlaying}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-white px-5 py-3 text-sm font-black text-[#091828] shadow-[2px_2px_0_#091828] dark:bg-[#1C263C] dark:text-white"
            >
              <ArrowLeft className="size-4"/>
              Keep playing
            </button>
            <button
              type="button"
              onClick={onSaveAndExit}
              disabled={saving}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#091828] bg-[#FF6B9D] px-5 py-3 text-sm font-black text-[#091828] shadow-[3px_3px_0_#091828] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="size-4"/>
              {saving
                ? 'Saving...'
                : 'Save and exit'}
            </button>
            <button
              type="button"
              onClick={onRequestDiscard}
              disabled={saving}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#AC2A5D] bg-[#FFD9E1] px-5 py-3 text-sm font-black text-[#AC2A5D]"
            >
              <Trash2 className="size-4"/>
              Discard run
            </button>
          </>
        ) : (
          <>
            <p className="text-xs font-black uppercase tracking-wide text-[#AC2A5D]">
              Confirm discard
            </p>
            <h1
              id="simulation-exit-title"
              className="mt-1 text-2xl font-black text-[#091828] dark:text-white"
            >
              Discard this run?
            </h1>
            <p className="mt-3 text-sm leading-6 text-[#6B6375] dark:text-[#A0AEC0]">
              This fictional month will be abandoned and will no longer be available to resume.
            </p>
            <button
              type="button"
              onClick={onConfirmDiscard}
              disabled={discarding}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#AC2A5D] bg-[#FFD9E1] px-5 py-3 text-sm font-black text-[#AC2A5D] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="size-4"/>
              {discarding
                ? 'Discarding...'
                : 'Discard run'}
            </button>
            <button
              type="button"
              onClick={onCancelDiscard}
              disabled={discarding}
              className="mt-3 w-full rounded-full border-2 border-[#091828] bg-white px-5 py-3 text-sm font-black text-[#091828] dark:bg-[#1C263C] dark:text-white"
            >
              Go back
            </button>
          </>
        )}
        {discardError && (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-[#FFD9E1] px-4 py-3 text-sm font-semibold text-[#AC2A5D]"
          >
            {discardError}
          </p>
        )}
      </section>
    </div>
  )
}