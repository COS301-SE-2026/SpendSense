import { useCallback, useEffect, useState } from "react";
import { CalendarDays, CircleAlert, Landmark, PiggyBank } from "lucide-react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { ErrorCard, LoadingCard } from "@/components/common/AsyncStates";
import { LongButton } from "@/components/common/LongButton";

import { getSimulation, setupSimulation } from "../api";
import { SimulationPageShell } from "../components/SimulationPageShell";
import { createIdempotencyKey } from "../idempotency";
import { formatSimulationMoney } from "../presentation";
import { pathForSimulationState } from "../routing";
import type { SetupRequest, SimulationDetail } from "../types";

const monthOverviewInfo = (
  <ul className="list-disc space-y-2 pl-5">
    <li>
      Review how your starting budget is split between Current and Savings.
    </li>
    <li>Each obligation shows its amount and due day for the simulated month.</li>
    <li>
      This is only a preview. No payments are made and your score does not
      change here.
    </li>
    <li>Choose Start month when you are ready to begin.</li>
  </ul>
);

interface PlanningLocationState {
  setupRequest?: SetupRequest;
}

function routeAfterSetup(
  detail: SimulationDetail,
  navigate: ReturnType<typeof useNavigate>,
) {
  navigate(pathForSimulationState(detail),{replace:true});
}

