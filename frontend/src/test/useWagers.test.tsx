import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest'
import {renderHook,act,waitFor} from '@testing-library/react'

vi.mock('../features/friends/wagersApi',()=>({
    acceptWager:vi.fn(),
    cancelWager:vi.fn(),
    createWager:vi.fn(),
    declineWager:vi.fn(),
    getWager:vi.fn(),
    getWagers:vi.fn(),
}))

vi.mock('../features/friends/socialInvaliation',()=>({
    invalidateSocial:vi.fn(),
    subscribeSocialInvalidation:vi.fn(()=>()=>{}),
}))

vi.mock('../features/gamification/coinBalance',()=>({
    publishCoinBalance:vi.fn(),
}))

vi.mock('../hooks/useFriends',()=>({
    isAbortError:(error:unknown)=>{
        return error instanceof Error&&error.name==='AbortError'
    },
    getErrorMessage:(error:unknown,fallback:string)=>{
        if(error instanceof Error&&error.message){
            return error.message
        }
        return fallback
    },
    getStatusCode:(error:unknown)=>{
        if(typeof error==='object'&&error!==null&&'statusCode' in error){
            const code=(error as {statusCode?:unknown}).statusCode
            return typeof code==='number'?code:undefined
        }
        return undefined
    },
}))

import * as wagersApi from '../features/friends/wagersApi'
import * as socialInvalidation from '../features/friends/socialInvaliation'
import {publishCoinBalance} from '../features/gamification/coinBalance'
import {useAcceptWager,useCancelWager,useCreateWager,useDeclineWager,useWager,useWagers} from '../hooks/useWagers'
import type {WagerSummary} from '../features/friends/friendsTypes'

const mockedGetWagers=vi.mocked(wagersApi.getWagers)
const mockedGetWager=vi.mocked(wagersApi.getWager)
const mockedCreate=vi.mocked(wagersApi.createWager)
const mockedAccept=vi.mocked(wagersApi.acceptWager)
const mockedDecline=vi.mocked(wagersApi.declineWager)
const mockedCancel=vi.mocked(wagersApi.cancelWager)
const mockedInvalidate=vi.mocked(socialInvalidation.invalidateSocial)
const mockedSubscribe=vi.mocked(socialInvalidation.subscribeSocialInvalidation)
const mockedPublishCoinBalance=vi.mocked(publishCoinBalance)

function makeWager(overrides:Partial<WagerSummary>={}):WagerSummary{
	return {
		id:'wager_1',
		creatorId:'user_1',
		creatorDisplayName:'David',
		opponentId:'user_2',
		opponentDisplayName:'Morgan',
		taskType:'ALL_PAYMENTS_ON_TIME',
		stakeAmount:50,
		status:'PENDING',
		durationDays:7,
		invitedAt:'2026-08-25T10:00:00.000Z',
		respondedAt:null,
		startDate:null,
		endDate:null,
		resolvedAt:null,
		creatorOutcome:null,
		opponentOutcome:null,
		isCreator:true,
		...overrides,
	}
}

beforeEach(()=>{
	vi.clearAllMocks()
})

afterEach(()=>{
	vi.useRealTimers()
})

describe('useWagers',()=>{
	it('loads wagers using the supplied status and subscribes to invalidation',async()=>{
		const wager=makeWager({status:'ACTIVE'})
		mockedGetWagers.mockResolvedValue([wager])
		const {result}=renderHook(()=>useWagers('ACTIVE'))
		await waitFor(()=>{
			expect(result.current.isLoading).toBe(false)
		})
		expect(mockedGetWagers).toHaveBeenCalledWith(
			'ACTIVE',
			expect.objectContaining({signal:expect.any(AbortSignal)}),
		)
		expect(result.current.wagers).toEqual([wager])
		expect(result.current.error).toBeNull()
		expect(mockedSubscribe).toHaveBeenCalledWith(
			'wagers',
			expect.any(Function),
		)
	})
	it('surfaces an API error when wagers cannot be loaded',async()=>{
		mockedGetWagers.mockRejectedValue(new Error('network down'))
		const {result}=renderHook(()=>useWagers())
		await waitFor(()=>{
			expect(result.current.isLoading).toBe(false)
		})
		expect(result.current.error).toBe('network down')
	})
})

