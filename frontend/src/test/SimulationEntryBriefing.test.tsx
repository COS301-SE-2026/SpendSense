import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SimulationBriefingPage from "../features/simulation/screens/SimulationBriefingPage";
import SimulationEntryPage from "../features/simulation/screens/SimulationEntryPage";
import { briefingFixture } from "../features/simulation/fixtures/SimulationDetail";
import type {
  BriefingResponse,
  SessionSummary,
} from "../features/simulation/types";
import {
  createSimulation,
  getActiveSimulation,
  updateSimulationStatus,
} from "../features/simulation/api";

vi.mock("../features/simulation/api", () => ({
  createSimulation: vi.fn(),
  getActiveSimulation: vi.fn(),
  getSimulation: vi.fn(),
  setupSimulation: vi.fn(),
  updateSimulationStatus: vi.fn(),
}));

const briefingResponse: BriefingResponse = {
  id: briefingFixture.session.id,
  status: "BRIEFING",
  timedMode: true,
  currentDay: 0,
  daysInMonth: 30,
  nextDayAt: null,
  startingBudget: briefingFixture.session.startingBudget,
  currentBalance: "0.00",
  savingsBalance: "0.00",
  score: "0.00",
  createdAt: briefingFixture.session.createdAt,
  completedAt: null,
  briefing: {
    allocationOptions: briefingFixture.allocation.options,
    customAllocation: briefingFixture.allocation.custom,
    obligations: briefingFixture.obligations.map((obligation) => ({
      id: obligation.id,
      name: obligation.name,
      category: obligation.category,
      amountDue: obligation.amountDue,
      dueDay: obligation.dueDay,
    })),
    surpriseEventCount: 2,
  },
  replayed: false,
};

const resumableSession: SessionSummary = {
  id: "sim-active",
  status: "PAUSED",
  timedMode: false,
  currentDay: 8,
  daysInMonth: 30,
  nextDayAt: null,
  startingBudget: "6240.00",
  currentBalance: "4940.00",
  savingsBalance: "1300.00",
  score: "184.00",
  createdAt: "2026-09-22T12:00:00.000Z",
  completedAt: null,
};

function renderRoute(
  initialEntry: string | { pathname: string; state?: unknown },
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/simulation" element={<SimulationEntryPage />} />
        <Route
          path="/simulation/briefing"
          element={<SimulationBriefingPage />}
        />
        <Route
          path="/simulation/setup/:sessionId"
          element={<p>Budget setup</p>}
        />
        <Route path="/simulation/recovery" element={<p>Recovery handoff</p>}/>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Simulation entry and briefing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows Start only when the server reports no resumable session", async () => {
    vi.mocked(getActiveSimulation).mockResolvedValue({
      active: null,
      latestCompleted: null,
    });

    renderRoute("/simulation");

    expect(
      await screen.findByRole("button", { name: /start simulation/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /about simulated month/i }),
    ).toBeInTheDocument();
  });

  it("shows the simulation details from the info button", async () => {
    const user = userEvent.setup();

    renderRoute("/simulation/briefing");

    await user.click(
      screen.getByRole("button", { name: /about simulated month/i }),
    );

    expect(
      screen.getByRole("dialog", { name: "About this month" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/15 seconds per day/)).toBeInTheDocument();
    expect(screen.getByText(/2–4 surprise events/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /close information/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("creates the briefing with easy mode selected", async () => {
    const user = userEvent.setup();
    vi.mocked(createSimulation).mockResolvedValue({
      ...briefingResponse,
      timedMode: false,
    });

    renderRoute("/simulation/briefing");

    await user.click(
      screen.getByRole("checkbox", { name: /easy mode/i }),
    );
    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    await waitFor(() => {
      expect(createSimulation).toHaveBeenCalledWith(false, expect.any(String));
    });
    expect(await screen.findByText("Budget setup")).toBeInTheDocument();
  });

  it("submits only one creation request when Continue is clicked rapidly", () => {
    vi.mocked(createSimulation).mockImplementation(
      () => new Promise(() => undefined),
    );

    renderRoute("/simulation/briefing");

    const continueButton = screen.getByRole("button", {
      name: /^continue$/i,
    });
    fireEvent.click(continueButton);
    fireEvent.click(continueButton);

    expect(createSimulation).toHaveBeenCalledTimes(1);
  });

  it("returns to the existing budget setup instead of creating a second session", async () => {
    const user = userEvent.setup();

    renderRoute({
      pathname: "/simulation/briefing",
      state: { existingSessionId: "sim-existing" },
    });

    await user.click(screen.getByRole("button", { name: /^continue$/i }));

    expect(await screen.findByText("Budget setup")).toBeInTheDocument();
    expect(createSimulation).not.toHaveBeenCalled();
  });

  it("keeps discard confirmation inline instead of using a browser prompt", async () => {
    const user = userEvent.setup();
    const confirmSpy = vi.spyOn(window, "confirm");
    vi.mocked(getActiveSimulation).mockResolvedValue({
      active: resumableSession,
      latestCompleted: null,
    });

    renderRoute("/simulation");

    await user.click(await screen.findByRole("button", { name: "Discard" }));

    expect(
      screen.getByText("Discard this fictional month?"),
    ).toBeInTheDocument();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(updateSimulationStatus).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});