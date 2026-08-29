import { useCallback, useEffect, useRef, useState } from 'react'
import {
	acceptWager,
	cancelWager,
	createWager,
	declineWager,
	getWager,
	getWagers,
} from '@/features/friends/wagersApi'
import { daysRemaining } from '@/features/friends/friendsTypes'
import type {
	AcceptWagerResult,
	CreateWagerRequest,
	WagerStatus,
	WagerStatusResult,
	WagerSummary,
} from '@/features/friends/friendsTypes'
import { invalidateSocial,subscribeSocialInvalidation } from '@/features/friends/socialInvaliation'
import { publishCoinBalance } from '@/features/gamification/coinBalance'
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

	useEffect(()=>{
		return subscribeSocialInvalidation('wagers',()=>void load())
	},[load])

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

	useEffect(()=>{
		return subscribeSocialInvalidation('wagers',()=>void load())
	},[load])

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

export function useCreateWager(){
	const [isPending,setIsPending]=useState(false)
	const [error,setError]=useState<string|null>(null)

	const create=useCallback(async(request:CreateWagerRequest):Promise<WagerSummary>=>{
		setIsPending(true)
		setError(null)
		try{
			const result=await createWager(request)
			invalidateSocial('wagers')
			return result
		}catch(err){
			setError(getErrorMessage(err,'Failed to create challenge.'))
			throw err
		}finally{
			setIsPending(false)
		}
	},[])

	return {create,isPending,error}
}

export function useAcceptWager(){
	const [isPending,setIsPending]=useState(false)
	const [error,setError]=useState<string|null>(null)

	const accept=useCallback(async(wagerId:string):Promise<AcceptWagerResult>=>{
		setIsPending(true)
		setError(null)
		try{
			const result=await acceptWager(wagerId)
			publishCoinBalance(result.coinBalance)
			invalidateSocial('wagers','leaderboard')
			return result
		}catch(err){
			setError(getErrorMessage(err,'Failed to accept challenge.'))
			throw err
		}finally{
			setIsPending(false)
		}
	},[])

	return {accept,isPending,error}
}

export function useDeclineWager(){
	const [isPending,setIsPending]=useState(false)
	const [error,setError]=useState<string|null>(null)

	const decline=useCallback(async(wagerId:string):Promise<WagerStatusResult>=>{
		setIsPending(true)
		setError(null)
		try{
			const result=await declineWager(wagerId)
			invalidateSocial('wagers')
			return result
		}catch(err){
			setError(getErrorMessage(err,'Failed to decline challenge.'))
			throw err
		}finally{
			setIsPending(false)
		}
	},[])

	return {decline,isPending,error}
}

export function useCancelWager(){
	const [isPending,setIsPending]=useState(false)
	const [error,setError]=useState<string|null>(null)

	const cancel=useCallback(async(wagerId:string):Promise<WagerStatusResult>=>{
		setIsPending(true)
		setError(null)
		try{
			const result=await cancelWager(wagerId)
			invalidateSocial('wagers')
			return result
		}catch(err){
			setError(getErrorMessage(err,'Failed to cancel challenge.'))
			throw err
		}finally{
			setIsPending(false)
		}
	},[])

	return {cancel,isPending,error}
}