describe('useWager',()=>{
	it('loads a wager by id',async()=>{
		const wager=makeWager()
		mockedGetWager.mockResolvedValue(wager)
		const {result}=renderHook(()=>useWager('wager_1'))
		await waitFor(()=>{
			expect(result.current.isLoading).toBe(false)
		})
		expect(mockedGetWager).toHaveBeenCalledWith(
			'wager_1',
			expect.objectContaining({signal:expect.any(AbortSignal)}),
		)
		expect(result.current.wager).toEqual(wager)
		expect(result.current.notFound).toBe(false)
	})
	it('treats 403 and 404 as an unavailable wager instead of an error banner',async()=>{
		const forbidden=Object.assign(new Error('forbidden'),{statusCode:403})
		mockedGetWager.mockRejectedValue(forbidden)
		const {result}=renderHook(()=>useWager('wager_1'))
		await waitFor(()=>{
			expect(result.current.isLoading).toBe(false)
		})
		expect(result.current.notFound).toBe(true)
		expect(result.current.wager).toBeNull()
		expect(result.current.error).toBeNull()
	})
	it('polls an ended ACTIVE wager until settlement changes its status',async()=>{
		vi.useFakeTimers()
		vi.setSystemTime(new Date('2026-08-25T12:00:00.000Z'))
		const active=makeWager({
			status:'ACTIVE',
			respondedAt:'2026-08-24T10:00:00.000Z',
			startDate:'2026-08-24T10:00:00.000Z',
			endDate:'2026-08-25T11:00:00.000Z',
			isCreator:false,
		})
		const completed=makeWager({
			status:'COMPLETED',
			respondedAt:'2026-08-24T10:00:00.000Z',
			startDate:'2026-08-24T10:00:00.000Z',
			endDate:'2026-08-25T11:00:00.000Z',
			resolvedAt:'2026-08-25T12:00:00.000Z',
			creatorOutcome:'WON',
			opponentOutcome:'LOST',
			isCreator:false,
		})
		mockedGetWager
			.mockResolvedValueOnce(active)
			.mockResolvedValueOnce(completed)
		const {result}=renderHook(()=>useWager('wager_1',1000))
		await act(async()=>{
			await Promise.resolve()
			await Promise.resolve()
			await Promise.resolve()
		})
		expect(result.current.wager?.status).toBe('ACTIVE')
		expect(result.current.awaitingSettlement).toBe(true)
		await act(async()=>{
			vi.advanceTimersByTime(1000)
			await Promise.resolve()
			await Promise.resolve()
			await Promise.resolve()
		})
		expect(mockedGetWager).toHaveBeenCalledTimes(2)
		expect(result.current.wager?.status).toBe('COMPLETED')
		expect(result.current.awaitingSettlement).toBe(false)
	})
})

describe('wager mutation invalidation',()=>{
	it('creating a wager invalidates wager queries',async()=>{
		const wager=makeWager()
		mockedCreate.mockResolvedValue(wager)
		const {result}=renderHook(()=>useCreateWager())
		await act(async()=>{
			await result.current.create({
				opponentId:'user_2',
				taskType:'ALL_PAYMENTS_ON_TIME',
				stakeAmount:50,
				durationDays:7,
			})
		})
		expect(mockedCreate).toHaveBeenCalledWith({
			opponentId:'user_2',
			taskType:'ALL_PAYMENTS_ON_TIME',
			stakeAmount:50,
			durationDays:7,
		})
		expect(mockedInvalidate).toHaveBeenCalledWith('wagers')
	})
	it('accepting publishes the new coin balance and invalidates wagers and leaderboard',async()=>{
		mockedAccept.mockResolvedValue({
			id:'wager_1',
			status:'ACTIVE',
			respondedAt:'2026-08-25T12:00:00.000Z',
			startDate:'2026-08-25T12:00:00.000Z',
			endDate:'2026-09-01T12:00:00.000Z',
			coinBalance:450,
		})
		const {result}=renderHook(()=>useAcceptWager())
		await act(async()=>{
			await result.current.accept('wager_1')
		})
		expect(mockedAccept).toHaveBeenCalledWith('wager_1')
		expect(mockedPublishCoinBalance).toHaveBeenCalledWith(450)
		expect(mockedInvalidate).toHaveBeenCalledWith('wagers','leaderboard')
	})
	it('declining invalidates wager queries',async()=>{
		mockedDecline.mockResolvedValue({
			id:'wager_1',
			status:'DECLINED',
		})
		const {result}=renderHook(()=>useDeclineWager())
		await act(async()=>{
			await result.current.decline('wager_1')
		})
		expect(mockedDecline).toHaveBeenCalledWith('wager_1')
		expect(mockedInvalidate).toHaveBeenCalledWith('wagers')
	})
	it('cancelling invalidates wager queries',async()=>{
		mockedCancel.mockResolvedValue({
			id:'wager_1',
			status:'CANCELLED',
		})
		const {result}=renderHook(()=>useCancelWager())
		await act(async()=>{
			await result.current.cancel('wager_1')
		})
		expect(mockedCancel).toHaveBeenCalledWith('wager_1')
		expect(mockedInvalidate).toHaveBeenCalledWith('wagers')
	})
	it('does noti nvalidate when creating a wager fails',async()=>{
		mockedCreate.mockRejectedValue(new Error('insufficient coins'))
		const {result}=renderHook(()=>useCreateWager())
		await act(async()=>{
			await expect(
				result.current.create({
					opponentId:'user_2',
					taskType:'ALL_PAYMENTS_ON_TIME',
					stakeAmount:200,
					durationDays:7,
				}),
			).rejects.toThrow('insufficient coins')
		})
		expect(result.current.error).toBe('insufficient coins')
		expect(result.current.isPending).toBe(false)
		expect(mockedInvalidate).not.toHaveBeenCalled()
	})
})