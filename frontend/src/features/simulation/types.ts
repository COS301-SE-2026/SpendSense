export type SimulationStatus = 'BRIEFING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ABANDONED' | 'EXPIRED'

export type SimulationAllowedAction =
  | 'SETUP'
  | 'PAY_OBLIGATION'
  | 'RESOLVE_EVENT'
  | 'CONTINUE'
  | 'ACKNOWLEDGE_NEW_OBLIGATION'
  | 'ADVANCE_DAY'

export type SimulationPendingType =
  | 'NONE'
  | 'PAYMENT_RESULT'
  | 'EVENT_REVEAL'
  | 'EVENT_RESULT'
  | 'NEW_OBLIGATION'
  | 'SUMMARY'

export type SimulationObligationStatus = 'SCHEDULED' | 'PAYABLE' | 'PAID' | 'MISSED'

export type SimulationObligationImportance = 'CRITICAL' | 'HIGH' | 'STANDARD' | 'LOW'

export type SimulationObligationOrigin =
  | 'INITIAL'
  | 'RANDOM_INTRODUCTION'
  | 'EVENT_INTRODUCTION'
  | 'INSTALLMENT'

export type SimulationScoreSourceType =
  | 'OBLIGATION_PAYMENT'
  | 'OBLIGATION_MISSED'
  | 'INSTALLMENT_MISSED'
  | 'EVENT_DECISION'
  | 'EVENT_EXPIRY'
  | 'FEE_OR_DEBT'
  | 'FINAL_BUDGET_BONUS'

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

interface ObligationBase {
  id: string
  templateCode: string
  name: string
  category: string
  amountDue: string
  dueDay: number
  status: SimulationObligationStatus
  importance: SimulationObligationImportance
  importanceWeight: string
  baseMissPenalty: string
  origin: SimulationObligationOrigin
}

export interface SimulationObligation extends ObligationBase {
  paidAt: string | null
  currentUsed: string
  savingsUsed: string
  pointsAwarded: string
}

export interface SimulationInMonthBill {
  name: string
  amountDue: string
  dueDay: number
}

export interface SimulationEventOption {
  id: string
  label: string
  immediateCost: string
  feeOrDebt: string
  feeChargedNow: string
  cashRequiredNow: string
  affordable: boolean
  shortfall: string
  inMonthObligation: SimulationInMonthBill | null
  installments: SimulationInMonthBill[]
}

export interface CurrentSimulationEvent {
  id: string
  triggerDay: number
  title: string
  context: string
  options: SimulationEventOption[]
  decisionExpiresAt: string | null
}

export interface SimulationNewObligation {
  id: string
  name: string
  amountDue: string
  dueDay: number
  importance: SimulationObligationImportance
}

export interface SimulationScoreEntry {
  id: string
  sourceType: SimulationScoreSourceType
  sourceId: string | null
  simulatedDay: number
  pointsDelta: string
  reason: string
  createdAt: string
}

export interface SimulationLedgerEntry extends SimulationScoreEntry {
  calculationData: Record<string, unknown> | null
}

export interface SimulationOutcomeCounts {
  total: number
  paid: number
  missed: number
  unresolved: number
}

export interface SimulationEventOutcomeCounts {
  total: number
  resolved: number
  expired: number
  unresolved: number
}

export interface SimulationAmountTotal {
  count: number
  amount: string
}

interface CompletionSummaryBase {
  completedAt: string
  startingBudget: string
  currentBalance: string
  savingsBalance: string
  totalRemaining: string
  weightedRemaining: string
  remainingBudgetPercentage: string
  savingsRetentionMultiplier: string
  budgetBonus: string
  finalScore: string
  obligations: SimulationOutcomeCounts
  events: SimulationEventOutcomeCounts
}

export interface CompletionSummaryV1 extends CompletionSummaryBase {
  version: 'v1'
}

interface CompletionSummaryAggregates {
  installments: {
    missedCount: number
    missedAmount: string
  }
  scoreBySource: Partial<Record<SimulationScoreSourceType, string>>
  importanceOutcomes: Partial<Record<SimulationObligationImportance, SimulationOutcomeCounts>>
}

export interface CompletionSummaryV2 extends CompletionSummaryBase, CompletionSummaryAggregates {
  version: 'v2'
  feesAndDebt: SimulationAmountTotal
}

export interface CompletionSummaryV3 extends CompletionSummaryBase, CompletionSummaryAggregates {
  version: 'v3'
  weightedRemainingPercentage: string
  upfrontFees: SimulationAmountTotal
  inMonthEventBills: SimulationAmountTotal
}

export type CompletionSummary = CompletionSummaryV1 | CompletionSummaryV2 | CompletionSummaryV3

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
  newObligation: SimulationNewObligation | null
  completion: CompletionSummary | null
  scoreLedger?: SimulationLedgerEntry[]
  allowedActions: SimulationAllowedAction[]
}

export type BriefingObligation = ObligationBase

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

export interface SetupSimulationResponse {
  session: SimulationSession
  allocation: AllocationOption
  replayed: boolean
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
  feeChargedNow: string
  cashRequiredNow: string
  inMonthObligation: SimulationInMonthBill | null
  currentUsed: string
  savingsUsed: string
  uncoveredAmount: string
  pointsAwarded: string
  introducedObligationId: string | null
  installmentsCreated: SimulationInMonthBill[]
}

export interface EventSimulationResponse extends SimulationDetail {
  event: EventResolutionResult
  replayed: boolean
}

export interface SimulationActionResponse extends SimulationDetail {
  replayed: boolean
}

export type SimulationStatusResponse = SimulationActionResponse

export interface DiscardSimulationResponse {
  session: {
    id: string
    status: 'ABANDONED'
    abandonedAt: string
  }
  replayed: boolean
}

export type SetupRequest =
  | { allocationId: string }
  | { currentAmount: string }

export type SimulationStatusAction =
  | 'pause'
  | 'resume'
  | 'discard'

export interface SimulationApiErrorBody {
  statusCode: number
  message: string
  timestamp?: string
  path?: string
}

export interface InsufficientSimulationFundsErrorBody extends SimulationApiErrorBody {
  currentBalance: string
  savingsBalance: string
  remainingAmount: string
}
