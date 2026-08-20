import { apiFetch } from '../../lib/api'
import type {
	AcceptFriendRequestResult,
	FriendRequestStatusResult,
	FriendRequestSummary,
	FriendSummary,
	LeaderboardEntry,
	LeaderboardMetric,
	RemoveFriendResult,
	RequestDirection,
	UserSearchResult,
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
// GET    /api/v1/friends/leaderboard?metric=score|streak

interface Container<T> {
	data: T
}

interface RequestOptions {
	signal?: AbortSignal
}

// GET /api/v1/friends
export async function getFriends(options?: RequestOptions): Promise<FriendSummary[]> {
	const res = await apiFetch<Container<FriendSummary[]>>('/friends', {
		method: 'GET',
		signal: options?.signal,
	})
	return res.data
}

// GET /api/v1/friends/:friendId - 404 if not currently a friend
export async function getFriend(
	friendId: string,
	options?: RequestOptions,
): Promise<FriendSummary> {
	const res = await apiFetch<Container<FriendSummary>>(
		`/friends/${encodeURIComponent(friendId)}`,
		{
			method: 'GET',
			signal: options?.signal,
		},
	)
	return res.data
}

// DELETE /api/v1/friends/:friendId
export async function removeFriend(
	friendId: string,
	options?: RequestOptions,
): Promise<RemoveFriendResult> {
	const res = await apiFetch<Container<RemoveFriendResult>>(
		`/friends/${encodeURIComponent(friendId)}`,
		{
			method: 'DELETE',
			signal: options?.signal,
		},
	)
	return res.data
}

// GET /api/v1/friends/search?query=
// query must be at least 2 chars or the backend returns 400, so callers should
// not fire this for shorter input.
export async function searchUsers(
	query: string,
	options?: RequestOptions,
): Promise<UserSearchResult[]> {
	const res = await apiFetch<Container<UserSearchResult[]>>(
		`/friends/search?query=${encodeURIComponent(query)}`,
		{
			method: 'GET',
			signal: options?.signal,
		},
	)
	return res.data
}

// GET /api/v1/friends/requests?direction= - only PENDING come back
export async function getFriendRequests(
	direction: RequestDirection = 'incoming',
	options?: RequestOptions,
): Promise<FriendRequestSummary[]> {
	const res = await apiFetch<Container<FriendRequestSummary[]>>(
		`/friends/requests?direction=${direction}`,
		{
			method: 'GET',
			signal: options?.signal,
		},
	)
	return res.data
}

// POST /api/v1/friends/requests
export async function sendFriendRequest(
	receiverId: string,
	options?: RequestOptions,
): Promise<FriendRequestStatusResult> {
	const res = await apiFetch<Container<FriendRequestStatusResult>>('/friends/requests', {
		method: 'POST',
		body: JSON.stringify({ receiverId }),
		signal: options?.signal,
	})
	return res.data
}

// PATCH /api/v1/friends/requests/:id/accept
// returns the new friend inline so the caller can render the row immediately
export async function acceptFriendRequest(
	requestId: string,
	options?: RequestOptions,
): Promise<AcceptFriendRequestResult> {
	const res = await apiFetch<Container<AcceptFriendRequestResult>>(
		`/friends/requests/${encodeURIComponent(requestId)}/accept`,
		{
			method: 'PATCH',
			signal: options?.signal,
		},
	)
	return res.data
}

// PATCH /api/v1/friends/requests/:id/decline
export async function declineFriendRequest(
	requestId: string,
	options?: RequestOptions,
): Promise<FriendRequestStatusResult> {
	const res = await apiFetch<Container<FriendRequestStatusResult>>(
		`/friends/requests/${encodeURIComponent(requestId)}/decline`,
		{
			method: 'PATCH',
			signal: options?.signal,
		},
	)
	return res.data
}

// DELETE /api/v1/friends/requests/:id - cancels our own outgoing request
export async function cancelFriendRequest(
	requestId: string,
	options?: RequestOptions,
): Promise<FriendRequestStatusResult> {
	const res = await apiFetch<Container<FriendRequestStatusResult>>(
		`/friends/requests/${encodeURIComponent(requestId)}`,
		{
			method: 'DELETE',
			signal: options?.signal,
		},
	)
	return res.data
}

// GET /api/v1/friends/leaderboard?metric=
// always includes the caller, with isSelf true on exactly one row
export async function getFriendsLeaderboard(
	metric: LeaderboardMetric = 'score',
	options?: RequestOptions,
): Promise<LeaderboardEntry[]> {
	const res = await apiFetch<Container<LeaderboardEntry[]>>(
		`/friends/leaderboard?metric=${metric}`,
		{
			method: 'GET',
			signal: options?.signal,
		},
	)
	return res.data
}