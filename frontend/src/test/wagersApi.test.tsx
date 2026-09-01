import {describe,it,expect,vi,beforeEach} from 'vitest'
import {apiDataFetch} from '../lib/api'
import {acceptWager,cancelWager,createWager,declineWager,getWager,getWagers} from '../features/friends/wagersApi'

vi.mock('../lib/api',()=>({
	apiDataFetch:vi.fn(),
}))

const mockedApiDataFetch=vi.mocked(apiDataFetch)

const wager={
	id:'wager_1',
	creatorId:'user_1',
	creatorDisplayName:'David',
	opponentId:'user_2',
	opponentDisplayName:'Morgan',
	taskType:'ALL_PAYMENTS_ON_TIME' as const,
	stakeAmount:50,
	status:'PENDING' as const,
	durationDays:7,
	invitedAt:'2026-08-25T10:00:00.000Z',
	respondedAt:null,
	startDate:null,
	endDate:null,
	resolvedAt:null,
	creatorOutcome:null,
	opponentOutcome:null,
	isCreator:true,
}

beforeEach(()=>{
	mockedApiDataFetch.mockReset()
})

describe('createWager',()=>{
	it('POSTs the wager request to /wagers',async()=>{
		const request={
			opponentId:'user_2',
			taskType:'ALL_PAYMENTS_ON_TIME' as const,
			stakeAmount:50,
			durationDays:7,
		}
		mockedApiDataFetch.mockResolvedValue(wager)
		const result=await createWager(request)
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/wagers',
			expect.objectContaining({
				method:'POST',
				body:JSON.stringify(request),
			}),
		)
		expect(result).toEqual(wager)
	})
	it('forwards an AbortSignal',async()=>{
		mockedApiDataFetch.mockResolvedValue(wager)
		const controller=new AbortController()
		await createWager(
			{
				opponentId:'user_2',
				taskType:'NO_MISSED_PAYMENTS',
				stakeAmount:25,
				durationDays:3,
			},
			{signal:controller.signal},
		)
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/wagers',
			expect.objectContaining({signal:controller.signal}),
		)
	})
})

describe('getWagers',()=>{
	it('GETs /wagers when no status filter is supplied',async()=>{
		mockedApiDataFetch.mockResolvedValue([wager])
		const result=await getWagers()
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/wagers',
			expect.objectContaining({method:'GET'}),
		)
		expect(result).toEqual([wager])
	})
	it('adds the status query when supplied',async()=>{
		mockedApiDataFetch.mockResolvedValue([])
		await getWagers('ACTIVE')
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/wagers?status=ACTIVE',
			expect.objectContaining({method:'GET'}),
		)
	})
})
describe('getWager',()=>{
	it('GETs an encoded wager id',async()=>{
		mockedApiDataFetch.mockResolvedValue(wager)
		const result=await getWager('wager/1')
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/wagers/wager%2F1',
			expect.objectContaining({method:'GET'}),
		)
		expect(result).toEqual(wager)
	})
})
describe('wager state mutations',()=>{
	it('PATCHes /accept and returns the new coin balance',async()=>{
		const payload={
			id:'wager_1',
			status:'ACTIVE' as const,
			respondedAt:'2026-08-25T11:00:00.000Z',
			startDate:'2026-08-25T11:00:00.000Z',
			endDate:'2026-09-01T11:00:00.000Z',
			coinBalance:450,
		}
		mockedApiDataFetch.mockResolvedValue(payload)
		const result=await acceptWager('wager_1')
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/wagers/wager_1/accept',
			expect.objectContaining({method:'PATCH'}),
		)
		expect(result).toEqual(payload)
		expect(result.coinBalance).toBe(450)
	})
	it('PATCHes /decline',async()=>{
		const payload={id:'wager_1',status:'DECLINED' as const}
		mockedApiDataFetch.mockResolvedValue(payload)
		const result=await declineWager('wager_1')
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/wagers/wager_1/decline',
			expect.objectContaining({method:'PATCH'}),
		)
		expect(result).toEqual(payload)
	})
	it('DELETEs the wager when cancelling',async()=>{
		const payload={id:'wager_1',status:'CANCELLED' as const}
		mockedApiDataFetch.mockResolvedValue(payload)
		const result=await cancelWager('wager_1')
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/wagers/wager_1',
			expect.objectContaining({method:'DELETE'}),
		)
		expect(result).toEqual(payload)
	})
	it('propagates API failures',async()=>{
		mockedApiDataFetch.mockRejectedValue(new Error('wager is no longer pending'))
		await expect(acceptWager('wager_1')).rejects.toThrow('wager is no longer pending')
	})
})