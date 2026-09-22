import { apiDataFetch } from "@/lib/api";
import type {
  ActiveSimulationResponse,
  BriefingResponse,
  EventSimulationResponse,
  PaymentSimulationResponse,
  SetupRequest,
  SimulationActionResponse,
  SimulationDetail,
  SimulationStatusAction,
} from "./types";

// apiDataFetch already prefixes paths with VITE_API_URL, which is configured as
// http://localhost:3000/api/v1 in the frontend environment.
const BASE = "/simulations";

function mutationHeaders(idempotencyKey: string) {
  return {
    "Idempotency-Key": idempotencyKey,
  };
}

export function createSimulation(timedMode: boolean, idempotencyKey: string) {
  return apiDataFetch<BriefingResponse>(BASE, {
    method: "POST",
    headers: mutationHeaders(idempotencyKey),
    body: JSON.stringify({ timedMode }),
  });
}

export function getActiveSimulation() {
  return apiDataFetch<ActiveSimulationResponse>(`${BASE}/active`);
}

export function getSimulation(sessionId: string) {
  return apiDataFetch<SimulationDetail>(`${BASE}/${sessionId}`);
}

export function setupSimulation(
  sessionId: string,
  setup: SetupRequest,
  idempotencyKey: string,
) {
  return apiDataFetch(`${BASE}/${sessionId}/setup`, {
    method: "POST",
    headers: mutationHeaders(idempotencyKey),
    body: JSON.stringify(setup),
  });
}

export function advanceSimulation(sessionId: string, idempotencyKey: string) {
  return apiDataFetch<SimulationActionResponse>(
    `${BASE}/${sessionId}/advance`,
    {
      method: "POST",
      headers: mutationHeaders(idempotencyKey),
      body: JSON.stringify({}),
    },
  );
}

export function paySimulationObligation(
  sessionId: string,
  obligationId: string,
  idempotencyKey: string,
) {
  return apiDataFetch<PaymentSimulationResponse>(
    `${BASE}/${sessionId}/obligations/${obligationId}/pay`,
    {
      method: "POST",
      headers: mutationHeaders(idempotencyKey),
      body: JSON.stringify({}),
    },
  );
}

export function resolveSimulationEvent(
  sessionId: string,
  eventId: string,
  optionId: string,
  idempotencyKey: string,
) {
  return apiDataFetch<EventSimulationResponse>(
    `${BASE}/${sessionId}/events/${eventId}/resolve`,
    {
      method: "POST",
      headers: mutationHeaders(idempotencyKey),
      body: JSON.stringify({ optionId }),
    },
  );
}

export function continueSimulation(sessionId: string, idempotencyKey: string) {
  return apiDataFetch<SimulationActionResponse>(
    `${BASE}/${sessionId}/continue`,
    {
      method: "POST",
      headers: mutationHeaders(idempotencyKey),
      body: JSON.stringify({}),
    },
  );
}

export function updateSimulationStatus(
  sessionId: string,
  action: SimulationStatusAction,
  idempotencyKey: string,
) {
  return apiDataFetch(`${BASE}/${sessionId}/status`, {
    method: "PATCH",
    headers: mutationHeaders(idempotencyKey),
    body: JSON.stringify({ action }),
  });
}
