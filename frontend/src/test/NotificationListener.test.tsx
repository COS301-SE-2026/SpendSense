import React from "react"
import {act,cleanup,fireEvent,render,screen} from "@testing-library/react"
import {afterEach,beforeEach,describe,expect,it,vi} from "vitest"
import "@testing-library/jest-dom"
import type {Notification,NotificationsResponse} from "../types/NotificationTypes"

const mocks=vi.hoisted(()=>({
    getNotifications:vi.fn(),
    refreshUnreadCount:vi.fn(),
}))

vi.mock("../features/notifications/notificationsApi",()=>({
    getNotifications:mocks.getNotifications,
}))

vi.mock("../features/notifications/useNotifications",()=>({
    useNotifications:()=>({
        refreshUnreadCount:mocks.refreshUnreadCount,
    }),
}))

vi.mock("../components/notifications/NotificationToast",()=>({
    NotificationToast:({
        notification,
        onDismiss,
    }:{
        notification:Notification
        onDismiss:()=>void
    })=>(
        <div data-testid="notification-toast">
            <p>{notification.title}</p>
            <button
                type="button"
                onClick={onDismiss}
            >
                Dismiss toast
            </button>
        </div>
    ),
}))

import {NotificationListener} from "../features/notifications/NotificationListener"

const existingNotification:Notification={
    id:"notification-existing",
    type:"REMINDER",
    title:"Existing reminder",
    message:"This notification already existed.",
    sourceType:"REMINDER",
    sourceId:"reminder-existing",
    readAt:null,
    createdAt:"2026-07-26T08:00:00.000Z",
}

const newNotification:Notification={
    id:"notification-new",
    type:"SCORE_CHANGE",
    title:"Your score improved",
    message:"Your financial health score increased.",
    sourceType:"SCORE_EVENT",
    sourceId:"score-event-1",
    readAt:null,
    createdAt:"2026-07-26T09:00:00.000Z",
}

const olderNotification:Notification={
    id:"notification-older",
    type:"REMINDER",
    title:"Payment due tomorrow",
    message:"Your payment is due tomorrow.",
    sourceType:"REMINDER",
    sourceId:"reminder-older",
    readAt:null,
    createdAt:"2026-07-26T10:00:00.000Z",
}

const newerNotification:Notification={
    id:"notification-newer",
    type:"BADGE_EARNED",
    title:"New badge earned",
    message:"You earned a new badge.",
    sourceType:"BADGE",
    sourceId:"badge-newer",
    readAt:null,
    createdAt:"2026-07-26T11:00:00.000Z",
}

function createResponse(notifications:Notification[]):NotificationsResponse{
    return{
        data:{
            notifications,
            pagination:{
                page:1,
                perPage:20,
                total:notifications.length,
                totalPages:notifications.length===0?0:1,
            },
        },
    }
}

async function renderListener(){
    const result=render(<NotificationListener/>)
    await act(async()=>{
        await Promise.resolve()
        await Promise.resolve()
    })
    return result
}

async function runNextPoll(){
    await act(async()=>{
        vi.advanceTimersByTime(30000)
        await Promise.resolve()
        await Promise.resolve()
    })
}

