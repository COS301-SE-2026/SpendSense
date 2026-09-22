import { useCallback, useEffect, useState } from "react";
import {
  CircleDollarSign,
  CreditCard,
  Play,
  RotateCcw,
  Settings2,
  Star,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { ErrorCard, LoadingCard } from "@/components/common/AsyncStates";
import { LongButton } from "@/components/common/LongButton";
import { CustomCard } from "@/components/ui/CustomCard";

import { getActiveSimulation, updateSimulationStatus } from "../api";
import { createIdempotencyKey } from "../idempotency";
import type { ActiveSimulationResponse, SessionSummary } from "../types";
import { SimulationPageShell } from "../components/SimulationPageShell";
import { formatSimulationMoney } from "../presentation";

function sessionDescription(session: SessionSummary): string {
  if (session.status === "BRIEFING") {
    return "Your fictional scenario is ready for you to finish setting up.";
  }

  if (session.status === "PAUSED") {
    return `Paused on day ${session.currentDay} of ${session.daysInMonth}.`;
  }

  return `Continue from day ${session.currentDay} of ${session.daysInMonth}.`;
}

export default function SimulationEntryPage() {
  const navigate = useNavigate();
  const [data, setData] = useState<ActiveSimulationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  const loadActiveSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      setData(await getActiveSimulation());
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load your simulation.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadActiveSimulation);
  }, [loadActiveSimulation]);

  const resume = (session: SessionSummary) => {
    if (session.status === "BRIEFING") {
      navigate(`/simulation/setup/${session.id}`);
      return;
    }

    navigate(`/simulation/session/${session.id}`);
  };

  const discard = async () => {
    const active = data?.active;
    if (!active || discarding) {
      return;
    }

    setDiscarding(true);
    setError(null);

    try {
      await updateSimulationStatus(
        active.id,
        "discard",
        createIdempotencyKey(),
      );
      await loadActiveSimulation();
      setConfirmingDiscard(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to discard this simulation.",
      );
    } finally {
      setDiscarding(false);
    }
  };

  return (
    <SimulationPageShell
      title="Simulated Month"
      onBack={() => navigate("/domains/dashboard")}
    >
      <section className="space-y-7 text-center">
        <div className="relative mx-auto grid size-24 place-items-center rounded-2xl border-2 border-[#091828] bg-[#FF6B9D] shadow-[5px_6px_0_#091828] [transform:rotate(-5deg)] dark:border-[#060E20] dark:shadow-[5px_6px_0_#060E20]">
          <span className="absolute -top-3 left-5 h-5 w-3 rounded-full border-2 border-[#091828] bg-white" />
          <span className="absolute -top-3 right-5 h-5 w-3 rounded-full border-2 border-[#091828] bg-white" />
          <div>
            <strong className="block text-4xl font-black leading-none">
              30
            </strong>
            <span className="text-[11px] font-bold">days</span>
          </div>
        </div>

        <div>
          <h2 className="text-3xl font-black tracking-tight">
            Simulated Month
          </h2>
        </div>

        {loading ? (
          <LoadingCard label="Checking your simulation" />
        ) : error ? (
          <ErrorCard
            message={error}
            onRetry={() => void loadActiveSimulation()}
          />
        ) : data?.active ? (
          <CustomCard
            variant="navyShaddow"
            size="md"
            className="rounded-[20px] border-2 border-[#091828] text-left shadow-[4px_5px_0_#091828] dark:border-[#060E20] dark:shadow-[4px_5px_0_#060E20]"
          >
            {confirmingDiscard ? (
              <div className="text-center" aria-live="polite">
                <div className="mx-auto grid size-11 place-items-center rounded-full bg-[#FFD8E6] text-[#AC2A5D]">
                  <Trash2 className="size-5" aria-hidden="true" />
                </div>
                <p className="mt-3 font-extrabold">
                  Discard this fictional month?
                </p>
                <p className="mt-2 text-xs leading-relaxed text-[#6B6375] dark:text-[#A0AEC0]">
                  This abandons this run permanently. Your real finances are
                  never affected.
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingDiscard(false)}
                    disabled={discarding}
                    className="rounded-full border-2 border-[#091828] bg-white px-3 py-2 text-xs font-bold transition hover:bg-[#FFF3FA] disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2D3449] dark:bg-[#131B2E] dark:hover:bg-[#1C263C]"
                  >
                    Keep simulation
                  </button>
                  <button
                    type="button"
                    onClick={() => void discard()}
                    disabled={discarding}
                    className="rounded-full bg-[#AC2A5D] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#C93D73] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {discarding ? "Discarding…" : "Discard run"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <div className="grid size-11 shrink-0 place-items-center rounded-full bg-[#FFD8E6] text-[#AC2A5D]">
                  <RotateCcw className="size-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold">
                    Your fictional month is waiting
                  </p>
                  <p className="mt-1 text-xs leading-relaxed text-[#6B6375] dark:text-[#A0AEC0]">
                    {sessionDescription(data.active)}
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => resume(data.active!)}
                      className="flex flex-1 items-center justify-center gap-1 rounded-full bg-[#AC2A5D] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#C93D73] active:translate-y-px"
                    >
                      <Play className="size-3.5" aria-hidden="true" />
                      Resume
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDiscard(true)}
                      className="flex items-center justify-center gap-1 rounded-full border-2 border-[#091828] bg-white px-3 py-2 text-xs font-bold transition hover:bg-[#FFF3FA] dark:border-[#2D3449] dark:bg-[#131B2E] dark:hover:bg-[#1C263C]"
                    >
                      <Trash2 className="size-3.5" aria-hidden="true" />
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            )}
          </CustomCard>
        ) : (
          <CustomCard
            variant="navyShaddow"
            size="lg"
            className="space-y-5 rounded-3xl text-left"
          >
            <ul className="space-y-4 text-sm font-semibold">
              <li className="flex items-center gap-3">
                <span className="grid size-7 place-items-center rounded-full bg-[#EFEBFF] text-[#6650B0]">
                  <Settings2 className="size-3.5" />
                </span>
                Manage a fictional budget
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-7 place-items-center rounded-full bg-[#E0F5EF] text-[#16635A]">
                  <CreditCard className="size-3.5" />
                </span>
                Pay obligations and handle surprise events
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-7 place-items-center rounded-full bg-[#FFF1C8] text-[#7C5D12]">
                  <CircleDollarSign className="size-3.5" />
                </span>
                Learn from each decision
              </li>
              <li className="flex items-center gap-3">
                <span className="grid size-7 place-items-center rounded-full bg-[#EFEBFF] text-[#6650B0]">
                  <Star className="size-3.5" />
                </span>
                Earn points and learn
              </li>
            </ul>
            <LongButton
              LongVariant="primaryDark"
              onClick={() => navigate("/simulation/briefing")}
            >
              Start simulation
            </LongButton>
          </CustomCard>
        )}

        {data?.latestCompleted && (
          <button
            type="button"
            onClick={() =>
              navigate(
                `/simulation/session/${data.latestCompleted!.id}/summary`,
              )
            }
            className="w-full rounded-2xl border-2 border-[#091828] bg-white p-4 text-left shadow-[3px_4px_0_#091828] transition hover:bg-[#FFF3FA] dark:border-[#2D3449] dark:bg-[#131B2E] dark:shadow-[3px_4px_0_#060E20]"
          >
            <span className="block text-sm font-extrabold">
              View your last completed month
            </span>
            <span className="mt-1 block text-xs text-[#6B6375] dark:text-[#A0AEC0]">
              Final score: {formatSimulationMoney(data.latestCompleted.score)}{" "}
              points
            </span>
          </button>
        )}
      </section>
    </SimulationPageShell>
  );
}
