import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest'
import {renderHook,act,waitFor} from '@testing-library/react'

vi.mock('../features/friends/friendsApi',()=>({
    acceptFriendRequest:vi.fn(),
    cancelFriendRequest:vi.fn(),
    declineFriendRequest:vi.fn(),
    getFriend:vi.fn(),
    getFriendRequests:vi.fn(),
    getFriends:vi.fn(),
    getFriendsLeaderboard:vi.fn(),
    removeFriend:vi.fn(),
    searchUsers:vi.fn(),
    sendFriendRequest:vi.fn(),
}))

vi.mock('../features/friends/socialInvaliation',()=>({
    invalidateSocial:vi.fn(),
    subscribeSocialInvalidation:vi.fn(()=>()=>{}),
}))

import * as friendsApi from '../features/friends/friendsApi'
import * as socialInvalidation from '../features/friends/socialInvaliation'
import {useAcceptFriendRequest,useCancelFriendRequest,useDeclineFriendRequest,useFriends,useFriendSearch,useRemoveFriend,useSendFriendRequest} from '../hooks/useFriends'
import type {FriendSummary,UserSearchResult} from '../features/friends/friendsTypes'

const mockedGetFriends=vi.mocked(friendsApi.getFriends)
const mockedSearchUsers=vi.mocked(friendsApi.searchUsers)
const mockedSend=vi.mocked(friendsApi.sendFriendRequest)
const mockedAccept=vi.mocked(friendsApi.acceptFriendRequest)
const mockedDecline=vi.mocked(friendsApi.declineFriendRequest)
const mockedCancel=vi.mocked(friendsApi.cancelFriendRequest)
const mockedRemove=vi.mocked(friendsApi.removeFriend)
const mockedInvalidate=vi.mocked(socialInvalidation.invalidateSocial)
const mockedSubscribe=vi.mocked(socialInvalidation.subscribeSocialInvalidation)

function deferred<T>(){
	let resolve!:(value:T)=>void
	let reject!:(reason?:unknown)=>void
	const promise=new Promise<T>((res,rej)=>{
		resolve=res
		reject=rej
	})
	return {promise,resolve,reject}
}

function makeFriend(overrides:Partial<FriendSummary>={}):FriendSummary{
	return {
		friendshipId:'friendship_1',
		friendId:'user_2',
		displayName:'Morgan',
		avatarUrl:null,
		scoreTier:'GOOD',
		currentPaymentStreak:5,
		badgeCount:3,
		...overrides,
	}
}

beforeEach(()=>{
	vi.clearAllMocks()
})

afterEach(()=>{
	vi.useRealTimers()
})

describe('useFriends',()=>{
	it('loads friends and subscribes to friend invalidation',async()=>{
		const friend=makeFriend()
		mockedGetFriends.mockResolvedValue([friend])
		const {result}=renderHook(()=>useFriends())
		await waitFor(()=>{
			expect(result.current.isLoading).toBe(false)
		})
		expect(mockedGetFriends).toHaveBeenCalledWith(
			expect.objectContaining({signal:expect.any(AbortSignal)}),
		)
		expect(result.current.friends).toEqual([friend])
		expect(result.current.error).toBeNull()
		expect(mockedSubscribe).toHaveBeenCalledWith(
			'friends',
			expect.any(Function)
		)
	})
	it('surfaces a readable error when loading friends fails',async()=>{
		mockedGetFriends.mockRejectedValue(new Error('network down'))
		const {result}=renderHook(()=>useFriends())
		await waitFor(()=>{
			expect(result.current.isLoading).toBe(false)
		})
		expect(result.current.error).toBe('network down')
	})
})

