import * as React from "react"

export type NotificationsContextValue={
    unreadCount:number
    unreadLoaded:boolean
    unreadLoading:boolean
    refreshUnreadCount:()=>Promise<void>
    decreaseUnreadCount:()=>void
    clearUnreadCount:()=>void
}

export const NotificationsContext=React.createContext<NotificationsContextValue|null>(null)