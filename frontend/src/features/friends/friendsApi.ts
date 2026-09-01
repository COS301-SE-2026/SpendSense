import { apiDataFetch } from "../../lib/api"
import type {
	AcceptFriendRequestResult,
	FriendRequestStatusResult,
	FriendRequestSummary,
	FriendSummary,
	LeaderboardMetric,
	RemoveFriendResult,
	RequestDirection,
	UserSearchResult,
	LeaderboardResult,
} from './friendsTypes'

//friendsApi: the social graph half of UC-A.
//backend is authoritative for friendship state, request status transitions and
//leaderboard ranking. the frontend never sends userId, it comes from the token.

//ENDPOINTS (API contract):
// GET    /api/v1/friends
// GET    /api/v1/friends/:friendId
// DELETE /api/v1/friends/:friendId
// GET    /api/v1/friends/search?query=
// GET    /api/v1/friends/requests?direction=incoming|outgoing
// POST   /api/v1/friends/requests
// PATCH  /api/v1/friends/requests/:id/accept
// PATCH  /api/v1/friends/requests/:id/decline
// DELETE /api/v1/friends/requests/:id
// GET    /api/v1/friends/leaderboard?metric=xp|coins|streak&page=

interface RequestOptions {
	signal?: AbortSignal
}

// GET /api/v1/friends
export async function getFriends(options?: RequestOptions): Promise<FriendSummary[]> {
	return apiDataFetch<FriendSummary[]>('/friends', {
		method: 'GET',
		signal: options?.signal,
	})
}

// GET /api/v1/friends/:friendId - 404 if not currently a friend
export async function getFriend(
	friendId: string,
	options?: RequestOptions,
): Promise<FriendSummary> {
	return apiDataFetch<FriendSummary>(
		`/friends/${encodeURIComponent(friendId)}`,
		{
			method: 'GET',
			signal: options?.signal,
		},
	)
}

// DELETE /api/v1/friends/:friendId
export async function removeFriend(
	friendId: string,
	options?: RequestOptions,
): Promise<RemoveFriendResult> {
	return apiDataFetch<RemoveFriendResult>(
		`/friends/${encodeURIComponent(friendId)}`,
		{
			method: 'DELETE',
			signal: options?.signal,
		},
	)
}

// GET /api/v1/friends/search?query=
// query must be at least 2 chars or the backend returns 400, so callers should
// not fire this for shorter input.
export async function searchUsers(
	query: string,
	options?: RequestOptions,
): Promise<UserSearchResult[]> {
	return apiDataFetch<UserSearchResult[]>(
		`/friends/search?query=${encodeURIComponent(query)}`,
		{
			method: 'GET',
			signal: options?.signal,
		},
	)
}

// GET /api/v1/friends/requests?direction= - only PENDING come back
export async function getFriendRequests(
	direction: RequestDirection = 'incoming',
	options?: RequestOptions,
): Promise<FriendRequestSummary[]> {
	return apiDataFetch<FriendRequestSummary[]>(
		`/friends/requests?direction=${direction}`,
		{
			method: 'GET',
			signal: options?.signal,
		},
	)
}

// POST /api/v1/friends/requests
export async function sendFriendRequest(
	receiverId: string,
	options?: RequestOptions,
): Promise<FriendRequestStatusResult> {
	return apiDataFetch<FriendRequestStatusResult>('/friends/requests', {
		method: 'POST',
		body: JSON.stringify({ receiverId }),
		signal: options?.signal,
	})
}

// PATCH /api/v1/friends/requests/:id/accept
// returns the new friend inline so the caller can render the row immediately
export async function acceptFriendRequest(
	requestId: string,
	options?: RequestOptions,
): Promise<AcceptFriendRequestResult> {
	return apiDataFetch<AcceptFriendRequestResult>(
		`/friends/requests/${encodeURIComponent(requestId)}/accept`,
		{
			method: 'PATCH',
			signal: options?.signal,
		},
	)
}

// PATCH /api/v1/friends/requests/:id/decline
export async function declineFriendRequest(
	requestId: string,
	options?: RequestOptions,
): Promise<FriendRequestStatusResult> {
	return apiDataFetch<FriendRequestStatusResult>(
		`/friends/requests/${encodeURIComponent(requestId)}/decline`,
		{
			method: 'PATCH',
			signal: options?.signal,
		},
	)
}

// DELETE /api/v1/friends/requests/:id - cancels our own outgoing request
export async function cancelFriendRequest(
	requestId: string,
	options?: RequestOptions,
): Promise<FriendRequestStatusResult> {
	return apiDataFetch<FriendRequestStatusResult>(
		`/friends/requests/${encodeURIComponent(requestId)}`,
		{
			method: 'DELETE',
			signal: options?.signal,
		},
	)
}

// GET /api/v1/friends/leaderboard?metric=
// always includes the caller, with isSelf true on exactly one row
export async function getFriendsLeaderboard(
	metric: LeaderboardMetric = 'xp',
	page = 1,
	options?: RequestOptions,
): Promise<LeaderboardResult> {
	return apiDataFetch<LeaderboardResult>(
		`/friends/leaderboard?metric=${metric}&page=${page}`,
		{
			method: 'GET',
			signal: options?.signal,
		},
	)
}