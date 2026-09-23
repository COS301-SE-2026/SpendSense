import { useNavigate, useParams } from "react-router-dom";
import { CircleAlert, Landmark, PiggyBank, Sparkles } from "lucide-react";

import { ErrorCard, LoadingCard } from "@/components/common/AsyncStates";

import { SimulationPageShell } from "@/features/simulation/components/SimulationPageShell";
import { formatSimulationMoney } from "@/features/simulation/presentation";
import type {
  CompletionSummary,
  SimulationScoreEntry,
} from "@/features/simulation/types";
import { useSimulation } from "@/hooks/useSimulation";

const obligationOutcomeLabels: Record<string, string> = {
  paidOnTime: "Paid on time",
  paidLate: "Paid late",
  missed: "Missed",
};

const eventOutcomeLabels: Record<string, string> = {
  resolved: "Resolved",
  expired: "Timed out",
};

function formatScore(value: string): string {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "0";
  }

  return new Intl.NumberFormat("en-ZA", {
    maximumFractionDigits: 2,
  }).format(numericValue);
}

function formatPointsDelta(value: string): string {
  const numericValue = Number(value);
  const prefix = Number.isFinite(numericValue) && numericValue > 0 ? "+" : "";

  return `${prefix}${formatScore(value)} points`;
}

function outcomeLabel(key: string, labels: Record<string, string>): string {
  return labels[key] ?? key.replace(/([A-Z])/g, " $1").trim();
}

