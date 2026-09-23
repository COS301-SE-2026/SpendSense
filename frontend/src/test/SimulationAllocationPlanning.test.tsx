import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import BudgetAllocationPage from "../features/simulation/screens/BudgetAllocationPage";
import MonthPlanningPage from "../features/simulation/screens/MonthPlanningPage";
import {
  activeBoardFixture,
  briefingFixture,
} from "../features/simulation/fixtures/SimulationDetail";
import type { SetupRequest } from "../features/simulation/types";
import { getSimulation, setupSimulation } from "../features/simulation/api";

vi.mock("../features/simulation/api", () => ({
  createSimulation: vi.fn(),
  getActiveSimulation: vi.fn(),
  getSimulation: vi.fn(),
  setupSimulation: vi.fn(),
  updateSimulationStatus: vi.fn(),
}));

function renderRoute(
  initialEntry: string | { pathname: string; state?: unknown },
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/simulation/setup/:sessionId"
          element={<BudgetAllocationPage />}
        />
        <Route
          path="/simulation/setup/:sessionId/planning"
          element={<MonthPlanningPage />}
        />
        <Route
          path="/simulation/session/:sessionId"
          element={<p>Active board handoff</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("Simulation allocation and planning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("carries a server-approved allocation into the read-only planning screen", async () => {
    const user = userEvent.setup();
    vi.mocked(getSimulation).mockResolvedValue(briefingFixture);

    renderRoute(`/simulation/setup/${briefingFixture.session.id}`);

    await user.click(await screen.findByRole("radio", { name: /70 \/ 30/i }));
    await user.click(
      screen.getByRole("button", { name: /review your month/i }),
    );

    expect(
      (
        await screen.findAllByRole("heading", {
          name: /your month at a glance/i,
        })
      ).at(-1),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Transport")).not.toHaveLength(0);
    expect(
      screen.getByText(/planning does not make payments/i),
    ).toBeInTheDocument();
  });

  it("submits setup once, then fetches authoritative detail before the board handoff", async () => {
    const user = userEvent.setup();
    const setupRequest: SetupRequest = {
      allocationId: briefingFixture.allocation.options[0].id,
    };
    vi.mocked(getSimulation)
      .mockResolvedValueOnce(briefingFixture)
      .mockResolvedValueOnce(activeBoardFixture);
    vi.mocked(setupSimulation).mockResolvedValue({});

    renderRoute({
      pathname: `/simulation/setup/${briefingFixture.session.id}/planning`,
      state: { setupRequest },
    });

    await user.click(
      await screen.findByRole("button", { name: /^start month$/i }),
    );

    await waitFor(() => {
      expect(setupSimulation).toHaveBeenCalledWith(
        briefingFixture.session.id,
        setupRequest,
        expect.any(String),
      );
    });
    expect(await screen.findByText("Active board handoff")).toBeInTheDocument();
  });
});
