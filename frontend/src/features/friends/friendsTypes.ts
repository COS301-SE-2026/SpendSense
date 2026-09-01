export type ScoreTier = "BUILDING" | "FAIR" | "GOOD" | "EXCELLENT" | "ELITE"

export type FriendRequestStatus = "PENDING" | "ACCEPTED" | "DECLINED" | "CANCELLED"

export type WagerStatus =
	| "PENDING"
	| "ACTIVE"
	| "COMPLETED"
	| "DECLINED"
	| "CANCELLED"
	| "EXPIRED"

export type WagerTaskType =
	| "ALL_PAYMENTS_ON_TIME"
	| "NO_MISSED_PAYMENTS"
	| "MAINTAIN_PAYMENT_STREAK"

export type WagerOutcome = "WON" | "LOST" | "DRAW"

export type LeaderboardMetric="xp"|"coins"|"streak"

export type RequestDirection = "incoming" | "outgoing"

//FriendSummary, used by GET /friends and GET /friends/:friendId.
//deliberately has no email, no obligations and no raw numeric score.
export interface FriendSummary {
	friendshipId: string
	friendId: string
	displayName: string
	avatarUrl: string | null
	scoreTier: ScoreTier
	currentPaymentStreak: number
	badgeCount: number
}

//UserSearchResult, never includes email, even though search matches on it.
export interface UserSearchResult {
	id: string
	displayName: string
	avatarUrl: string | null
}

//FriendRequestSummary
export interface FriendRequestSummary {
	id: string
	senderId: string
	senderDisplayName: string
	receiverId: string
	receiverDisplayName: string
	status: FriendRequestStatus
	createdAt: string
	respondedAt: string | null
}

//the smaller shape returned when a request is created or its status changes
export interface FriendRequestStatusResult {
	id: string
	senderId?: string
	receiverId?: string
	status: FriendRequestStatus
	createdAt?: string
	respondedAt?: string | null
}

//accept returns the request plus the new friend inline, so the caller does
//not need a follow up GET /friends
export interface AcceptFriendRequestResult {
	request: FriendRequestStatusResult
	friendship: FriendSummary
}

export interface RemoveFriendResult {
	friendId: string
	removed: boolean
}

//LeaderboardEntry. value is total XP for metric=xp, current coin balance for
//metric=coins, or current payment streak for metric=streak.
export interface LeaderboardEntry {
	rank: number
	userId: string
	displayName: string
	avatarUrl: string | null
	isSelf: boolean
	value: number
}

export interface LeaderboardPagination{
	page:number
	pageSize:number
	totalEntries:number
	totalPages:number
}

export interface LeaderboardResult{
	entries:LeaderboardEntry[]
	pagination:LeaderboardPagination
}

//WagerSummary
export interface WagerSummary {
	id: string
	creatorId: string
	creatorDisplayName: string
	opponentId: string
	opponentDisplayName: string
	taskType: WagerTaskType
	stakeAmount: number
	status: WagerStatus
	durationDays: number
	invitedAt: string
	respondedAt: string | null
	startDate: string | null
	endDate: string | null
	resolvedAt: string | null
	creatorOutcome: WagerOutcome | null
	opponentOutcome: WagerOutcome | null
	isCreator: boolean
}

//request body for POST /wagers
export interface CreateWagerRequest {
	opponentId: string
	taskType: WagerTaskType
	stakeAmount: number
	durationDays: number
}

//accept returns the caller's new coin balance inline
export interface AcceptWagerResult {
	id: string
	status: WagerStatus
	respondedAt: string
	startDate: string
	endDate: string
	coinBalance: number
}


export interface WagerStatusResult {
	id: string
	status: WagerStatus
}


export const SCORE_TIER_LABELS: Record<ScoreTier, string> = {
	BUILDING: "Building",
	FAIR: "Fair",
	GOOD: "Good",
	EXCELLENT: "Excellent",
	ELITE: "Elite",
}

export const WAGER_TASK_LABELS: Record<WagerTaskType, string> = {
	ALL_PAYMENTS_ON_TIME: "All payments on time",
	NO_MISSED_PAYMENTS: "No missed payments",
	MAINTAIN_PAYMENT_STREAK: "Maintain payment streak",
}

export const WAGER_TASK_DESCRIPTIONS: Record<WagerTaskType, string> = {
	ALL_PAYMENTS_ON_TIME:
		"Every payment due in the window has to be paid on time. Late counts as a loss.",
	NO_MISSED_PAYMENTS:
		"Nothing due in the window may be missed. Paying late is still allowed.",
	MAINTAIN_PAYMENT_STREAK:
		"Your payment streak must not drop below where it was when the wager started.",
}

export function initialsFromName(displayName: string) {
	const parts = displayName.trim().split(/\s+/).filter(Boolean)
	if (parts.length === 0) {
		return "?"
	}
	if (parts.length === 1) {
		return parts[0].slice(0, 2).toUpperCase()
	}
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

//days left on an ACTIVE wager, from endDate. null when there is no window yet:
//a PENDING invite has no start/end date by design 
export function daysRemaining(endDate: string | null) {
	if (!endDate) {
		return null
	}
	const end = new Date(endDate).getTime()
	if (Number.isNaN(end)) {
		return null
	}
	const diff = end - Date.now()
	if (diff <= 0) {
		return 0
	}
	return Math.ceil(diff / (1000 * 60 * 60 * 24))
}