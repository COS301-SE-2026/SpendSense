import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, Landmark, PiggyBank } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { ErrorCard, LoadingCard } from "@/components/common/AsyncStates";
import { LongButton } from "@/components/common/LongButton";

import { getSimulation } from "../api";
import { SimulationPageShell } from "../components/SimulationPageShell";
import { formatSimulationMoney } from "../presentation";
import { pathForSimulationState } from "../routing";
import type { SetupRequest, SimulationDetail } from "../types";

const budgetInfo = (
  <ul className="list-disc space-y-2 pl-5">
    <li>
      Your starting budget is fictional and only applies to this simulation.
    </li>
    <li>Current is available for paying obligations during the month.</li>
    <li>Savings can support payments and earns more points.</li>
    <li>
      Choose a suggested split or enter a custom Current amount in the allowed
      range.
    </li>
    <li>Choosing a split does not move real money.</li>
  </ul>
);

function amountToNumber(amount: string): number {
  const parsed = Number(amount);
  return Number.isFinite(parsed) ? parsed : 0;
}

function amountToCents(amount:string):number|null{
    if(!/^\d+(?:\.\d{1,2})?$/.test(amount))return null
    const value=Math.round(Number(amount)*100)
    return Number.isSafeInteger(value)?value:null
}

export default function BudgetAllocationPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [detail, setDetail] = useState<SimulationDetail | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [customCurrentAmount, setCustomCurrentAmount] = useState("");
  const [loading, setLoading] = useState(true);
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
        navigate(pathForSimulationState(nextDetail),{replace:true});
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load your fictional scenario.",
      );
    } finally {
      setLoading(false);
    }
  }, [navigate, sessionId]);

  useEffect(() => {
    void Promise.resolve().then(loadDetail);
  }, [loadDetail]);

  const custom=detail?.allocation.custom
  const startingBudget=amountToNumber(detail?.session.startingBudget??"0")
  const customCents=amountToCents(customCurrentAmount)
  const minimumCents=custom?amountToCents(custom.minCurrentAmount):null
  const maximumCents=custom?amountToCents(custom.maxCurrentAmount):null
  const incrementCents=custom?amountToCents(custom.increment):null
  const validCustom=customCents!==null&&minimumCents!==null&&
      maximumCents!==null&&incrementCents!==null&&incrementCents>0&&
      customCents>=minimumCents&&customCents<=maximumCents&&
      (customCents-minimumCents)%incrementCents===0
  const customCurrent=customCents===null?0:customCents/100
  const customSavings=Math.max(0,startingBudget-customCurrent)
  const selectedPreset=
      detail?.allocation.options.find(
          (option)=>option.id===selectedPresetId,
      )??null
  const selectedCurrentAmount=
      selectedPreset?.currentAmount??
      (validCustom?customCurrent.toFixed(2):null)
  const selectedSavingsAmount=
      selectedPreset?.savingsAmount??
      (validCustom?customSavings.toFixed(2):null)

  const setupRequest:SetupRequest|null=selectedPreset
      ?{allocationId:selectedPreset.id}
      :custom&&validCustom
          ?{currentAmount:customCurrent.toFixed(2)}
          :null

  if (loading) {
    return (
      <SimulationPageShell
        title="Set up your budget"
        infoTitle="About your budget"
        infoContent={budgetInfo}
      >
        <LoadingCard label="Loading your fictional budget" />
      </SimulationPageShell>
    );
  }

  if (error || !detail || !sessionId) {
    return (
      <SimulationPageShell
        title="Set up your budget"
        infoTitle="About your budget"
        infoContent={budgetInfo}
      >
        <ErrorCard
          message={error ?? "Unable to load your fictional budget."}
          onRetry={() => void loadDetail()}
        />
      </SimulationPageShell>
    );
  }

  return (
    <SimulationPageShell
      title="Set up your budget"
      onBack={() =>
        navigate("/simulation/briefing", {
          state: { existingSessionId: sessionId },
        })
      }
      progress={1}
      infoTitle="About your budget"
      infoContent={budgetInfo}
    >
      <section className="space-y-5">
        <div className="rounded-[20px] border-2 border-[#091828] bg-gradient-to-br from-[#FFF0F6] via-[#FFE1EC] to-[#F2EAFF] p-5 text-center shadow-[5px_6px_0_#091828] dark:border-[#060E20] dark:from-[#2D1B2E] dark:via-[#241D35] dark:to-[#1E243B] dark:shadow-[5px_6px_0_#060E20]">
          <h2 className="text-3xl font-black tracking-tight">
            Set up your budget
          </h2>
          <div className="mt-5 rounded-xl border-2 border-[#091828] bg-white px-4 py-3 shadow-[3px_3px_0_#091828] dark:border-[#060E20] dark:bg-[#131B2E] dark:shadow-[3px_3px_0_#060E20]">
            <strong className="block text-3xl font-black">
              {formatSimulationMoney(detail.session.startingBudget)}
            </strong>
          </div>

          <fieldset className="mt-5 text-left">
            <legend className="text-sm font-extrabold">
              Choose your split
            </legend>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {detail.allocation.options.map((option) => {
                const selected = option.id === selectedPresetId;

                return (
                  <label
                    key={option.id}
                    className={`cursor-pointer rounded-full border-2 px-2 py-2 text-center text-xs font-extrabold transition ${selected ? "border-[#091828] bg-[#FF6B9D] shadow-[2px_2px_0_#091828] dark:border-[#060E20] dark:bg-[#FFB1C5] dark:shadow-[2px_2px_0_#060E20]" : "border-[#091828] bg-white hover:bg-[#FFF3FA] dark:border-[#2D3449] dark:bg-[#131B2E] dark:hover:bg-[#1C263C]"}`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="allocation"
                      checked={selected}
                      onChange={() => {
                        setSelectedPresetId(option.id);
                        setCustomCurrentAmount("");
                      }}
                    />
                    <span>
                      {option.label
                        .replaceAll("% Current / ", " / ")
                        .replaceAll("% Savings", "")}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {custom && (
            <div className="mt-4 border-t border-[#E4CDD5] pt-4 text-left dark:border-[#4A3547]">
              <label
                htmlFor="custom-current"
                className="block text-sm font-extrabold"
              >
                Or choose a custom Current amount
              </label>
              <input
                id="custom-current"
                type="number"
                inputMode="decimal"
                min={custom.minCurrentAmount}
                max={custom.maxCurrentAmount}
                step={custom.increment}
                value={customCurrentAmount}
                aria-invalid={customCurrentAmount!==""&&!validCustom}
                aria-describedby="custom-current-help"
                onChange={(event) => {
                  setCustomCurrentAmount(event.target.value);
                  setSelectedPresetId(null);
                }}
                placeholder={`${custom.minCurrentAmount}–${custom.maxCurrentAmount}`}
                className="mt-2 w-full rounded-xl border-2 border-[#091828] bg-white px-3 py-2 text-sm font-semibold dark:border-[#2D3449] dark:bg-[#1C263C]"
              />
              <p id="custom-current-help" className="mt-2 text-xs font-semibold" role={customCurrentAmount!==""&&!validCustom?"alert":undefined}>
                {customCurrentAmount!==""&&!validCustom
                    ?`Enter an amount from ${custom.minCurrentAmount} to ${custom.maxCurrentAmount} in steps of ${custom.increment}.`
                    :`Allowed: ${custom.minCurrentAmount} to ${custom.maxCurrentAmount}, steps of ${custom.increment}.`}
              </p>
            </div>
          )}

          {selectedCurrentAmount && selectedSavingsAmount ? (
            <div className="mt-5">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-[15px] border border-[#B9DFD5] bg-[#E0F5EF] p-3 text-left">
                  <span className="flex items-center gap-1 text-xs font-bold text-[#16635A]">
                    <Landmark className="size-3.5" aria-hidden="true" />
                    Current
                  </span>
                  <strong className="mt-1 block text-lg font-black">
                    {formatSimulationMoney(selectedCurrentAmount)}
                  </strong>
                </div>
                <div className="rounded-[15px] border border-[#D8CFF8] bg-[#EFEBFF] p-3 text-left">
                  <span className="flex items-center gap-1 text-xs font-bold text-[#6650B0]">
                    <PiggyBank className="size-3.5" aria-hidden="true" />
                    Savings
                  </span>
                  <strong className="mt-1 block text-lg font-black">
                    {formatSimulationMoney(selectedSavingsAmount)}
                  </strong>
                </div>
              </div>
            </div>
          ) : null}

          <p className="mt-5 flex gap-2 rounded-[14px] border-2 border-[#091828] bg-[#FFF1C8] px-3 py-3 text-left text-xs font-semibold text-[#59430D] shadow-[3px_3px_0_#091828] dark:border-[#060E20] dark:shadow-[3px_3px_0_#060E20]">
            <ArrowRightLeft className="size-4 shrink-0" aria-hidden="true" />
            Savings can support payments and earns more points.
          </p>

          <LongButton
            LongVariant="primaryPink"
            className="mt-5 shadow-[3px_3px_0_#091828] dark:shadow-[3px_3px_0_#060E20]"
            disabled={!setupRequest}
            onClick={() =>
              navigate(`/simulation/setup/${sessionId}/planning`, {
                state: { setupRequest },
              })
            }
          >
            Review your month
          </LongButton>
        </div>
      </section>
    </SimulationPageShell>
  );
}