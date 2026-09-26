import { useState, type ReactNode } from "react";
import { ChevronLeft, Info, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SimulationPageShell({
  children,
  title,
  onBack,
  progress,
  progressVariant = "bars",
  infoTitle = "About this simulation",
  infoButtonLabel = "About Simulated Month",
  infoContent = "This simulation uses fictional money and situations. It never affects your real finances.",
  onInfoOpenChange,
}: Readonly<{
  children: ReactNode;
  title?: string;
  onBack?: () => void;
  progress?: number;
  progressVariant?: "bars" | "dots";
  infoTitle?: string;
  infoButtonLabel?: string;
  infoContent?: ReactNode;
  onInfoOpenChange?: (open: boolean) => void;
}>) {
  const navigate = useNavigate();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="min-h-screen bg-[#F4FBF7] text-[#091828] dark:bg-[#0B1326] dark:text-white">
      <main className="mx-auto w-full max-w-md px-5 pb-12 pt-6">
        {title ? (
          <header className="mb-12 flex items-center gap-3">
            <button
              type="button"
              aria-label="Back"
              onClick={onBack ?? (() => navigate(-1))}
              className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FF6B9D] shadow-[4px_4px_0_#091828] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-[#060E20] dark:bg-[#FFB1C5] dark:shadow-[4px_4px_0_#060E20]"
            >
              <ChevronLeft
                className="size-5 text-[#6E0034] dark:text-[#650030]"
                aria-hidden="true"
              />
            </button>
            <div className="flex min-w-0 flex-1 items-center justify-center">
              <h1 className="max-w-full truncate whitespace-nowrap rounded-full border-2 border-[#091828] bg-white px-7 py-2.5 text-base font-bold text-[#091828] shadow-[4px_4px_0_#091828] [transform:rotate(-3deg)] dark:border-[#060E20] dark:bg-[#FFB1C5] dark:shadow-[4px_4px_0_#FF6B9D] dark:text-[#091828]">
                {title}
              </h1>
            </div>
            <button
              type="button"
              aria-label={infoButtonLabel}
              aria-haspopup="dialog"
              onClick={() => {
                setShowInfo(true);
                onInfoOpenChange?.(true);
              }}
              className="flex size-12 shrink-0 items-center justify-center rounded-full border-2 border-[#091828] bg-[#FFF1C8] shadow-[4px_4px_0_#091828] dark:border-[#060E20] dark:bg-[#3D351B] dark:shadow-[4px_4px_0_#060E20]"
            >
              <Info className="size-5" aria-hidden="true" />
            </button>
          </header>
        ) : null}

        {progress !== undefined && (
          <div
            className="mb-7 flex justify-center gap-2"
            aria-label={`Setup step ${progress + 1} of 3`}
          >
            {[0, 1, 2].map((step) => (
              <span
                key={step}
                className={`${progressVariant === "dots" ? "size-2" : "h-1.5 w-7"} rounded-full ${step === progress ? "bg-[#FF6B9D]" : "bg-[#DCEBE7] dark:bg-[#2D3449]"}`}
              />
            ))}
          </div>
        )}

        {children}
      </main>
      {showInfo ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#091828]/55 px-5 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="simulation-info-title"
            className="w-full max-w-md rounded-3xl border-2 border-[#091828] bg-white p-6 shadow-[5px_6px_0_#091828] dark:bg-[#111c31]"
          >
            <div className="flex items-start justify-between gap-4">
              <h2
                id="simulation-info-title"
                className="text-xl font-black text-[#091828] dark:text-white"
              >
                {infoTitle}
              </h2>
              <button
                type="button"
                aria-label="Close information"
                onClick={() => {
                  setShowInfo(false);
                  onInfoOpenChange?.(false);
                }}
                className="grid size-9 shrink-0 place-items-center rounded-full border-2 border-[#091828] bg-[#FFF1C8] dark:border-[#060E20]"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-4 text-sm leading-6 text-[#6B6375] dark:text-[#A0AEC0]">
              {infoContent}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