export default function MonthPlanningPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { setupRequest } = (location.state ?? {}) as PlanningLocationState;
  const [detail, setDetail] = useState<SimulationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDetail = useCallback(async () => {
    if (!sessionId) {
      setError("This simulation session is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextDetail = await getSimulation(sessionId);
      setDetail(nextDetail);

      if (nextDetail.session.status !== "BRIEFING") {
        routeAfterSetup(nextDetail, navigate);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load your fictional plan.",
      );
    } finally {
      setLoading(false);
    }
  }, [navigate, sessionId]);

  useEffect(() => {
    if (!setupRequest) {
      navigate(`/simulation/setup/${sessionId ?? ""}`, { replace: true });
      return;
    }

    void Promise.resolve().then(loadDetail);
  }, [loadDetail, navigate, sessionId, setupRequest]);

  const startMonth = async () => {
    if (!sessionId || !setupRequest || starting) {
      return;
    }

    setStarting(true);
    setError(null);

    try {
      await setupSimulation(sessionId, setupRequest, createIdempotencyKey());
      const refreshedDetail = await getSimulation(sessionId);
      routeAfterSetup(refreshedDetail, navigate);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to start your fictional month.";

      if (message.includes("SETUP_ALREADY_CONFIRMED")) {
        try {
          routeAfterSetup(await getSimulation(sessionId), navigate);
          return;
        } catch {
          // Surface the original state error when the recovery read also fails.
        }
      }

      setError(message);
    } finally {
      setStarting(false);
    }
  };

  if (!setupRequest || loading) {
    return (
      <SimulationPageShell
        title="Month overview"
        infoTitle="About your month"
        infoContent={monthOverviewInfo}
      >
        <LoadingCard label="Loading your month plan" />
      </SimulationPageShell>
    );
  }

  if(!detail||!sessionId){
    return (
      <SimulationPageShell
        title="Month overview"
        infoTitle="About your month"
        infoContent={monthOverviewInfo}
      >
        <ErrorCard
          message={error ?? "Unable to load your fictional plan."}
          onRetry={() => void loadDetail()}
        />
      </SimulationPageShell>
    );
  }

  const selected =
    "allocationId" in setupRequest
      ? (detail.allocation.options.find(
          (option) => option.id === setupRequest.allocationId,
        ) ?? null)
      : null;
  const currentAmount =
    selected?.currentAmount ??
    ("currentAmount" in setupRequest ? setupRequest.currentAmount : "0.00");
  const savingsAmount =
    selected?.savingsAmount ??
    (Number(detail.session.startingBudget) - Number(currentAmount)).toFixed(2);

  return (
    <SimulationPageShell
      title="Month overview"
      onBack={() => navigate(`/simulation/setup/${sessionId}`)}
      progress={2}
      infoTitle="About your month"
      infoContent={monthOverviewInfo}
    >
      <section className="space-y-5">
        <div className="text-center">
          <h2 className="text-2xl font-black tracking-tight">
            Your month at a glance
          </h2>
          <p className="mt-2 text-sm text-[#6B6375] dark:text-[#A0AEC0]">
            These are your server-selected starting obligations.
          </p>
        </div>

        <div className="rounded-[20px] border-2 border-[#091828] bg-gradient-to-br from-[#FFF0F6] via-[#FFE1EC] to-[#F2EAFF] p-5 shadow-[5px_6px_0_#091828] dark:border-[#060E20] dark:from-[#2D1B2E] dark:via-[#241D35] dark:to-[#1E243B] dark:shadow-[5px_6px_0_#060E20]">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-[15px] border border-[#B9DFD5] bg-[#E0F5EF] p-3 text-center">
              <Landmark className="mx-auto size-4" aria-hidden="true" />
              <span className="mt-1 block text-xs">Current</span>
              <strong className="block text-sm">
                {formatSimulationMoney(currentAmount)}
              </strong>
            </div>
            <div className="rounded-[15px] border border-[#D8CFF8] bg-[#EFEBFF] p-3 text-center">
              <PiggyBank className="mx-auto size-4" aria-hidden="true" />
              <span className="mt-1 block text-xs">Savings</span>
              <strong className="block text-sm">
                {formatSimulationMoney(savingsAmount)}
              </strong>
            </div>
          </div>

          <div className="mt-5 rounded-[18px] border-2 border-[#091828] bg-white p-3 shadow-[3px_4px_0_#091828] dark:border-[#060E20] dark:bg-[#131B2E] dark:shadow-[3px_4px_0_#060E20]">
            <ul className="grid gap-2">
              {detail.obligations.map((obligation, index) => (
                <li
                  key={obligation.id}
                  className="grid grid-cols-[30px_1fr_auto] items-center gap-2 rounded-xl border border-[#DAE9E5] bg-white px-2 py-2 dark:border-[#2D3449] dark:bg-[#1C263C]"
                >
                  <span
                    className={`grid size-[30px] place-items-center rounded-full ${["bg-[#EFEBFF]", "bg-[#E0F5EF]", "bg-[#FFF1C8]"][index % 3]} text-[#AC2A5D]`}
                  >
                    <CalendarDays className="size-3.5" aria-hidden="true" />
                  </span>
                  <strong className="min-w-0 text-sm">{obligation.name}</strong>
                  <span className="text-right">
                    <strong className="block text-xs">
                      {formatSimulationMoney(obligation.amountDue)}
                    </strong>
                    <small className="text-[10px] text-[#6B6375] dark:text-[#A0AEC0]">
                      Day {obligation.dueDay}
                    </small>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <p className="mt-5 flex gap-2 rounded-[14px] border-2 border-[#091828] bg-[#FFF1C8] px-3 py-3 text-xs font-semibold text-[#59430D] shadow-[3px_3px_0_#091828] dark:border-[#060E20] dark:shadow-[3px_3px_0_#060E20]">
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            Planning does not make payments or change your score.
          </p>

          {error && (
            <p
              role="alert"
              className="mt-5 rounded-xl bg-[#FCE0E8] px-3 py-2 text-center text-xs font-semibold text-[#AC2A5D]"
            >
              {error}
            </p>
          )}

          <LongButton
            LongVariant="primaryDark"
            className="mt-5 shadow-[3px_3px_0_#091828] dark:shadow-[3px_3px_0_#060E20]"
            disabled={starting}
            onClick={() => void startMonth()}
          >
            {starting ? "Starting your month…" : "Start month"}
          </LongButton>
        </div>
      </section>
    </SimulationPageShell>
  );
}