describe('useFriendSearch',()=>{
	it('does not search when the trimmed query is under two characters',()=>{
		vi.useFakeTimers()
		const {result}=renderHook(()=>useFriendSearch(' a ',350))
		act(()=>{
			vi.advanceTimersByTime(1000)
		})
		expect(mockedSearchUsers).not.toHaveBeenCalled()
		expect(result.current.tooShort).toBe(true)
		expect(result.current.isLoading).toBe(false)
		expect(result.current.results).toBeNull()
	})
	it('debounces a valid search before calling the API',async()=>{
		vi.useFakeTimers()
		const searchResult:UserSearchResult[]=[{id:'user_2',displayName:'Morgan',avatarUrl:null}]
		mockedSearchUsers.mockResolvedValue(searchResult)
		const {result}=renderHook(()=>useFriendSearch('Morgan',350))
		expect(result.current.isLoading).toBe(true)
		act(()=>{
			vi.advanceTimersByTime(349)
		})
		expect(mockedSearchUsers).not.toHaveBeenCalled()
		await act(async()=>{
			vi.advanceTimersByTime(1)
			await Promise.resolve()
			await Promise.resolve()
		})
		expect(mockedSearchUsers).toHaveBeenCalledWith(
			'Morgan',
			expect.objectContaining({signal:expect.any(AbortSignal)})
		)
		expect(result.current.results).toEqual(searchResult)
		expect(result.current.isLoading).toBe(false)
	})
	it('ignores a stale search result that resolves after a newer query',async()=>{
		vi.useFakeTimers()
		const first=deferred<UserSearchResult[]>()
		const newer:UserSearchResult[]=[
			{id:'user_3',displayName:'Rachel',avatarUrl:null},
		]
		mockedSearchUsers
			.mockReturnValueOnce(first.promise)
			.mockResolvedValueOnce(newer)
		const {result,rerender}=renderHook(
			({query})=>useFriendSearch(query,100),
			{initialProps:{query:'Morgan'}},
		)
		await act(async()=>{
			vi.advanceTimersByTime(100)
			await Promise.resolve()
		})
		rerender({query:'Rachel'})
		await act(async()=>{
			vi.advanceTimersByTime(100)
			await Promise.resolve()
			await Promise.resolve()
		})
		expect(result.current.results).toEqual(newer)
		await act(async()=>{
			first.resolve([
				{id:'user_2',displayName:'Morgan',avatarUrl:null},
			])
			await Promise.resolve()
		})
		expect(result.current.results).toEqual(newer)
	})
})

describe('friend mutation invalidation',()=>{
	it('sending a friend request invalidates friend requests',async()=>{
		mockedSend.mockResolvedValue({
			id:'request_1',
			receiverId:'user_2',
			status:'PENDING',
		})
		const {result}=renderHook(()=>useSendFriendRequest())
		await act(async()=>{
			await result.current.send('user_2')
		})
		expect(mockedSend).toHaveBeenCalledWith('user_2')
		expect(mockedInvalidate).toHaveBeenCalledWith('friendRequests')
		expect(result.current.error).toBeNull()
	})
	it('accepting a request invalidates friends,requests and leaderboard',async()=>{
		mockedAccept.mockResolvedValue({
			request:{
				id:'request_1',
				status:'ACCEPTED',
			},
			friendship:makeFriend(),
		})
		const {result}=renderHook(()=>useAcceptFriendRequest())
		await act(async()=>{
			await result.current.accept('request_1')
		})
		expect(mockedAccept).toHaveBeenCalledWith('request_1')
		expect(mockedInvalidate).toHaveBeenCalledWith('friends','friendRequests','leaderboard')
	})
	it('declining a request invalidates friend requests',async()=>{
		mockedDecline.mockResolvedValue({
			id:'request_1',
			status:'DECLINED',
		})
		const {result}=renderHook(()=>useDeclineFriendRequest())
		await act(async()=>{
			await result.current.decline('request_1')
		})
		expect(mockedDecline).toHaveBeenCalledWith('request_1')
		expect(mockedInvalidate).toHaveBeenCalledWith('friendRequests')
	})
	it('cancelling a request invalidates friend requests',async()=>{
		mockedCancel.mockResolvedValue({
			id:'request_1',
			status:'CANCELLED',
		})
		const {result}=renderHook(()=>useCancelFriendRequest())
		await act(async()=>{
			await result.current.cancel('request_1')
		})
		expect(mockedCancel).toHaveBeenCalledWith('request_1')
		expect(mockedInvalidate).toHaveBeenCalledWith('friendRequests')
	})
	it('removing a friend invalidates friends and leaderboard',async()=>{
		mockedRemove.mockResolvedValue({
			friendId:'user_2',
			removed:true,
		})
		const {result}=renderHook(()=>useRemoveFriend())
		await act(async()=>{
			await result.current.remove('user_2')
		})
		expect(mockedRemove).toHaveBeenCalledWith('user_2')
		expect(mockedInvalidate).toHaveBeenCalledWith('friends','leaderboard')
	})
	it('stores a mutation error and rethrows it to the caller',async()=>{
		mockedSend.mockRejectedValue(new Error('request already exists'))
		const {result}=renderHook(()=>useSendFriendRequest())
		await act(async()=>{
			await expect(result.current.send('user_2')).rejects.toThrow(
				'request already exists',
			)
		})
		expect(result.current.error).toBe('request already exists')
		expect(result.current.isPending).toBe(false)
		expect(mockedInvalidate).not.toHaveBeenCalled()
	})
})