describe("NotificationListener",()=>{
    beforeEach(()=>{
        vi.useFakeTimers()
        vi.clearAllMocks()
        mocks.refreshUnreadCount.mockResolvedValue(undefined)
    })
    afterEach(()=>{
        cleanup()
        vi.useRealTimers()
    })
    it("does not display existing notifications on the first request",async()=>{
        mocks.getNotifications.mockResolvedValue(
            createResponse([existingNotification]),
        )
        await renderListener()
        expect(
            mocks.getNotifications,
        ).toHaveBeenCalledWith(
            {
                page:1,
                perPage:20,
            },
            expect.any(AbortSignal),
        )
        expect(
            screen.queryByTestId("notification-toast"),
        ).not.toBeInTheDocument()
        expect(
            mocks.refreshUnreadCount,
        ).not.toHaveBeenCalled()
    })
    it("displays a notification returned by a later poll",async()=>{
        mocks.getNotifications
            .mockResolvedValueOnce(
                createResponse([existingNotification]),
            )
            .mockResolvedValueOnce(
                createResponse([
                    newNotification,
                    existingNotification,
                ]),
            )
        await renderListener()
        expect(
            screen.queryByTestId("notification-toast"),
        ).not.toBeInTheDocument()
        await runNextPoll()
        expect(
            screen.getByTestId("notification-toast"),
        ).toBeInTheDocument()
        expect(
            screen.getByText("Your score improved"),
        ).toBeInTheDocument()
        expect(
            mocks.refreshUnreadCount,
        ).toHaveBeenCalledTimes(1)
    })
    it("does not display the same notification more than once",async()=>{
        mocks.getNotifications
            .mockResolvedValueOnce(
                createResponse([existingNotification]),
            )
            .mockResolvedValueOnce(
                createResponse([
                    newNotification,
                    existingNotification,
                ]),
            )
            .mockResolvedValueOnce(
                createResponse([
                    newNotification,
                    existingNotification,
                ]),
            )
        await renderListener()
        await runNextPoll()
        expect(
            screen.getByText("Your score improved"),
        ).toBeInTheDocument()
        fireEvent.click(
            screen.getByRole("button",{
                name:"Dismiss toast",
            }),
        )
        expect(
            screen.queryByTestId("notification-toast"),
        ).not.toBeInTheDocument()
        await runNextPoll()
        expect(
            screen.queryByTestId("notification-toast"),
        ).not.toBeInTheDocument()
        expect(
            mocks.refreshUnreadCount,
        ).toHaveBeenCalledTimes(1)
    })
    it("queues multiple new notifications in creation order",async()=>{
        mocks.getNotifications
            .mockResolvedValueOnce(
                createResponse([]),
            )
            .mockResolvedValueOnce(
                createResponse([
                    newerNotification,
                    olderNotification,
                ]),
            )
        await renderListener()
        await runNextPoll()
        expect(
            screen.getByText("Payment due tomorrow"),
        ).toBeInTheDocument()
        expect(
            screen.queryByText("New badge earned"),
        ).not.toBeInTheDocument()
        fireEvent.click(
            screen.getByRole("button",{
                name:"Dismiss toast",
            }),
        )
        expect(
            screen.getByText("New badge earned"),
        ).toBeInTheDocument()
        expect(
            screen.queryByText("Payment due tomorrow"),
        ).not.toBeInTheDocument()
        expect(
            mocks.refreshUnreadCount,
        ).toHaveBeenCalledTimes(1)
    })
    it("refreshes the unread count only when new notifications arrive",async()=>{
        mocks.getNotifications
            .mockResolvedValueOnce(
                createResponse([existingNotification]),
            )
            .mockResolvedValueOnce(
                createResponse([existingNotification]),
            )
            .mockResolvedValueOnce(
                createResponse([
                    newNotification,
                    existingNotification,
                ]),
            )
        await renderListener()
        expect(
            mocks.refreshUnreadCount,
        ).not.toHaveBeenCalled()
        await runNextPoll()
        expect(
            mocks.refreshUnreadCount,
        ).not.toHaveBeenCalled()
        await runNextPoll()
        expect(
            mocks.refreshUnreadCount,
        ).toHaveBeenCalledTimes(1)
    })
    it("continues polling after an API failure",async()=>{
        const consoleError=vi.spyOn(
            console,
            "error",
        ).mockImplementation(()=>undefined)
        mocks.getNotifications
            .mockRejectedValueOnce(
                new Error("Request failed"),
            )
            .mockResolvedValueOnce(
                createResponse([existingNotification]),
            )
            .mockResolvedValueOnce(
                createResponse([
                    newNotification,
                    existingNotification,
                ]),
            )
        await renderListener()
        expect(
            consoleError,
        ).toHaveBeenCalledWith(
            "Could not check for new notifications.",
            expect.any(Error),
        )
        expect(
            screen.queryByTestId("notification-toast"),
        ).not.toBeInTheDocument()
        await runNextPoll()
        expect(
            screen.queryByTestId("notification-toast"),
        ).not.toBeInTheDocument()
        await runNextPoll()
        expect(
            screen.getByText("Your score improved"),
        ).toBeInTheDocument()
        consoleError.mockRestore()
    })
    it("does not start another request while one is pending",async()=>{
        let resolveRequest!:(response:NotificationsResponse)=>void
        const pendingRequest=new Promise<NotificationsResponse>((resolve)=>{
            resolveRequest=resolve
        })
        mocks.getNotifications.mockReturnValue(
            pendingRequest,
        )
        const result=render(<NotificationListener/>)
        await act(async()=>{
            await Promise.resolve()
        })
        expect(
            mocks.getNotifications,
        ).toHaveBeenCalledTimes(1)
        await runNextPoll()
        await runNextPoll()
        expect(
            mocks.getNotifications,
        ).toHaveBeenCalledTimes(1)
        await act(async()=>{
            resolveRequest(
                createResponse([existingNotification]),
            )
            await pendingRequest
        })
        result.unmount()
    })

    it("aborts the request and stops polling when unmounted",async()=>{
        mocks.getNotifications.mockResolvedValue(
            createResponse([existingNotification]),
        )
        const {unmount}=await renderListener()
        const signal=mocks.getNotifications.mock.calls[0][1] as AbortSignal
        expect(signal.aborted).toBe(false)
        unmount()
        expect(signal.aborted).toBe(true)
        await act(async()=>{
            vi.advanceTimersByTime(60000)
            await Promise.resolve()
        })
        expect(
            mocks.getNotifications,
        ).toHaveBeenCalledTimes(1)
    })
})