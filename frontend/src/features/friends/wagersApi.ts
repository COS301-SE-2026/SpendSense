import { apiFetch } from '../../lib/api'
import type {
	AcceptWagerResult,
	CreateWagerRequest,
	WagerStatus,
	WagerStatusResult,
	WagerSummary,
} from './friendsTypes'

//wagersApi: the friend to friend challenge half of UC-A.
//backend is authoritative for all wager evaluation and settlement. settlement
//is a scheduled job, not an endpoint - the frontend finds out by re-fetching
//the wager (status becomes COMPLETED) or via a WAGER_RESULT notification.

//ENDPOINTS (API contract):
// POST   /api/v1/wagers
// GET    /api/v1/wagers?status=
// GET    /api/v1/wagers/:id
// PATCH  /api/v1/wagers/:id/accept
// PATCH  /api/v1/wagers/:id/decline
// DELETE /api/v1/wagers/:id

interface Container<T> {
	data: T
}

interface RequestOptions {
	signal?: AbortSignal
}

// POST /api/v1/wagers - creation does not move any coins
export async function createWager(
	request: CreateWagerRequest,
	options?: RequestOptions,
): Promise<WagerSummary> {
	const res = await apiFetch<Container<WagerSummary>>('/wagers', {
		method: 'POST',
		body: JSON.stringify(request),
		signal: options?.signal,
	})
	return res.data
}

// GET /api/v1/wagers?status=  - omit status for all of them
export async function getWagers(
	status?: WagerStatus,
	options?: RequestOptions,
): Promise<WagerSummary[]> {
	const qs = status ? `?status=${status}` : ''
	const res = await apiFetch<Container<WagerSummary[]>>(`/wagers${qs}`, {
		method: 'GET',
		signal: options?.signal,
	})
	return res.data
}

// GET /api/v1/wagers/:id
export async function getWager(
	wagerId: string,
	options?: RequestOptions,
): Promise<WagerSummary> {
	const res = await apiFetch<Container<WagerSummary>>(
		`/wagers/${encodeURIComponent(wagerId)}`,
		{
			method: 'GET',
			signal: options?.signal,
		},
	)
	return res.data
}

// PATCH /api/v1/wagers/:id/accept
// escrows both stakes and returns the accepting caller's new coin balance
export async function acceptWager(
	wagerId: string,
	options?: RequestOptions,
): Promise<AcceptWagerResult> {
	const res = await apiFetch<Container<AcceptWagerResult>>(
		`/wagers/${encodeURIComponent(wagerId)}/accept`,
		{
			method: 'PATCH',
			signal: options?.signal,
		},
	)
	return res.data
}

// PATCH /api/v1/wagers/:id/decline - no coins ever move
export async function declineWager(
	wagerId: string,
	options?: RequestOptions,
): Promise<WagerStatusResult> {
	const res = await apiFetch<Container<WagerStatusResult>>(
		`/wagers/${encodeURIComponent(wagerId)}/decline`,
		{
			method: 'PATCH',
			signal: options?.signal,
		},
	)
	return res.data
}

// DELETE /api/v1/wagers/:id - creator cancels a still PENDING wager
export async function cancelWager(
	wagerId: string,
	options?: RequestOptions,
): Promise<WagerStatusResult> {
	const res = await apiFetch<Container<WagerStatusResult>>(
		`/wagers/${encodeURIComponent(wagerId)}`,
		{
			method: 'DELETE',
			signal: options?.signal,
		},
	)
	return res.data
}