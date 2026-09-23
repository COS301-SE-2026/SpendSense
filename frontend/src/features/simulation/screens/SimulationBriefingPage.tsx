import { useRef, useState } from "react";
import { Check, Clock3, Landmark, Sparkles, Star } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

import { LongButton } from "@/components/common/LongButton";

import { createSimulation } from "../api";
import { createIdempotencyKey } from "../idempotency";
import { SimulationPageShell } from "../components/SimulationPageShell";

interface BriefingLocationState {
  existingSessionId?: string;
}

export default function SimulationBriefingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { existingSessionId } = (location.state ?? {}) as BriefingLocationState;
  const [timedMode, setTimedMode] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creatingRef = useRef(false);

  const createBriefing = async () => {
    if (existingSessionId) {
      navigate(`/simulation/setup/${existingSessionId}`);
      return;
    }

    if (creatingRef.current) {
      return;
    }

    creatingRef.current = true;
    setCreating(true);
    setError(null);

    try {
      const briefing = await createSimulation(
        timedMode,
        createIdempotencyKey(),
      );
      navigate(`/simulation/setup/${briefing.id}`);
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Unable to start your simulation.";
      setError(message);

      if (message.includes("ACTIVE_SESSION_EXISTS")) {
        navigate("/simulation");
      }
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };

  return (
    <SimulationPageShell
      title="How it works"
      onBack={() => navigate("/simulation")}
      progress={0}
    >
      <section className="space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-black tracking-tight">How it works</h2>
          <p className="mt-2 text-sm text-[#6B6375] dark:text-[#A0AEC0]">
            You’ll manage a fictional month with realistic situations.
          </p>
        </div>

        <div className="rounded-[20px] border-2 border-[#091828] bg-gradient-to-br from-[#FFF0F6] via-[#FFE1EC] to-[#F2EAFF] p-5 shadow-[5px_6px_0_#091828] dark:border-[#060E20] dark:from-[#2D1B2E] dark:via-[#241D35] dark:to-[#1E243B] dark:shadow-[5px_6px_0_#060E20]">
          <ul className="space-y-4 text-sm">
            <li className="flex gap-3">
              <Clock3 className="size-5 shrink-0 text-[#AC2A5D]" />
              <span>
                <strong className="block">30 simulated days</strong>
                <small className="text-[#6B6375] dark:text-[#A0AEC0]">
                  (15 seconds per day)
                </small>
              </span>
            </li>
            <li className="flex gap-3">
              <Landmark className="size-5 shrink-0 text-[#AC2A5D]" />
              <span>
                <strong className="block">Pay fictional obligations</strong>
                <small className="text-[#6B6375] dark:text-[#A0AEC0]">
                  (full payments only)
                </small>
              </span>
            </li>
            <li className="flex gap-3">
              <Sparkles className="size-5 shrink-0 text-[#AC2A5D]" />
              <span>
                <strong className="block">Handle 2–4 surprise events</strong>
              </span>
            </li>
            <li className="flex gap-3">
              <Star className="size-5 shrink-0 text-[#6650B0]" />
              <span>
                <strong className="block">
                  Earn points and learn from your decisions
                </strong>
              </span>
            </li>
          </ul>
          <div className="my-4 border-t border-[#E4CDD5] dark:border-[#4A3547]" />
          <label className="flex cursor-pointer items-center gap-3 rounded-[15px] border-2 border-[#B9DFD5] bg-[#E0F5EF] p-3 shadow-[2px_2px_0_#B9DFD5] dark:border-[#23695F] dark:bg-[#143D38] dark:shadow-[2px_2px_0_#0B332F]">
            <input
              className="sr-only"
              type="checkbox"
              checked={!timedMode}
              onChange={(event) => setTimedMode(!event.target.checked)}
              aria-label="Accessibility mode"
            />
            <span
              aria-hidden="true"
              className={`grid size-5 shrink-0 place-items-center rounded-md border-2 border-[#091828] ${!timedMode ? "bg-[#FF6B9D]" : "bg-white"}`}
            >
              {!timedMode ? (
                <Check className="size-3.5" strokeWidth={3} />
              ) : null}
            </span>
            <span>
              <strong className="block text-sm">Accessibility mode</strong>
              <small className="text-xs text-[#6B6375] dark:text-[#A0AEC0]">
                Disable timers and use manual Advance day.
              </small>
            </span>
          </label>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-[#FCE0E8] px-3 py-2 text-center text-xs font-semibold text-[#AC2A5D]"
          >
            {error}
          </p>
        )}

        <LongButton
          LongVariant="primaryDark"
          className="shadow-[3px_3px_0_#091828] dark:shadow-[3px_3px_0_#060E20]"
          disabled={creating}
          onClick={() => void createBriefing()}
        >
          {creating ? "Creating your month…" : "Continue"}
        </LongButton>
      </section>
    </SimulationPageShell>
  );
}
