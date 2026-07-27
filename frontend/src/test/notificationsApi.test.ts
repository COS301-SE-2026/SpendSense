import {beforeEach,describe,expect,it,vi} from 'vitest'
import {getNotifications,markAsRead} from '../features/notifications/notificationsApi'

const {apiFetchMock}=vi.hoisted(()=>({
    apiFetchMock:vi.fn(),
}))

vi.mock('../lib/api',()=>({
    apiFetch:apiFetchMock,
}))

describe('notificationsApi',()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
        apiFetchMock.mockResolvedValue({
            data:{
                notifications:[],
                pagination:{
                    page:1,
                    perPage:20,
                    total:0,
                    totalPages:0,
                },
            },
        })
    })
    it('gets notifications without filters',async()=>{
        await getNotifications()
        expect(apiFetchMock).toHaveBeenCalledWith('/notifications',{
            signal:undefined,
        })
    })
    it('sends notification filters to the API',async()=>{
        await getNotifications({
            unreadOnly:true,
            type:'SCORE_CHANGE',
            page:2,
            perPage:10,
        })
        expect(apiFetchMock).toHaveBeenCalledWith(
            '/notifications?unreadOnly=true&type=SCORE_CHANGE&page=2&perPage=10',{
                signal:undefined,
            },
        )
    })
    it('sends unreadOnly false when it is explicitly selected',async()=>{
        await getNotifications({unreadOnly:false})
        expect(apiFetchMock).toHaveBeenCalledWith(
            '/notifications?unreadOnly=false',{
                signal:undefined,
            },
        )
    })
    it('passes the abort signal to the notification request',async()=>{
        const controller=new AbortController()
        await getNotifications({
            page:1,
            perPage:20,
        },controller.signal)
        expect(apiFetchMock).toHaveBeenCalledWith(
            '/notifications?page=1&perPage=20',{
                signal:controller.signal,
            },
        )
    })
    it('marks a notification as read',async()=>{
        apiFetchMock.mockResolvedValue({
            data:{
                id:'notification-1',
                type:'REMINDER',
                title:'Payment reminder',
                message:'Your payment is due soon.',
                sourceType:null,
                sourceId:null,
                readAt:'2026-07-26T12:00:00.000Z',
                createdAt:'2026-07-26T10:00:00.000Z',
            },
        })
        await markAsRead('notification-1')
        expect(apiFetchMock).toHaveBeenCalledWith(
            '/notifications/notification-1/read',{
                method:'PATCH',
                signal:undefined,
            },
        )
    })
})