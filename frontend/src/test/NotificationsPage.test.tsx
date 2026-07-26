import React from 'react'
import {act,render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {MemoryRouter,Route,Routes} from 'react-router-dom'
import {beforeEach,describe,expect,it,vi} from 'vitest'
import '@testing-library/jest-dom'
import NotificationsPage from '../domains/NotificationsPage'
import {NotificationsProvider} from '../features/notifications/NotificationsContext'
import {getNotifications,markAsRead} from '../features/notifications/notificationsApi'
import type {Notification,NotificationFilters,NotificationPagination,NotificationResponse,NotificationsResponse} from '../types/NotificationTypes'

vi.mock('../features/notifications/notificationsApi',()=>({
    getNotifications:vi.fn(),
    markAsRead:vi.fn(),
}))

const unreadScoreNotification:Notification={
    id:'notification-score-1',
    type:'SCORE_CHANGE',
    title:'Score improved',
    message:'Your financial health score increased.',
    sourceType:'SCORE_EVENT',
    sourceId:'score-event-1',
    readAt:null,
    createdAt:'2026-07-26T10:00:00.000Z',
}

const readReminderNotification:Notification={
    id:'notification-reminder-1',
    type:'REMINDER',
    title:'Payment reminder',
    message:'Your subscription payment is due soon.',
    sourceType:'REMINDER',
    sourceId:'reminder-1',
    readAt:'2026-07-26T11:00:00.000Z',
    createdAt:'2026-07-26T09:00:00.000Z',
}

const rewardNotification:Notification={
    id:'notification-reward-1',
    type:'REWARD',
    title:'Reward earned',
    message:'You earned 10 coins and 5 XP.',
    sourceType:'QUIZ',
    sourceId:'quiz-1',
    readAt:null,
    createdAt:'2026-07-26T08:00:00.000Z',
}

function createResponse(
    notifications:Notification[],
    paginationOverrides:Partial<NotificationPagination>={},
):NotificationsResponse{
    const perPage=paginationOverrides.perPage??10
    const total=paginationOverrides.total??notifications.length
    return{
        data:{
            notifications,
            pagination:{
                page:paginationOverrides.page??1,
                perPage,
                total,
                totalPages:paginationOverrides.totalPages
                    ??(total===0?0:Math.ceil(total/perPage)),
            },
        },
    }
}

function createUnreadCountResponse(total:number):NotificationsResponse{
    return createResponse([],{
        page:1,
        perPage:1,
        total,
        totalPages:total,
    })
}

function mockDefaultRequests(
    notifications:Notification[]=[
        unreadScoreNotification,
        readReminderNotification,
    ],
    unreadTotal=1,
){
    vi.mocked(getNotifications).mockImplementation(
        async(filters:NotificationFilters={})=>{
            if(filters.unreadOnly===true&&filters.perPage===1){
                return createUnreadCountResponse(unreadTotal)
            }
            return createResponse(notifications)
        },
    )
}

function renderPage(){
    return render(
        <MemoryRouter initialEntries={['/notifications']}>
            <NotificationsProvider>
                <Routes>
                    <Route
                        path="/notifications"
                        element={<NotificationsPage/>}
                    />
                    <Route
                        path="/login"
                        element={<div>Login page</div>}
                    />
                </Routes>
            </NotificationsProvider>
        </MemoryRouter>,
    )
}

describe('NotificationsPage',()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
        mockDefaultRequests()
        vi.mocked(markAsRead).mockResolvedValue({
            data:{
                ...unreadScoreNotification,
                readAt:'2026-07-26T12:00:00.000Z',
            },
        })
    })
    it('shows the loading state while notifications are loading',async()=>{
        let resolveList!:(
            response:NotificationsResponse,
        )=>void
        const pendingList=new Promise<NotificationsResponse>((resolve)=>{
            resolveList=resolve
        })
        vi.mocked(getNotifications).mockImplementation(
            (filters:NotificationFilters={})=>{
                if(filters.unreadOnly===true&&filters.perPage===1){
                    return Promise.resolve(createUnreadCountResponse(1))
                }
                return pendingList
            },
        )
        renderPage()
        expect(
            screen.getByLabelText('Loading notifications'),
        ).toBeInTheDocument()
        await act(async()=>{
            resolveList(createResponse([unreadScoreNotification]))
            await pendingList
        })
        expect(
            await screen.findByText('Score improved'),
        ).toBeInTheDocument()
    })
    it('shows an error when notifications cannot be loaded',async()=>{
        const consoleError=vi.spyOn(
            console,
            'error',
        ).mockImplementation(()=>undefined)
        vi.mocked(getNotifications).mockImplementation(
            async(filters:NotificationFilters={})=>{
                if(filters.unreadOnly===true&&filters.perPage===1){
                    return createUnreadCountResponse(1)
                }
                throw new Error('Request failed')
            },
        )
        renderPage()
        expect(
            await screen.findByText(
                'Could not load your notifications.',
            ),
        ).toBeInTheDocument()
        consoleError.mockRestore()
    })
    it('retries loading notifications after a failure',async()=>{
        const user=userEvent.setup()
        const consoleError=vi.spyOn(
            console,
            'error',
        ).mockImplementation(()=>undefined)
        let listCalls=0
        vi.mocked(getNotifications).mockImplementation(
            async(filters:NotificationFilters={})=>{
                if(filters.unreadOnly===true&&filters.perPage===1){
                    return createUnreadCountResponse(1)
                }
                listCalls+=1
                if(listCalls===1){
                    throw new Error('Request failed')
                }
                return createResponse([unreadScoreNotification])
            },
        )
        renderPage()
        await user.click(
            await screen.findByRole('button',{
                name:'Try again',
            }),
        )
        expect(
            await screen.findByText('Score improved'),
        ).toBeInTheDocument()
        expect(listCalls).toBe(2)
        consoleError.mockRestore()
    })
    it('shows the empty inbox state',async()=>{
        mockDefaultRequests([],0)
        renderPage()
        expect(
            await screen.findByText("You're caught up"),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'You do not have any notifications yet.',
            ),
        ).toBeInTheDocument()
    })
    it('shows the empty filtered-results state',async()=>{
        const user=userEvent.setup()
        vi.mocked(getNotifications).mockImplementation(
            async(filters:NotificationFilters={})=>{
                if(filters.unreadOnly===true&&filters.perPage===1){
                    return createUnreadCountResponse(1)
                }
                if(filters.unreadOnly===true){
                    return createResponse([])
                }
                return createResponse([unreadScoreNotification])
            },
        )
        renderPage()
        expect(
            await screen.findByText('Score improved'),
        ).toBeInTheDocument()
        await user.click(
            screen.getByRole('button',{
                name:'Unread only',
            }),
        )
        expect(
            await screen.findByText('No matching notifications'),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'No notifications matched the selected filters.',
            ),
        ).toBeInTheDocument()
    })
    it('renders notification titles and messages',async()=>{
        renderPage()
        expect(
            await screen.findByText('Score improved'),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Your financial health score increased.',
            ),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Payment reminder'),
        ).toBeInTheDocument()
        expect(
            screen.getByText(
                'Your subscription payment is due soon.',
            ),
        ).toBeInTheDocument()
    })
    it('visually differentiates unread and read notifications',async()=>{
        renderPage()
        const unreadButton=await screen.findByRole('button',{
            name:'Score improved, unread',
        })
        const readButton=screen.getByRole('button',{
            name:'Payment reminder',
        })
        expect(unreadButton).toHaveClass('bg-[#fbfefc]')
        expect(readButton).toHaveClass('bg-white')
    })
    it('sends unreadOnly when the unread filter is selected',async()=>{
        const user=userEvent.setup()
        renderPage()
        await screen.findByText('Score improved')
        await user.click(
            screen.getByRole('button',{
                name:'Unread only',
            }),
        )
        await waitFor(()=>{
            expect(getNotifications).toHaveBeenCalledWith(
                {
                    unreadOnly:true,
                    type:undefined,
                    page:1,
                    perPage:10,
                },
                expect.any(AbortSignal),
            )
        })
    })
    it('sends the selected notification type',async()=>{
        const user=userEvent.setup()
        renderPage()
        await screen.findByText('Score improved')

        await user.click(
            screen.getByRole('button',{
                name:'All types',
            }),
        )

        expect(
            screen.getByRole('dialog',{
                name:'Filter by notification type',
            }),
        ).toBeInTheDocument()

        await user.click(
            screen.getByRole('option',{
                name:'Score changes',
            }),
        )

        await waitFor(()=>{
            expect(getNotifications).toHaveBeenCalledWith(
                {
                    unreadOnly:undefined,
                    type:'SCORE_CHANGE',
                    page:1,
                    perPage:10,
                },
                expect.any(AbortSignal),
            )
        })

        expect(
            screen.getByRole('button',{
                name:'Score changes',
            }),
        ).toBeInTheDocument()
        expect(
            screen.queryByRole('dialog',{
                name:'Filter by notification type',
            }),
        ).not.toBeInTheDocument()
    })
    it('moves between notification pages',async()=>{
        const user=userEvent.setup()
        vi.mocked(getNotifications).mockImplementation(
            async(filters:NotificationFilters={})=>{
                if(filters.unreadOnly===true&&filters.perPage===1){
                    return createUnreadCountResponse(2)
                }
                if(filters.page===2){
                    return createResponse(
                        [rewardNotification],
                        {
                            page:2,
                            perPage:10,
                            total:11,
                            totalPages:2,
                        },
                    )
                }
                return createResponse(
                    [unreadScoreNotification],
                    {
                        page:1,
                        perPage:10,
                        total:11,
                        totalPages:2,
                    },
                )
            },
        )
        renderPage()
        expect(
            await screen.findByText('Score improved'),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Page 1 of 2'),
        ).toBeInTheDocument()
        await user.click(
            screen.getByRole('button',{
                name:'Next',
            }),
        )
        expect(
            await screen.findByText('Reward earned'),
        ).toBeInTheDocument()
        expect(
            screen.getByText('Page 2 of 2'),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button',{
                name:'Previous',
            }),
        ).toBeEnabled()
        expect(
            screen.getByRole('button',{
                name:'Next',
            }),
        ).toBeDisabled()
    })
    it('resets the page to one when a filter changes',async()=>{
        const user=userEvent.setup()
        vi.mocked(getNotifications).mockImplementation(
            async(filters:NotificationFilters={})=>{
                if(filters.unreadOnly===true&&filters.perPage===1){
                    return createUnreadCountResponse(2)
                }
                if(filters.type==='REWARD'){
                    return createResponse(
                        [rewardNotification],
                        {
                            page:1,
                            perPage:10,
                            total:1,
                            totalPages:1,
                        },
                    )
                }
                if(filters.page===2){
                    return createResponse(
                        [readReminderNotification],
                        {
                            page:2,
                            perPage:10,
                            total:11,
                            totalPages:2,
                        },
                    )
                }
                return createResponse(
                    [unreadScoreNotification],
                    {
                        page:1,
                        perPage:10,
                        total:11,
                        totalPages:2,
                    },
                )
            },
        )
        renderPage()
        await screen.findByText('Score improved')
        await user.click(
            screen.getByRole('button',{
                name:'Next',
            }),
        )
        expect(await screen.findByText('Page 2 of 2')).toBeInTheDocument()
        await user.click(
            screen.getByRole('button',{
                name:'All types',
            }),
        )
        await user.click(
            screen.getByRole('option',{
                name:'Rewards',
            }),
        )
        expect(await screen.findByText('Reward earned')).toBeInTheDocument()
        await waitFor(()=>{
            expect(getNotifications).toHaveBeenCalledWith({
                    unreadOnly:undefined,
                    type:'REWARD',
                    page:1,
                    perPage:10,
                },
                expect.any(AbortSignal),
            )
        })
    })
    it('marks a notification as read and updates the unread count',async()=>{
        const user=userEvent.setup()
        mockDefaultRequests([
            unreadScoreNotification,
            readReminderNotification,
        ],2)
        renderPage()
        expect(
            await screen.findByText('2 unread notifications'),
        ).toBeInTheDocument()
        await user.click(
            screen.getByRole('button',{
                name:'Score improved, unread',
            }),
        )
        await waitFor(()=>{
            expect(markAsRead).toHaveBeenCalledWith(
                'notification-score-1',
            )
        })
        expect(
            await screen.findByText('1 unread notification'),
        ).toBeInTheDocument()
        expect(
            screen.getByRole('button',{
                name:'Score improved',
            }),
        ).toHaveClass('bg-white')
    })
    it('prevents repeated read actions while the request is pending',async()=>{
        const user=userEvent.setup()
        let resolveMark!:(
            response:NotificationResponse,
        )=>void
        const pendingMark=new Promise<NotificationResponse>((resolve)=>{
            resolveMark=resolve
        })
        vi.mocked(markAsRead).mockReturnValue(pendingMark)
        renderPage()
        const notificationButton=
            await screen.findByRole('button',{
                name:'Score improved, unread',
            })
        await user.click(notificationButton)
        expect(notificationButton).toBeDisabled()
        expect(
            screen.getByText('Updating...'),
        ).toBeInTheDocument()
        await act(async()=>{
            resolveMark({
                data:{
                    ...unreadScoreNotification,
                    readAt:'2026-07-26T12:00:00.000Z',
                },
            })
            await pendingMark
        })
        expect(
            screen.getByRole('button',{
                name:'Score improved',
            }),
        ).toBeEnabled()
    })
    it('removes a read notification when unread-only is active',async()=>{
        const user=userEvent.setup()
        vi.mocked(getNotifications).mockImplementation(
            async(filters:NotificationFilters={})=>{
                if(filters.unreadOnly===true&&filters.perPage===1){
                    return createUnreadCountResponse(1)
                }
                return createResponse([unreadScoreNotification])
            },
        )
        renderPage()
        await screen.findByText('Score improved')
        await user.click(
            screen.getByRole('button',{
                name:'Unread only',
            }),
        )
        await waitFor(()=>{
            expect(getNotifications).toHaveBeenCalledWith(
                {
                    unreadOnly:true,
                    type:undefined,
                    page:1,
                    perPage:10,
                },
                expect.any(AbortSignal),
            )
        })
        await user.click(
            screen.getByRole('button',{
                name:'Score improved, unread',
            }),
        )
        expect(
            await screen.findByText('No matching notifications'),
        ).toBeInTheDocument()
    })
    it('does not show a notification as read when marking it fails',async()=>{
        const user=userEvent.setup()
        const consoleError=vi.spyOn(
            console,
            'error',
        ).mockImplementation(()=>undefined)
        vi.mocked(markAsRead).mockRejectedValue(
            new Error('Request failed'),
        )
        renderPage()
        await user.click(
            await screen.findByRole('button',{name:'Score improved, unread'}),
        )
        expect(
            await screen.findByRole('alert'),
        ).toHaveTextContent('Could not mark the notification as read. Please try again.')
        expect(
            screen.getByRole('button',{
                name:'Score improved, unread',
            }),
        ).toBeInTheDocument()
        expect(
            screen.getByText('1 unread notification'),
        ).toBeInTheDocument()
        consoleError.mockRestore()
    })
    it('navigates to login when notification loading returns 401',async()=>{
        vi.mocked(getNotifications).mockImplementation(
            async(filters:NotificationFilters={})=>{
                if(filters.unreadOnly===true&&filters.perPage===1){
                    return createUnreadCountResponse(1)
                }
                throw Object.assign(
                    new Error('Unauthorized'),{statusCode:401}
                )
            },
        )
        renderPage()
        expect(await screen.findByText('Login page')).toBeInTheDocument()
    })
    it("hides pagination when there is only one page",async()=>{
        renderPage()
        await screen.findByText("Score improved")
        expect(
            screen.queryByText("Page 1 of 1"),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole("button",{
                name:"Previous",
            }),
        ).not.toBeInTheDocument()
        expect(
            screen.queryByRole("button",{
                name:"Next",
            }),
        ).not.toBeInTheDocument()
    })
})