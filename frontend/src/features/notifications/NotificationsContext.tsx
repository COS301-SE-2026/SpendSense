import * as React from "react"
import {getNotifications} from "./notificationsApi"
import { NotificationsContext } from "./NotificationContextCore"

export function NotificationsProvider({
    children,
}:{
    children:React.ReactNode
}){
    const [unreadCount,setUnreadCount]=React.useState(0)
    const [unreadLoaded,setUnreadLoaded]=React.useState(false)
    const [unreadLoading,setUnreadLoading]=React.useState(false)
    const refreshUnreadCount=React.useCallback(async()=>{
        setUnreadLoading(true)
        try{
            const response=await getNotifications({
                unreadOnly:true,
                page:1,
                perPage:1,
            })
            setUnreadCount(response.data.pagination.total)
            setUnreadLoaded(true)
        }catch(error){
            console.error(
                "Could not load unread notification count.",
                error,
            )
            setUnreadLoaded(false)
        }finally{
            setUnreadLoading(false)
        }
    },[])
    const decreaseUnreadCount=React.useCallback(()=>{
        setUnreadCount((current)=>Math.max(0,current-1))
    },[])
    const clearUnreadCount=React.useCallback(()=>{
        setUnreadCount(0)
        setUnreadLoaded(false)
    },[])
    return(
        <NotificationsContext.Provider value={{
            unreadCount,
            unreadLoaded,
            unreadLoading,
            refreshUnreadCount,
            decreaseUnreadCount,
            clearUnreadCount,
        }}>
            {children}
        </NotificationsContext.Provider>
    )
}