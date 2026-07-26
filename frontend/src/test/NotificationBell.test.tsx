import React from 'react'
import {render,screen,waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {MemoryRouter,Route,Routes} from 'react-router-dom'
import {beforeEach,describe,expect,it,vi} from 'vitest'
import '@testing-library/jest-dom'
import {NotificationBell} from '../components/notifications/NotificationBell'
import {NotificationsProvider} from "../features/notifications/NotificationsContext"
import {useNotifications} from "../features/notifications/useNotifications"
import {getNotifications} from '../features/notifications/notificationsApi'

vi.mock('../features/notifications/notificationsApi',()=>({
    getNotifications:vi.fn(),
    markAsRead:vi.fn(),
}))

function CountController(){
    const {decreaseUnreadCount}=useNotifications()
    return(
        <button type="button" onClick={decreaseUnreadCount}>
            Decrease count
        </button>
    )
}

function renderBell(){
    return render(
        <MemoryRouter initialEntries={['/']}>
            <NotificationsProvider>
                <NotificationBell/>
                <CountController/>
                <Routes>
                    <Route path="/" element={null}/>
                    <Route path="/notifications" element={<div>Notification inbox</div>}/>
                </Routes>
            </NotificationsProvider>
        </MemoryRouter>,
    )
}

describe('NotificationBell',()=>{
    beforeEach(()=>{
        vi.clearAllMocks()
        vi.mocked(getNotifications).mockResolvedValue({
            data:{
                notifications:[],
                pagination:{
                    page:1,
                    perPage:1,
                    total:4,
                    totalPages:4,
                },
            },
        })
    })
    it('displays the unread notification count',async()=>{
        renderBell()
        expect(await screen.findByTestId('notification-count')).toHaveTextContent('4')
        expect(getNotifications).toHaveBeenCalledWith({
            unreadOnly:true,
            page:1,
            perPage:1,
        })
    })
    it('hides the unread badge when the count is zero',async()=>{
        vi.mocked(getNotifications).mockResolvedValue({
            data:{
                notifications:[],
                pagination:{
                    page:1,
                    perPage:1,
                    total:0,
                    totalPages:0,
                },
            },
        })
        renderBell()
        await waitFor(()=>{
            expect(getNotifications).toHaveBeenCalledOnce()
        })
        expect(screen.queryByTestId('notification-count')).not.toBeInTheDocument()
    })
    it('opens the notification inbox',async()=>{
        const user=userEvent.setup()
        renderBell()
        await user.click(await screen.findByRole('button',{
            name:/notifications/i,
        }))
        expect(screen.getByText('Notification inbox')).toBeInTheDocument()
    })
    it('updates when the shared unread count changes',async()=>{
        const user=userEvent.setup()
        renderBell()
        expect(await screen.findByTestId('notification-count')).toHaveTextContent('4')
        await user.click(screen.getByRole('button',{
            name:'Decrease count',
        }))
        expect(screen.getByTestId('notification-count')).toHaveTextContent('3')
    })
    it('keeps the bell available when loading the count fails',async()=>{
        const consoleError=vi.spyOn(console,'error').mockImplementation(()=>undefined)
        vi.mocked(getNotifications).mockRejectedValue(
            new Error('Request failed'),
        )
        renderBell()
        await waitFor(()=>{
            expect(getNotifications).toHaveBeenCalledOnce()
        })
        expect(screen.getByRole('button',{
            name:'Notifications',
        })).toBeInTheDocument()
        expect(screen.queryByTestId('notification-count')).not.toBeInTheDocument()
        consoleError.mockRestore()
    })
})