import React from "react";
import {fireEvent,render,screen,waitFor} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import '@testing-library/jest-dom'

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
          path="/simulation/session/:sessionId/board"
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
      await screen.findByRole("heading", { name: "Month overview", level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        name: /your month at a glance/i,
        level: 2,
      }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: /about simulated month/i }),
    );
    expect(
      screen.getByRole("dialog", { name: "About your month" }),
    ).toHaveTextContent(/each obligation shows its amount and due day/i);
    expect(
      screen.getByRole("dialog", { name: "About your month" }),
    ).toHaveTextContent(/no payments are made/i);
    await user.click(screen.getByRole("button", { name: /close information/i }));
    expect(screen.getAllByText("Transport")).not.toHaveLength(0);
    expect(
      screen.getByText(/planning does not make payments/i),
    ).toBeInTheDocument();
  });

  it("shows information specific to the budget setup page", async () => {
    const user = userEvent.setup();
    vi.mocked(getSimulation).mockResolvedValue(briefingFixture);

    renderRoute(`/simulation/setup/${briefingFixture.session.id}`);

    await user.click(
      screen.getByRole("button", { name: /about simulated month/i }),
    );

    expect(
      screen.getByRole("dialog", { name: "About your budget" }),
    ).toHaveTextContent(/current is available for paying obligations/i);
    expect(
      screen.getByRole("dialog", { name: "About your budget" }),
    ).toHaveTextContent(/does not move real money/i);
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

  it("rejects custom amounts outside server bounds, invalid steps and extra decimals",async()=>{
    vi.mocked(getSimulation).mockResolvedValue(briefingFixture);
    const custom=briefingFixture.allocation.custom;
    if(!custom)throw new Error("Custom allocation fixture is required");

    renderRoute(`/simulation/setup/${briefingFixture.session.id}`);
    const input=await screen.findByRole("spinbutton",{name:/custom current amount/i});
    const review=screen.getByRole("button",{name:/review your month/i});
    const minimum=Number(custom.minCurrentAmount);
    const maximum=Number(custom.maxCurrentAmount);
    const increment=Number(custom.increment);

    fireEvent.change(input,{target:{value:(minimum-increment).toFixed(2)}});
    expect(review).toBeDisabled();
    expect(input).toHaveAttribute("aria-invalid","true");

    fireEvent.change(input,{target:{value:(maximum+increment).toFixed(2)}});
    expect(review).toBeDisabled();

    if(increment>0.01){
      fireEvent.change(input,{target:{value:(minimum+0.01).toFixed(2)}});
      expect(review).toBeDisabled();
    }

    fireEvent.change(input,{target:{value:`${minimum.toFixed(2)}1`}});
    expect(review).toBeDisabled();

    fireEvent.change(input,{target:{value:custom.minCurrentAmount}});
    expect(input).toHaveAttribute("aria-invalid","false");
    expect(review).toBeEnabled();
  });

  it("passes a valid custom amount into planning without sending setup early",async()=>{
    const user=userEvent.setup();
    vi.mocked(getSimulation).mockResolvedValue(briefingFixture);
    const custom=briefingFixture.allocation.custom;
    if(!custom)throw new Error("Custom allocation fixture is required");

    renderRoute(`/simulation/setup/${briefingFixture.session.id}`);
    const input=await screen.findByRole("spinbutton",{name:/custom current amount/i});
    fireEvent.change(input,{target:{value:custom.minCurrentAmount}});
    await user.click(screen.getByRole("button",{name:/review your month/i}));

    expect(await screen.findByRole("button",{name:/^start month$/i})).toBeInTheDocument();
    expect(setupSimulation).not.toHaveBeenCalled();
  });

  it("routes a resumed active session to its board without setting up again",async()=>{
    const setupRequest:SetupRequest={
      allocationId:briefingFixture.allocation.options[0].id,
    };
    vi.mocked(getSimulation).mockResolvedValue(activeBoardFixture);

    renderRoute({
      pathname:`/simulation/setup/${briefingFixture.session.id}/planning`,
      state:{setupRequest},
    });

    expect(await screen.findByText("Active board handoff")).toBeInTheDocument();
    expect(setupSimulation).not.toHaveBeenCalled();
  });

  it("recovers an already-confirmed setup from authoritative server state",async()=>{
    const user=userEvent.setup();
    const setupRequest:SetupRequest={
      allocationId:briefingFixture.allocation.options[0].id,
    };
    vi.mocked(getSimulation)
      .mockResolvedValueOnce(briefingFixture)
      .mockResolvedValueOnce(activeBoardFixture);
    vi.mocked(setupSimulation).mockRejectedValue(new Error("SETUP_ALREADY_CONFIRMED"));

    renderRoute({
      pathname:`/simulation/setup/${briefingFixture.session.id}/planning`,
      state:{setupRequest},
    });

    await user.click(await screen.findByRole("button",{name:/^start month$/i}));

    expect(await screen.findByText("Active board handoff")).toBeInTheDocument();
    expect(setupSimulation).toHaveBeenCalledTimes(1);
    expect(getSimulation).toHaveBeenCalledTimes(2);
  });

  it("keeps the planning screen available when setup fails",async()=>{
    const user=userEvent.setup();
    const setupRequest:SetupRequest={
      allocationId:briefingFixture.allocation.options[0].id,
    };
    vi.mocked(getSimulation).mockResolvedValue(briefingFixture);
    vi.mocked(setupSimulation).mockRejectedValue(new Error("Setup unavailable"));

    renderRoute({
      pathname:`/simulation/setup/${briefingFixture.session.id}/planning`,
      state:{setupRequest},
    });

    await user.click(await screen.findByRole("button",{name:/^start month$/i}));

    expect(await screen.findByRole("alert")).toHaveTextContent("Setup unavailable");
    expect(screen.getByRole("button",{name:/^start month$/i})).toBeEnabled();
  });
});