function OutcomeList({
  title,
  outcomes,
  labels,
}: Readonly<{
  title: string;
  outcomes: Record<string, number>;
  labels: Record<string, string>;
}>) {
  return (
    <section
      aria-labelledby={`${title.toLowerCase().replaceAll(" ", "-")}-title`}
      className="rounded-[18px] border border-[#D9E9E4] bg-white p-4 dark:border-[#2D3449] dark:bg-[#131B2E]"
    >
      <h2
        id={`${title.toLowerCase().replaceAll(" ", "-")}-title`}
        className="text-base font-extrabold"
      >
        {title}
      </h2>
      <dl className="mt-3 grid grid-cols-2 gap-2">
        {Object.entries(outcomes).map(([key, value]) => (
          <div
            key={key}
            className="rounded-xl bg-[#F4FBF7] px-3 py-2 dark:bg-[#1C263C]"
          >
            <dt className="text-[11px] font-semibold text-[#6B6375] dark:text-[#A0AEC0]">
              {outcomeLabel(key, labels)}
            </dt>
            <dd className="mt-0.5 text-lg font-black">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function RecentScoreActivity({
  entries,
}: Readonly<{
  entries: SimulationScoreEntry[];
}>) {
  const entriesByDay = entries.reduce<Map<number, SimulationScoreEntry[]>>(
    (groups, entry) => {
      const group = groups.get(entry.simulatedDay) ?? [];
      group.push(entry);
      groups.set(entry.simulatedDay, group);
      return groups;
    },
    new Map(),
  );

  return (
    <section aria-labelledby="recent-score-activity-title">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="recent-score-activity-title" className="text-xl font-black">
            Recent score activity
          </h2>
          <p className="mt-1 text-xs text-[#6B6375] dark:text-[#A0AEC0]">
            Your latest score changes, not a complete score history.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#E0F5EF] px-2.5 py-1 text-[10px] font-extrabold text-[#16635A] dark:bg-[#183B39] dark:text-[#8FE0D2]">
          Latest {entries.length} of 20
        </span>
      </div>

      {entries.length === 0 ? (
        <div className="mt-4 rounded-[18px] border border-dashed border-[#B9DFD5] bg-[#F4FBF7] p-4 text-sm text-[#6B6375] dark:border-[#2D5B57] dark:bg-[#102A2B] dark:text-[#A0AEC0]">
          No recent score activity is available for this completed month.
        </div>
      ) : (
        <ol className="mt-4 space-y-4 border-l-2 border-[#B9DFD5] pl-4 dark:border-[#2D5B57]">
          {Array.from(entriesByDay.entries()).map(([day, dayEntries]) => (
            <li key={day} className="relative">
              <span
                aria-hidden="true"
                className="absolute -left-[23px] top-1.5 size-3 rounded-full border-2 border-[#091828] bg-[#FF6B9D] dark:border-[#060E20]"
              />
              <h3 className="text-xs font-black uppercase tracking-wide text-[#6B6375] dark:text-[#A0AEC0]">
                Day {day}
              </h3>
              <ul className="mt-2 overflow-hidden rounded-[16px] border border-[#D9E9E4] bg-white dark:border-[#2D3449] dark:bg-[#131B2E]">
                {dayEntries.map((entry) => {
                  const isPositive = Number(entry.pointsDelta) >= 0;

                  return (
                    <li
                      key={entry.id}
                      className="flex items-center justify-between gap-4 border-b border-[#E1EEE9] px-3 py-3 last:border-b-0 dark:border-[#2D3449]"
                    >
                      <span className="min-w-0 text-sm font-semibold">
                        {entry.reason}
                      </span>
                      <strong
                        className={`shrink-0 text-sm ${isPositive ? "text-[#168A78] dark:text-[#7DE0D0]" : "text-[#AC2A5D] dark:text-[#FFB1C5]"}`}
                      >
                        {formatPointsDelta(entry.pointsDelta)}
                      </strong>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function BudgetResult({
  completion,
  startingBudget,
  currentAllocation,
  savingsAllocation,
}: Readonly<{
  completion: CompletionSummary;
  startingBudget: string;
  currentAllocation: string | null;
  savingsAllocation: string | null;
}>) {
  return (
    <section aria-labelledby="budget-result-title">
      <h2 id="budget-result-title" className="text-xl font-black">
        Budget result
      </h2>
      <div className="mt-3 rounded-[20px] border-2 border-[#091828] bg-white p-4 shadow-[4px_5px_0_#091828] dark:border-[#060E20] dark:bg-[#131B2E] dark:shadow-[4px_5px_0_#060E20]">
        <dl className="grid gap-2 text-sm">
          <div className="flex items-center justify-between gap-3 rounded-xl bg-[#F4FBF7] px-3 py-2.5 dark:bg-[#1C263C]">
            <dt className="font-semibold">Starting budget</dt>
            <dd className="font-black">
              {formatSimulationMoney(startingBudget)}
            </dd>
          </div>
          {currentAllocation && savingsAllocation && (
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-[#E0F5EF] px-3 py-2.5 dark:bg-[#183B39]">
                <dt className="flex items-center gap-1 text-[11px] font-semibold text-[#16635A] dark:text-[#8FE0D2]">
                  <Landmark className="size-3.5" aria-hidden="true" />
                  Initial Current
                </dt>
                <dd className="mt-1 font-black">
                  {formatSimulationMoney(currentAllocation)}
                </dd>
              </div>
              <div className="rounded-xl bg-[#EFEBFF] px-3 py-2.5 dark:bg-[#282141]">
                <dt className="flex items-center gap-1 text-[11px] font-semibold text-[#55418F] dark:text-[#C9B9FF]">
                  <PiggyBank className="size-3.5" aria-hidden="true" />
                  Initial Savings
                </dt>
                <dd className="mt-1 font-black">
                  {formatSimulationMoney(savingsAllocation)}
                </dd>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-[#E0F5EF] px-3 py-2.5 dark:bg-[#183B39]">
              <dt className="text-[11px] font-semibold text-[#16635A] dark:text-[#8FE0D2]">
                Final Current
              </dt>
              <dd className="mt-1 font-black">
                {formatSimulationMoney(completion.currentBalance)}
              </dd>
            </div>
            <div className="rounded-xl bg-[#EFEBFF] px-3 py-2.5 dark:bg-[#282141]">
              <dt className="text-[11px] font-semibold text-[#55418F] dark:text-[#C9B9FF]">
                Final Savings
              </dt>
              <dd className="mt-1 font-black">
                {formatSimulationMoney(completion.savingsBalance)}
              </dd>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-[#D9E9E4] px-3 py-2.5 dark:border-[#2D3449]">
              <dt className="text-[11px] font-semibold text-[#6B6375] dark:text-[#A0AEC0]">
                Budget remaining
              </dt>
              <dd className="mt-1 font-black">
                {formatSimulationMoney(completion.totalRemaining)}
              </dd>
              <span className="text-[11px] font-semibold text-[#168A78] dark:text-[#7DE0D0]">
                {formatScore(completion.remainingPercentage)}% remaining
              </span>
            </div>
            <div className="rounded-xl bg-[#FFF1C8] px-3 py-2.5 dark:bg-[#40351B]">
              <dt className="text-[11px] font-semibold text-[#6E5411] dark:text-[#FFE59B]">
                Final budget bonus
              </dt>
              <dd className="mt-1 font-black">
                +{formatScore(completion.budgetBonus)} points
              </dd>
            </div>
          </div>
        </dl>
        <p className="mt-3 flex gap-2 rounded-xl bg-[#EFEBFF] px-3 py-2.5 text-xs leading-relaxed text-[#55418F] dark:bg-[#282141] dark:text-[#C9B9FF]">
          <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
          Remaining Savings is weighted{" "}
          {formatScore(completion.savingsRetentionMultiplier)}× in the final
          budget result. Weighted remaining:{" "}
          {formatSimulationMoney(completion.weightedRemaining)}.
        </p>
      </div>
    </section>
  );
}

export default function ScoreBreakdownPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data, error, loading, refetch } = useSimulation(sessionId);

  if (loading) {
    return (
      <SimulationPageShell title="Score breakdown">
        <LoadingCard label="Loading your completed month" />
      </SimulationPageShell>
    );
  }

  if (error || !data || !sessionId) {
    return (
      <SimulationPageShell title="Score breakdown">
        <ErrorCard
          message={error ?? "Unable to load this completed month."}
          onRetry={() => void refetch()}
        />
      </SimulationPageShell>
    );
  }

  if (data.session.status !== "COMPLETED" || !data.completion) {
    return (
      <SimulationPageShell
        title="Score breakdown"
        onBack={() => navigate(`/simulation/session/${sessionId}`)}
      >
        <div className="rounded-[20px] border-2 border-[#091828] bg-[#FFF1C8] p-5 text-center shadow-[4px_5px_0_#091828] dark:border-[#060E20] dark:bg-[#40351B] dark:shadow-[4px_5px_0_#060E20]">
          <CircleAlert className="mx-auto size-7" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-black">Month not complete yet</h2>
          <p className="mt-2 text-sm text-[#6B6375] dark:text-[#FFE59B]">
            Your score breakdown is available after the fictional month is
            complete.
          </p>
        </div>
      </SimulationPageShell>
    );
  }

  const { completion, session, allocation, recentScoreEntries } = data;

  return (
    <SimulationPageShell
      title="Score breakdown"
      onBack={() => navigate(`/simulation/session/${sessionId}/summary`)}
    >
      <section className="space-y-7 pb-4">
        <div className="rounded-[22px] border-2 border-[#091828] bg-[#FFF0F6] p-5 text-center shadow-[5px_6px_0_#091828] dark:border-[#060E20] dark:bg-[#2D1B2E] dark:shadow-[5px_6px_0_#060E20]">
          <span className="mx-auto grid size-12 place-items-center rounded-full border-2 border-[#091828] bg-[#FFF1C8] shadow-[2px_3px_0_#091828] dark:border-[#060E20] dark:bg-[#40351B] dark:shadow-[2px_3px_0_#060E20]">
            <Sparkles className="size-6" aria-hidden="true" />
          </span>
          <p className="mt-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#AC2A5D] dark:text-[#FFB1C5]">
            Final score
          </p>
          <strong className="mt-1 block text-4xl font-black tracking-tight">
            {formatScore(completion.finalScore)}
          </strong>
          <p className="mt-2 text-xs text-[#6B6375] dark:text-[#D7C5D0]">
            Completed on day {session.currentDay} of {session.daysInMonth}
          </p>
        </div>

        <BudgetResult
          completion={completion}
          startingBudget={session.startingBudget}
          currentAllocation={allocation.selected?.currentAmount ?? null}
          savingsAllocation={allocation.selected?.savingsAmount ?? null}
        />

        <OutcomeList
          title="Obligation outcomes"
          outcomes={completion.obligations}
          labels={obligationOutcomeLabels}
        />
        <OutcomeList
          title="Event outcomes"
          outcomes={completion.events}
          labels={eventOutcomeLabels}
        />

        <RecentScoreActivity entries={recentScoreEntries} />
      </section>
    </SimulationPageShell>
  );
}
