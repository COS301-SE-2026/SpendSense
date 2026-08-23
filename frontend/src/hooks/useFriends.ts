import { useCallback, useEffect, useRef, useState } from 'react'
import {
	getFriend,
	getFriendRequests,
	getFriends,
	getFriendsLeaderboard,
	searchUsers,
} from '@/features/friends/friendsApi'
import type {
	FriendRequestSummary,
	FriendSummary,
	LeaderboardEntry,
	LeaderboardMetric,
	LeaderboardPagination,
	RequestDirection,
	UserSearchResult,
} from '@/features/friends/friendsTypes'

//data hooks for the friends pages. same shape as useQuizTopicDetail

export function isAbortError(error: unknown) {
	return error instanceof Error && error.name === 'AbortError'
}

export function getErrorMessage(error: unknown, fallback: string) {
	if (error instanceof Error && error.message) {
		return error.message
	}
	return fallback
}

export function getStatusCode(error: unknown): number | undefined {
	if (typeof error === 'object' && error !== null && 'statusCode' in error) {
		const code = (error as { statusCode?: unknown }).statusCode
		return typeof code === 'number' ? code : undefined
	}
	return undefined
}

// GET /friends
export function useFriends() {
	const [friends, setFriends] = useState<FriendSummary[] | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const requestId = useRef(0)

	const load = useCallback(async (signal?: AbortSignal) => {
		const id = requestId.current + 1
		requestId.current = id
		setIsLoading(true)
		setError(null)
		try {
			const loaded = await getFriends({ signal })
			if (id !== requestId.current) {
				return
			}
			setFriends(loaded)
		} catch (err) {
			if (isAbortError(err)) {
				return
			}
			if (id === requestId.current) {
				setError(getErrorMessage(err, 'Failed to load your friends.'))
			}
		} finally {
			if (id === requestId.current) {
				setIsLoading(false)
			}
		}
	}, [])

	useEffect(() => {
		const controller = new AbortController()
		void Promise.resolve().then(() => {
			load(controller.signal)
		})
		return () => {
			controller.abort()
		}
	}, [load])

	return { friends, isLoading, error, reload: () => load() }
}

// GET /friends/:friendId
export function useFriendProfile(friendId: string | undefined) {
	const [friend, setFriend] = useState<FriendSummary | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [notFound, setNotFound] = useState(false)
	const requestId = useRef(0)

	const load = useCallback(
		async (signal?: AbortSignal) => {
			if (!friendId) {
				setFriend(null)
				setNotFound(true)
				setIsLoading(false)
				return
			}
			const id = requestId.current + 1
			requestId.current = id
			setIsLoading(true)
			setError(null)
			setNotFound(false)
			try {
				const loaded = await getFriend(friendId, { signal })
				if (id !== requestId.current) {
					return
				}
				setFriend(loaded)
			} catch (err) {
				if (isAbortError(err)) {
					return
				}
				if (id !== requestId.current) {
					return
				}
				//404 here means "not currently your friend", which is a normal
				//state to render, not an error banner
				if (getStatusCode(err) === 404) {
					setNotFound(true)
					setFriend(null)
				} else {
					setError(getErrorMessage(err, 'Failed to load this profile.'))
				}
			} finally {
				if (id === requestId.current) {
					setIsLoading(false)
				}
			}
		},
		[friendId],
	)

	useEffect(() => {
		const controller = new AbortController()
		void Promise.resolve().then(() => {
			load(controller.signal)
		})
		return () => {
			controller.abort()
		}
	}, [load])

	return { friend, isLoading, error, notFound, reload: () => load() }
}

// GET /friends/requests?direction=
export function useFriendRequests(direction: RequestDirection = 'incoming') {
	const [requests, setRequests] = useState<FriendRequestSummary[] | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const requestId = useRef(0)

	const load = useCallback(
		async (signal?: AbortSignal) => {
			const id = requestId.current + 1
			requestId.current = id
			setIsLoading(true)
			setError(null)
			try {
				const loaded = await getFriendRequests(direction, { signal })
				if (id !== requestId.current) {
					return
				}
				setRequests(loaded)
			} catch (err) {
				if (isAbortError(err)) {
					return
				}
				if (id === requestId.current) {
					setError(getErrorMessage(err, 'Failed to load friend requests.'))
				}
			} finally {
				if (id === requestId.current) {
					setIsLoading(false)
				}
			}
		},
		[direction],
	)

	useEffect(() => {
		const controller = new AbortController()
		void Promise.resolve().then(() => {
			load(controller.signal)
		})
		return () => {
			controller.abort()
		}
	}, [load])


	const removeLocally = useCallback((id: string) => {
		setRequests((current) => (current ? current.filter((r) => r.id !== id) : current))
	}, [])

	return { requests, isLoading, error, reload: () => load(), removeLocally }
}

// GET /friends/search?query=
//the contract rejects queries under 2 chars with a 400, so this stays idle
//until the trimmed query is long enough, and debounces to avoid a call per key
export function useFriendSearch(query: string, debounceMs = 350) {
	const [results, setResults] = useState<UserSearchResult[] | null>(null)
	const [error, setError] = useState<string | null>(null)
	
	const [settledQuery, setSettledQuery] = useState<string | null>(null)
	const requestId = useRef(0)

	const trimmed = query.trim()
	const tooShort = trimmed.length < 2

	useEffect(() => {
		if (tooShort) {
			return
		}

		const controller = new AbortController()
		const id = requestId.current + 1
		requestId.current = id

		const timer = setTimeout(() => {
			searchUsers(trimmed, { signal: controller.signal })
				.then((loaded) => {
					if (id !== requestId.current) {
						return
					}
					setResults(loaded)
					setError(null)
					setSettledQuery(trimmed)
				})
				.catch((err: unknown) => {
					if (isAbortError(err) || id !== requestId.current) {
						return
					}
					setError(getErrorMessage(err, 'Search failed. Try again.'))
					setResults(null)
					setSettledQuery(trimmed)
				})
		}, debounceMs)

		return () => {
			clearTimeout(timer)
			controller.abort()
		}
	}, [trimmed, tooShort, debounceMs])

	//everything below is derived, so a stale result from a previous query is
	//never shown next to a newer one
	const isLoading = !tooShort && trimmed !== settledQuery
	return {
		results: tooShort || isLoading ? null : results,
		isLoading,
		error: tooShort || isLoading ? null : error,
		tooShort,
	}
}

// GET /friends/leaderboard?metric=
export function useFriendsLeaderboard(metric:LeaderboardMetric='xp',page=1){
	const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null)
	const [pagination,setPagination]=useState<LeaderboardPagination|null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const requestId = useRef(0)

	const load = useCallback(
		async (signal?: AbortSignal) => {
			const id = requestId.current + 1
			requestId.current = id
			setIsLoading(true)
			setError(null)
			try {
				const loaded=await getFriendsLeaderboard(metric,page,{signal})
				if (id !== requestId.current) {
					return
				}
				setEntries(loaded.entries)
				setPagination(loaded.pagination)
			} catch (err) {
				if (isAbortError(err)) {
					return
				}
				if (id === requestId.current) {
					setError(getErrorMessage(err, 'Failed to load the leaderboard.'))
				}
			} finally {
				if (id === requestId.current) {
					setIsLoading(false)
				}
			}
		},
		[metric,page],
	)

	useEffect(() => {
		const controller = new AbortController()
		void Promise.resolve().then(() => {
			load(controller.signal)
		})
		return () => {
			controller.abort()
		}
	}, [load])

	return {entries,pagination,isLoading,error,reload:()=>load()}
}