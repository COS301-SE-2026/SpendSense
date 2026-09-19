export type SimulationStatus = 'BRIEFING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ABANDONED' | 'EXPIRED'

export type SimulationAllowedAction = 'SETUP' | 'PAY_OBLIGATION' | 'RESOLVE_EVENT' | 'CONTINUE' | 'ADVANCE_DAY'

export type SimulationPendingType = 'NONE' | 'PAYMENT_RESULT' | 'EVENT_REVEAL' | 'EVENT_RESULT' | 'SUMMARY'

export interface SessionSummary {
  id: string
  status: SimulationStatus
  timedMode: boolean
  currentDay: number
  daysInMonth: number
  nextDayAt: string | null
  startingBudget: string
  currentBalance: string
  savingsBalance: string
  score: string
  createdAt: string
  updatedAt?: string
  completedAt: string | null
}

export interface SimulationSession extends SessionSummary {
  pending: {
    type: SimulationPendingType
    id: string | null
  }
}

export interface AllocationOption {
  id: string
  label: string
  currentAmount: string
  savingsAmount: string
}

export interface CustomAllocation {
  enabled: true
  minCurrentAmount: string
  maxCurrentAmount: string
  increment: string
}

export interface SimulationObligation {
  id: string
  templateCode: string
  name: string
  category: string
  amountDue: string
  dueDay: number
  status: 'SCHEDULED' | 'PAYABLE' | 'PAID' | 'MISSED'
  paidAt: string | null
  currentUsed: string
  savingsUsed: string
  pointsAwarded: string
}

export interface SimulationEventOption {
  id: string
  label: string
  immediateCost: string
  feeOrDebt: string
}

export interface CurrentSimulationEvent {
  id: string
  triggerDay: number
  title: string
  context: string
  options: SimulationEventOption[]
  decisionExpiresAt: string | null
}

export interface SimulationScoreEntry {
  id: string
  sourceType: string
  sourceId: string | null
  simulatedDay: number
  pointsDelta: string
  reason: string
  createdAt: string
}

export interface CompletionSummary {
  version: string
  completedAt: string
  currentBalance: string
  savingsBalance: string
  totalRemaining: string
  weightedRemaining: string
  remainingPercentage: string
  savingsRetentionMultiplier: string
  budgetBonus: string
  finalScore: string
  obligations: Record<string, number>
  events: Record<string, number>
}

export interface SimulationDetail {
  session: SimulationSession
  allocation: {
    options: AllocationOption[]
    custom: CustomAllocation | null
    selected: AllocationOption | null
  }
  obligations: SimulationObligation[]
  currentEvent: CurrentSimulationEvent | null
  recentScoreEntries: SimulationScoreEntry[]
  completion: CompletionSummary | null
  allowedActions: SimulationAllowedAction[]
}

export interface BriefingObligation {
  id: string
  name: string
  category: string
  amountDue: string
  dueDay: number
}

export interface BriefingResponse extends SessionSummary {
  briefing: {
    allocationOptions: AllocationOption[]
    customAllocation: CustomAllocation | null
    obligations: BriefingObligation[]
    surpriseEventCount: number
  }
  replayed: boolean
}

export interface ActiveSimulationResponse {
  active: SessionSummary | null
  latestCompleted: SessionSummary | null
}

export interface PaymentResult {
  obligationId: string
  currentUsed: string
  savingsUsed: string
  pointsAwarded: string
}

export interface PaymentSimulationResponse extends SimulationDetail {
  payment: PaymentResult
  replayed: boolean
}

export interface EventResolutionResult {
  id: string
  optionId: string
  label: string
  explanation: string
  immediateCost: string
  feeOrDebt: string
  currentUsed: string
  savingsUsed: string
  uncoveredAmount: string
  pointsAwarded: string
  introducedObligationId: string | null
}

export interface EventSimulationResponse extends SimulationDetail {
  event: EventResolutionResult
  replayed: boolean
}

export interface SimulationActionResponse extends SimulationDetail {
  replayed: boolean
}

export type SetupRequest =
  | { allocationId: string }
  | { currentAmount: string }

export type SimulationStatusAction =
  | 'pause'
  | 'resume'
  | 'discard'