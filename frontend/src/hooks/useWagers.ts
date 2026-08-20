import { useCallback, useEffect, useRef, useState } from 'react'
import { getWager, getWagers } from '@/features/friends/wagersApi'
import { daysRemaining } from '@/features/friends/friendsTypes'
import type { WagerStatus, WagerSummary } from '@/features/friends/friendsTypes'
import { getErrorMessage, getStatusCode, isAbortError } from '@/hooks/useFriends'

// GET /wagers?status=
export function useWagers(status?: WagerStatus) {
	const [wagers, setWagers] = useState<WagerSummary[] | null>(null)
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
				const loaded = await getWagers(status, { signal })
				if (id !== requestId.current) {
					return
				}
				setWagers(loaded)
			} catch (err) {
				if (isAbortError(err)) {
					return
				}
				if (id === requestId.current) {
					setError(getErrorMessage(err, 'Failed to load your challenges.'))
				}
			} finally {
				if (id === requestId.current) {
					setIsLoading(false)
				}
			}
		},
		[status],
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

	return { wagers, isLoading, error, reload: () => load() }
}

// GET /wagers/:id

export function useWager(wagerId: string | undefined, settlingPollMs = 30000) {
	const [wager, setWager] = useState<WagerSummary | null>(null)
	const [isLoading, setIsLoading] = useState(true)
	const [error, setError] = useState<string | null>(null)
	const [notFound, setNotFound] = useState(false)
	const requestId = useRef(0)

	const load = useCallback(
		async (signal?: AbortSignal, quiet = false) => {
			if (!wagerId) {
				setWager(null)
				setNotFound(true)
				setIsLoading(false)
				return
			}
			const id = requestId.current + 1
			requestId.current = id
			if (!quiet) {
				setIsLoading(true)
				setError(null)
			}
			try {
				const loaded = await getWager(wagerId, { signal })
				if (id !== requestId.current) {
					return
				}
				setWager(loaded)
				setNotFound(false)
			} catch (err) {
				if (isAbortError(err) || id !== requestId.current) {
					return
				}
				const status = getStatusCode(err)
				if (status === 404 || status === 403) {
					setNotFound(true)
					setWager(null)
				} else if (!quiet) {
					setError(getErrorMessage(err, 'Failed to load this challenge.'))
				}
			} finally {
				if (id === requestId.current && !quiet) {
					setIsLoading(false)
				}
			}
		},
		[wagerId],
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

	//an ACTIVE wager whose window has closed is waiting on the settlement job,
	//so poll until the backend flips it to COMPLETED
	const awaitingSettlement =
		wager?.status === 'ACTIVE' && daysRemaining(wager.endDate) === 0

	useEffect(() => {
		if (!awaitingSettlement || settlingPollMs <= 0) {
			return
		}
		const controller = new AbortController()
		const timer = setInterval(() => {
			void load(controller.signal, true)
		}, settlingPollMs)
		return () => {
			clearInterval(timer)
			controller.abort()
		}
	}, [load, awaitingSettlement, settlingPollMs])

	return { wager, isLoading, error, notFound, awaitingSettlement, reload: () => load() }
}