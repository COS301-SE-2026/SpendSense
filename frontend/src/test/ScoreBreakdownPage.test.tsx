import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import ScoreBreakdownPage from "../features/simulation/screens/ScoreBreakdownPage";
import {
  activeBoardFixture,
  completedFixture,
} from "../features/simulation/fixtures/SimulationDetail";
import { getSimulation } from "../features/simulation/api";

vi.mock("../features/simulation/api", () => ({
  getSimulation: vi.fn(),
}));

function LocationDisplay() {
  const location = useLocation();
  return <p>Current route: {location.pathname}</p>;
}

function renderRoute() {
  return render(
    <MemoryRouter
      initialEntries={[
        `/simulation/session/${completedFixture.session.id}/score-breakdown`,
      ]}
    >
      <Routes>
        <Route
          path="/simulation/session/:sessionId/score-breakdown"
          element={<ScoreBreakdownPage />}
        />
        <Route
          path="/simulation/session/:sessionId/summary"
          element={<LocationDisplay />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ScoreBreakdownPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders immutable completion values and the selected starting allocation", async () => {
    vi.mocked(getSimulation).mockResolvedValue(completedFixture);

    renderRoute();

    expect(await screen.findByText("190")).toBeInTheDocument();
    expect(screen.getByText("Starting budget").parentElement).toHaveTextContent(
      /6\s000,00/,
    );
    expect(screen.getByText("Initial Current").parentElement).toHaveTextContent(
      /4\s200,00/,
    );
    expect(screen.getByText("Initial Savings").parentElement).toHaveTextContent(
      /1\s800,00/,
    );
    expect(
      screen.getByText("Budget remaining").parentElement,
    ).toHaveTextContent(/2\s800,00/);
    expect(screen.getByText(/46[,.]67% remaining/)).toBeInTheDocument();
    expect(screen.getByText("+40 points")).toBeInTheDocument();
    expect(screen.getByText("Paid on time")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
  });

  it("labels score entries as limited recent activity without inventing detail", async () => {
    vi.mocked(getSimulation).mockResolvedValue(completedFixture);

    renderRoute();

    expect(
      await screen.findByRole("heading", { name: "Recent score activity" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "Your latest score changes, not a complete score history.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Latest 1 of 20")).toBeInTheDocument();
    expect(screen.getByText("On-time obligation payment")).toBeInTheDocument();
    expect(screen.getByText("+50 points")).toBeInTheDocument();
    expect(screen.queryByText(/payment source/i)).not.toBeInTheDocument();
  });

  it("shows an explicit empty state when no recent score entries are returned", async () => {
    vi.mocked(getSimulation).mockResolvedValue({
      ...completedFixture,
      recentScoreEntries: [],
    });

    renderRoute();

    expect(
      await screen.findByText(
        "No recent score activity is available for this completed month.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Latest 0 of 20")).toBeInTheDocument();
  });

  it("returns to the completed-month summary", async () => {
    const user = userEvent.setup();
    vi.mocked(getSimulation).mockResolvedValue(completedFixture);

    renderRoute();

    await user.click(await screen.findByRole("button", { name: "Back" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          `Current route: /simulation/session/${completedFixture.session.id}/summary`,
        ),
      ).toBeInTheDocument();
    });
  });

  it("does not render a score breakdown for an incomplete month", async () => {
    vi.mocked(getSimulation).mockResolvedValue(activeBoardFixture);

    renderRoute();

    expect(
      await screen.findByText("Month not complete yet"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Budget result")).not.toBeInTheDocument();
  });
});
