import * as React from "react"
import {NotificationToast} from "@/components/notifications/NotificationToast"
import {getNotifications} from "./notificationsApi"
import { useNotifications } from "./useNotifications"
import type {Notification} from "@/types/NotificationTypes"

const POLL_INTERVAL_MS=30000
const POLL_PAGE_SIZE=20

// const TEST_NOTIFICATION:Notification={
//     id:"test-notification",
//     type:"REMINDER",
//     title:"Test payment reminder",
//     message:"Your Netflix payment is due tomorrow.",
//     sourceType:"REMINDER",
//     sourceId:"test-reminder",
//     readAt:null,
//     createdAt:new Date().toISOString(),
// }

export function NotificationListener(){
    const {refreshUnreadCount}=useNotifications()
    const [visibleNotification,setVisibleNotification]=React.useState<Notification|null>(null)
    const seenIdsRef=React.useRef<Set<string>>(new Set())
    const queuedNotificationsRef=React.useRef<Notification[]>([])
    const initialLoadCompleteRef=React.useRef(false)
    const requestPendingRef=React.useRef(false)
    const showNextNotification=React.useCallback(()=>{
        setVisibleNotification((current)=>{
            if(current){
                return current
            }

            return queuedNotificationsRef.current.shift()??null
        })
    },[])
    const checkForNotifications=React.useCallback(
        async(signal?:AbortSignal)=>{
            if(requestPendingRef.current){
                return
            }
            requestPendingRef.current=true
            try{
                const response=await getNotifications({
                    page:1,
                    perPage:POLL_PAGE_SIZE,
                },signal)
                const notifications=response.data.notifications
                if(!initialLoadCompleteRef.current){
                    notifications.forEach((notification)=>{
                        seenIdsRef.current.add(notification.id)
                    })
                    initialLoadCompleteRef.current=true
                    return
                }
                const newNotifications=notifications.filter(
                    (notification)=>
                        !seenIdsRef.current.has(notification.id),
                )
                notifications.forEach((notification)=>{
                    seenIdsRef.current.add(notification.id)
                })
                if(newNotifications.length===0){
                    return
                }
                const orderedNotifications=[...newNotifications].sort((first,second)=>new Date(first.createdAt).getTime()-new Date(second.createdAt).getTime())
                queuedNotificationsRef.current.push(...orderedNotifications)
                showNextNotification()
                await refreshUnreadCount()
            }catch(error){
                if(signal?.aborted){
                    return
                }
                console.error(
                    "Could not check for new notifications.",
                    error,
                )
            }finally{
                requestPendingRef.current=false
            }
        },
        [refreshUnreadCount,showNextNotification],
    )
    React.useEffect(()=>{
        const controller=new AbortController()
        void checkForNotifications(controller.signal)
        const intervalId=window.setInterval(()=>{
            void checkForNotifications(controller.signal)
        },POLL_INTERVAL_MS)
        return()=>{
            controller.abort()
            window.clearInterval(intervalId)
        }
    },[checkForNotifications])
    const dismissNotification=React.useCallback(()=>{
        setVisibleNotification(queuedNotificationsRef.current.shift()??null)
    },[])
    if(!visibleNotification){
        return null
    }
    return(
        <NotificationToast
            notification={visibleNotification}
            onDismiss={dismissNotification}
        />
    )
    //testing for popup
    // if(!visibleNotification){
    //     if(!import.meta.env.DEV){
    //         return null
    //     }
    //     return(
    //         <button
    //             type="button"
    //             onClick={()=>setVisibleNotification(TEST_NOTIFICATION)}
    //             className="fixed bottom-5 right-5 z-50 rounded-full bg-[#ac2a5d] px-4 py-2 text-sm font-bold text-white shadow-lg"
    //         >
    //             Test notification
    //         </button>
    //     )
    // }
    // return(
    //     <NotificationToast
    //         notification={visibleNotification}
    //         onDismiss={dismissNotification}
    //     />
    // )
}