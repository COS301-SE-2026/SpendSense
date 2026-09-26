import { apiDataFetch } from "@/lib/api";
import type {
  ActiveSimulationResponse,
  BriefingResponse,
  DiscardSimulationResponse,
  EventSimulationResponse,
  InsufficientSimulationFundsErrorBody,
  PaymentSimulationResponse,
  SetupRequest,
  SetupSimulationResponse,
  SimulationActionResponse,
  SimulationApiErrorBody,
  SimulationDetail,
  SimulationStatusAction,
  SimulationStatusResponse,
} from "./types";

// apiDataFetch already prefixes paths with VITE_API_URL, which is configured as
// http://localhost:3000/api/v1 in the frontend environment.
const BASE = "/simulations";

function mutationHeaders(idempotencyKey: string) {
  return {
    "Idempotency-Key": idempotencyKey,
  };
}

function postAction<T>(path: string, idempotencyKey: string, body: object = {}) {
  return apiDataFetch<T>(path, {
    method: "POST",
    headers: mutationHeaders(idempotencyKey),
    body: JSON.stringify(body),
  });
}

export function createSimulation(timedMode: boolean, idempotencyKey: string) {
  return postAction<BriefingResponse>(BASE, idempotencyKey, { timedMode });
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
  return postAction<SetupSimulationResponse>(
    `${BASE}/${sessionId}/setup`,
    idempotencyKey,
    setup,
  );
}

export function advanceSimulation(sessionId: string, idempotencyKey: string) {
  return postAction<SimulationActionResponse>(
    `${BASE}/${sessionId}/advance`,
    idempotencyKey,
  );
}

export function paySimulationObligation(
  sessionId: string,
  obligationId: string,
  idempotencyKey: string,
) {
  return postAction<PaymentSimulationResponse>(
    `${BASE}/${sessionId}/obligations/${obligationId}/pay`,
    idempotencyKey,
  );
}

export function resolveSimulationEvent(
  sessionId: string,
  eventId: string,
  optionId: string,
  idempotencyKey: string,
) {
  return postAction<EventSimulationResponse>(
    `${BASE}/${sessionId}/events/${eventId}/resolve`,
    idempotencyKey,
    { optionId },
  );
}

export function continueSimulation(sessionId: string, idempotencyKey: string) {
  return postAction<SimulationActionResponse>(
    `${BASE}/${sessionId}/continue`,
    idempotencyKey,
  );
}

export function updateSimulationStatus(
  sessionId: string,
  action: 'pause' | 'resume',
  idempotencyKey: string,
): Promise<SimulationStatusResponse>

export function updateSimulationStatus(
  sessionId: string,
  action: 'discard',
  idempotencyKey: string,
): Promise<DiscardSimulationResponse>

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

export type SimulationErrorCode =
  | "ACTIVE_SESSION_EXISTS"
  | "IDEMPOTENCY_KEY_REUSED"
  | "SIMULATION_NOT_FOUND"
  | "SIMULATION_EXPIRED"
  | "SETUP_ALREADY_CONFIRMED"
  | "TIMED_MODE_ACTIVE"
  | "SIMULATION_ACTION_PENDING"
  | "INSUFFICIENT_SIMULATION_FUNDS"
  | "EVENT_DECISION_EXPIRED"
  | "SIMULATION_EVENT_OPTION_UNAFFORDABLE"
  | "SIMULATION_CONTINUE_NOT_ALLOWED"
  | "SIMULATION_DISCARD_NOT_ALLOWED";

export interface SimulationRequestError extends Error {
  statusCode?: number;
  error?: Partial<SimulationApiErrorBody> & Record<string, unknown>;
}

function errorBody(error: unknown) {
  if (typeof error !== "object" || error === null) return undefined;
  return (error as SimulationRequestError).error;
}

export function simulationErrorStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  return (error as SimulationRequestError).statusCode;
}

export function simulationErrorCode(error: unknown): string | undefined {
  const message = errorBody(error)?.message;
  return typeof message === "string" ? message : undefined;
}

export function isSimulationError(
  error: unknown,
  code: SimulationErrorCode,
): boolean {
  return simulationErrorCode(error) === code;
}

export function insufficientFundsDetails(
  error: unknown,
): InsufficientSimulationFundsErrorBody | null {
  const body = errorBody(error);
  if (
    !body ||
    body.message !== "INSUFFICIENT_SIMULATION_FUNDS" ||
    typeof body.currentBalance !== "string" ||
    typeof body.savingsBalance !== "string" ||
    typeof body.remainingAmount !== "string"
  ) {
    return null;
  }
  return body as unknown as InsufficientSimulationFundsErrorBody;
}
