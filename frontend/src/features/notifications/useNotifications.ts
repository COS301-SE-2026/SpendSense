import * as React from "react"
import { NotificationsContext } from "./NotificationContextCore"

export function useNotifications(){
    const context=React.useContext(NotificationsContext)
    if(!context){
        throw new Error("useNotifications must be used within NotificationsProvider")
    }
    return context
}