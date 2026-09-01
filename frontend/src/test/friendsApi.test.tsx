import {describe,it,expect,vi,beforeEach} from 'vitest'
import {apiDataFetch} from '../lib/api'
import {acceptFriendRequest,cancelFriendRequest,declineFriendRequest,getFriend,getFriendRequests,getFriends,getFriendsLeaderboard,removeFriend,searchUsers,sendFriendRequest} from '../features/friends/friendsApi'

vi.mock('../lib/api',()=>({
	apiDataFetch:vi.fn(),
}))

const mockedApiDataFetch=vi.mocked(apiDataFetch)

beforeEach(()=>{
	mockedApiDataFetch.mockReset()
})

describe('getFriends',()=>{
	it('GETs /friends and returns the unwrapped data from apiDataFetch',async()=>{
		const payload=[{
			friendshipId:'friendship_1',
			friendId:'user_2',
			displayName:'Morgan',
			avatarUrl:null,
			scoreTier:'GOOD',
			currentPaymentStreak:5,
			badgeCount:3,
		}]
		mockedApiDataFetch.mockResolvedValue(payload)
		const result=await getFriends()
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/friends',
			expect.objectContaining({method:'GET'}),
		)
		expect(result).toEqual(payload)
	})
	it('forwards an AbortSignal when provided',async()=>{
		mockedApiDataFetch.mockResolvedValue([])
		const controller=new AbortController()
		await getFriends({signal:controller.signal})
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/friends',
			expect.objectContaining({signal:controller.signal}),
		)
	})
	it('propagates errors without swallowing them',async()=>{
		mockedApiDataFetch.mockRejectedValue(new Error('401'))
		await expect(getFriends()).rejects.toThrow('401')
	})
})

describe('getFriend and removeFriend',()=>{
	it('GETs an encoded friend id',async()=>{
		const payload={
			friendshipId:'friendship_1',
			friendId:'friend/123',
			displayName:'Morgan',
			avatarUrl:null,
			scoreTier:'GOOD',
			currentPaymentStreak:5,
			badgeCount:3,
		}
		mockedApiDataFetch.mockResolvedValue(payload)
		const result=await getFriend('friend/123')
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/friends/friend%2F123',
			expect.objectContaining({method:'GET'}),
		)
		expect(result).toEqual(payload)
	})

	it('DELETEs an encoded friend id',async()=>{
		const payload={friendId:'friend/123',removed:true}
		mockedApiDataFetch.mockResolvedValue(payload)
		const result=await removeFriend('friend/123')
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/friends/friend%2F123',
			expect.objectContaining({method:'DELETE'}),
		)
		expect(result).toEqual(payload)
	})
})

describe('searchUsers',()=>{
	it('GETs /friends/search with an encoded query',async()=>{
		const payload=[{
			id:'user_2',
			displayName:'Morgan Smith',
			avatarUrl:null,
		}]
		mockedApiDataFetch.mockResolvedValue(payload)
		const result=await searchUsers('Morgan Smith+')
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/friends/search?query=Morgan%20Smith%2B',
			expect.objectContaining({method:'GET'}),
		)
		expect(result).toEqual(payload)
	})
})

describe('getFriendRequests',()=>{
	it('defaults to incoming requests',async()=>{
		mockedApiDataFetch.mockResolvedValue([])
		await getFriendRequests()
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/friends/requests?direction=incoming',
			expect.objectContaining({method:'GET'}),
		)
	})
	it('sends outgoing when requested',async()=>{
		mockedApiDataFetch.mockResolvedValue([])
		await getFriendRequests('outgoing')
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/friends/requests?direction=outgoing',
			expect.objectContaining({method:'GET'}),
		)
	})
})

describe('friend request mutations',()=>{
	it('POSTs a friend request with receiverId in the body',async()=>{
		const payload={
			id:'request_1',
			receiverId:'user_2',
			status:'PENDING',
		}
		mockedApiDataFetch.mockResolvedValue(payload)
		const result=await sendFriendRequest('user_2')
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/friends/requests',
			expect.objectContaining({
				method:'POST',
				body:JSON.stringify({receiverId:'user_2'}),
			}),
		)
		expect(result).toEqual(payload)
	})
	it('PATCHes the accept endpoint',async()=>{
		const payload={
			request:{id:'request_1',status:'ACCEPTED'},
			friendship:{
				friendshipId:'friendship_1',
				friendId:'user_2',
				displayName:'Morgan',
				avatarUrl:null,
				scoreTier:'GOOD',
				currentPaymentStreak:5,
				badgeCount:3,
			},
		}
		mockedApiDataFetch.mockResolvedValue(payload)
		const result=await acceptFriendRequest('request/1')
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/friends/requests/request%2F1/accept',
			expect.objectContaining({method:'PATCH'}),
		)
		expect(result).toEqual(payload)
	})
	it('PATCHes the decline endpoint',async()=>{
		const payload={id:'request_1',status:'DECLINED'}
		mockedApiDataFetch.mockResolvedValue(payload)
		const result=await declineFriendRequest('request_1')
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/friends/requests/request_1/decline',
			expect.objectContaining({method:'PATCH'}),
		)
		expect(result).toEqual(payload)
	})
	it('DELETEs an outgoing request when cancelling',async()=>{
		const payload={id:'request_1',status:'CANCELLED'}
		mockedApiDataFetch.mockResolvedValue(payload)
		const result=await cancelFriendRequest('request_1')
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/friends/requests/request_1',
			expect.objectContaining({method:'DELETE'}),
		)
		expect(result).toEqual(payload)
	})
})

describe('getFriendsLeaderboard',()=>{
	it('defaults to xp metric and page 1',async()=>{
		const payload={
			entries:[],
			pagination:{
				page:1,
				pageSize:20,
				totalEntries:0,
				totalPages:0,
			},
		}
		mockedApiDataFetch.mockResolvedValue(payload)
		const result=await getFriendsLeaderboard()
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/friends/leaderboard?metric=xp&page=1',
			expect.objectContaining({method:'GET'}),
		)
		expect(result).toEqual(payload)
	})
	it('sends the selected metric and page',async()=>{
		const payload={
			entries:[{
				rank:41,
				userId:'user_1',
				displayName:'David',
				avatarUrl:null,
				isSelf:true,
				value:500,
			}],
			pagination:{
				page:3,
				pageSize:20,
				totalEntries:42,
				totalPages:3,
			},
		}
		mockedApiDataFetch.mockResolvedValue(payload)
		const result=await getFriendsLeaderboard('coins',3)
		expect(mockedApiDataFetch).toHaveBeenCalledWith(
			'/friends/leaderboard?metric=coins&page=3',
			expect.objectContaining({method:'GET'}),
		)
		expect(result).toEqual(payload)
	})
})