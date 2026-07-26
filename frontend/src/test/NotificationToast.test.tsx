import React from "react"
import {act,render,screen} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import {MemoryRouter,Route,Routes} from "react-router-dom"
import {afterEach,describe,expect,it,vi} from "vitest"
import "@testing-library/jest-dom"
import {NotificationToast} from "../components/notifications/NotificationToast"
import type {Notification} from "../types/NotificationTypes"

const notification:Notification={
    id:"notification-1",
    type:"REMINDER",
    title:"Netflix payment due",
    message:"Your Netflix payment is due tomorrow.",
    sourceType:"REMINDER",
    sourceId:"reminder-1",
    readAt:null,
    createdAt:"2026-07-26T10:00:00.000Z",
}

function renderToast(
    onDismiss=vi.fn(),
    durationMs=5000,
){
    return{
        onDismiss,
        ...render(
            <MemoryRouter initialEntries={["/dashboard"]}>
                <Routes>
                    <Route
                        path="/dashboard"
                        element={
                            <NotificationToast
                                notification={notification}
                                onDismiss={onDismiss}
                                durationMs={durationMs}
                            />
                        }
                    />
                    <Route
                        path="/notifications"
                        element={<div>Notifications page</div>}
                    />
                </Routes>
            </MemoryRouter>,
        ),
    }
}

describe("NotificationToast",()=>{
    afterEach(()=>{
        vi.useRealTimers()
    })
    it("shows the notification title and message",()=>{
        renderToast()
        expect(screen.getByText("New notification")).toBeInTheDocument()
        expect(screen.getByText("Netflix payment due")).toBeInTheDocument()
        expect(screen.getByText("Your Netflix payment is due tomorrow.")).toBeInTheDocument()
    })
    it("opens the notifications page when selected",async()=>{
        const user=userEvent.setup()
        const {onDismiss}=renderToast()
        await user.click(
            screen.getByRole("button",{
                name:/Netflix payment due/i,
            }),
        )
        expect(onDismiss).toHaveBeenCalledTimes(1)
        expect(screen.getByText("Notifications page")).toBeInTheDocument()
    })
    it("dismisses the toast when the close button is selected",async()=>{
        const user=userEvent.setup()
        const {onDismiss}=renderToast()
        await user.click(
            screen.getByRole("button",{
                name:"Dismiss notification",
            }),
        )
        expect(onDismiss).toHaveBeenCalledTimes(1)
        expect(screen.queryByText("Notifications page")).not.toBeInTheDocument()
    })
    it("automatically dismisses after the specified duration",()=>{
        vi.useFakeTimers()
        const {onDismiss}=renderToast(vi.fn(),5000)
        expect(onDismiss).not.toHaveBeenCalled()
        act(()=>{vi.advanceTimersByTime(4999)})
        expect(onDismiss).not.toHaveBeenCalled()
        act(()=>{ vi.advanceTimersByTime(1)})
        expect(onDismiss).toHaveBeenCalledTimes(1)
    })
    it("clears the dismissal timer when unmounted",()=>{
        vi.useFakeTimers()
        const onDismiss=vi.fn()
        const {unmount}=renderToast(onDismiss,5000)
        unmount()
        act(()=>{vi.advanceTimersByTime(5000)})
        expect(onDismiss).not.toHaveBeenCalled()
    })
})