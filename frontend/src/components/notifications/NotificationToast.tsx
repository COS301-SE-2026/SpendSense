import * as React from "react"
import {Bell,X} from "lucide-react"
import {useNavigate} from "react-router-dom"
import type {Notification} from "@/types/NotificationTypes"

type NotificationToastProps={
    notification:Notification
    onDismiss:()=>void
    durationMs?:number
}

export function NotificationToast({
    notification,
    onDismiss,
    durationMs=5000,
}:NotificationToastProps){
    const navigate=useNavigate()
    React.useEffect(()=>{
        const timeoutId=window.setTimeout(()=>{
            onDismiss()
        },durationMs)
        return()=>{
            window.clearTimeout(timeoutId)
        }
    },[durationMs,notification.id,onDismiss])
    function openNotifications(){
        onDismiss()
        navigate("/notifications")
    }
    return(
        <div
            role="status"
            aria-live="polite"
            data-testid="notification-toast"
            className="fixed left-1/2 top-5 z-50 flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 items-start gap-3 rounded-2xl border border-[#d9ede7] bg-white p-4 shadow-lg"
        >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#ffd8e6] text-[#ac2a5d]">
                <Bell className="size-5"/>
            </div>
            <button
                type="button"
                onClick={openNotifications}
                className="min-w-0 flex-1 text-left"
            >
                <p className="text-xs font-bold uppercase tracking-wide text-[#ac2a5d]">New notification</p>
                <p className="mt-1 font-bold text-[#091828]">{notification.title}</p>
                <p className="mt-1 text-sm text-[#6b6375]">{notification.message}</p>
                <p className="mt-2 text-xs font-bold text-[#ac2a5d]">View notifications</p>
            </button>
            <button
                type="button"
                aria-label="Dismiss notification"
                onClick={onDismiss}
                className="flex size-8 shrink-0 items-center justify-center rounded-full text-[#6b6375] transition hover:bg-[#f4fbf7] hover:text-[#091828]"
            >
                <X className="size-4"/>
            </button>
        </div>
    )
}