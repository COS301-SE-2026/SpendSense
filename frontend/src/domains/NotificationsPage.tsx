import * as React from "react"
import { useNavigate } from "react-router-dom"
import { AlertTriangle, Gift, Banknote, Info, TrendingUp, Calendar, Award } from "lucide-react"
import { CustomCard } from "@/components/ui/CustomCard"
import { IconButton } from "@/components/common/IconButton"
import { markAsRead, getNotifications } from "@/features/notifications/notificationsApi"
import { cn } from "@/lib/utils"
import type { NotifType, Notification } from "@/types/NotificationTypes"

export default function NotificationsPage(){
    const nav = useNavigate()

    const [notifications, setNotifications] = React.useState<Notification[]>([])
    const [err, setErr] = React.useState<string|null>(null)
    const [loading, setLoading] = React.useState(true)


    async function loadNotifications(){
        try{
            // getNotifications must still be added to notificationsApi.ts
            const resp = (await getNotifications()) as {data: Notification[]}
            setNotifications(resp.data)
            setErr(null)
        }

        catch(error){
            console.error("getNotifications error: ", error)
            setErr("Could not load your notifications.")
        }

        finally{
            setLoading(false)
        }
    }

    React.useEffect(()=>{
        async function load(){
            try{
                const response = (await getNotifications()) as {data: Notification[]}
                setNotifications(response.data)
                setErr(null)
            }

            catch(error){
                console.error("getNotifications error: ", error)
                setErr("Could not load notifications.")
            }

            finally{
                setLoading(false)
            }
        }

        load()
    },[])

    // so below is based on the comment in the notificationsApi.ts; so readAt is set server side, call markAsRead, and then refetch from server

    async function handleRowClick(notif: Notification){
        if(notif.readAt){
            return
        }

        try{
            await markAsRead(notif.id)
            await loadNotifications()
        }

        catch(error){
            console.error("markAsRead error: ", error)
        }
    }


    return(
        <div className="bg-[#f4fbf7] pb-10 min-h-screen">
            <div className="w-full max-w-md mx-auto px-5 pt-6">

                <header className="items-center flex justify-between">
                    <IconButton IconVariant="iconBack" aria-label="Go back" onClick={()=>nav(-1)}/>
                    <h1 className="font-bold text-lg text-[#091828]">Notifications</h1>
                    <div className="size-10"/>
                </header>

                {err && (
                    <div className="flex mt-6 items-center rounded-2xl gap-2 border-2 border-[#ac2a5d] bg-[#ffd9e1] px-4 py-3">
                        <AlertTriangle className="shrink-0 size-4 text-[#ac2a5d]"/>
                        <p className="font-semibold text-sm text-[#ac2a5d]">{err}</p>
                    </div>
                )}

                {loading && (
                    <div className="space-y-3 mt-6">
                        {[1, 2, 3, 4].map((l)=>(
                            <div key={l} className="rounded-xl h-16 animate-pulse bg-[#d9ede7]"/>
                        ))}
                    </div>
                )}

                {!loading&&!err&&notifications.length === 0 && (
                    <div className="items-center flex flex-col gap-2 justify-center text-center py-20">
                        <p className="font-bold text-[#091828]">You're caught up</p>
                        <p className="max-w-xs text-sm text-[#6b6375]">No notifications yet. New reminders and alerts will show up here.</p>
                    </div>
                )}

                {!loading&&!err&&notifications.length > 0 && (
                    <CustomCard className="bg-white mt-6 rounded-3xl shadow-sm">
                        {notifications.map((notif)=>(
                            <NotificationRow key={notif.id} notification={notif} onClick={()=>handleRowClick(notif)}/>
                        ))}
                    </CustomCard>
                )}

            </div>
        </div>
    )
}


const ICON_TYPE: Record<NotifType, React.ReactNode>={
    REWARD: <Gift className="size-4"/>,
    PAYMENT_STATUS: <Banknote className="size-4"/>,
    SYSTEM: <Info className="size-4"/>,
    SCORE_CHANGE: <TrendingUp className="size-4"/>,
    REMINDER: <Calendar className="size-4"/>,
    BADGE_EARNED: <Award className="size-4"/>,
}

const TONE_TYPE: Record<NotifType, string>={
    REWARD: "text-[#7a5a00] bg-[#ffe9b5]",
    PAYMENT_STATUS: "text-[#5b4d8b] bg-[#e8e4f4]",
    SYSTEM: "text-white bg-[#0a1929]",
    SCORE_CHANGE: "text-[#091828] bg-[#dcefe8]",
    REMINDER: "text-[#7a5a00] bg-[#ffe9b5]",
    BADGE_EARNED: "text-[#ac2a5d] bg-[#ffd8e6]",
}

function NotificationRow({notification, onClick}:{notification: Notification, onClick: ()=>void}){
    const unread = !notification.readAt

    return(
        <button
            onClick={onClick}
            type="button"
            className={cn("items-start flex w-full px-3 py-3 gap-3 text-left border-b border-[#e8e4f4] last:border-b-0 transition", unread? "bg-[#fbfefc]":"bg-white", "hover:bg-[#f4fbf7]")}
        >
            <div className={cn("size-9 shrink-0 flex items-center justify-center rounded-full", TONE_TYPE[notification.type])}>
                {ICON_TYPE[notification.type]}
            </div>

            <div className="flex-1 min-w-0">
                <div className="items-center flex gap-1.5">
                    {unread && <span className="shrink-0 size-1.5 rounded-full bg-[#ac2a5d]"/>}
                    <p className="text-sm text-[#091828] truncate font-bold">{notification.title}</p>
                </div>

                <p className="text-sm text-[#6b6375] mt-0.5">{notification.message}</p>
            </div>

            <span className="text-[11px] text-[#6b6375] shrink-0 font-medium">{formatTime(notification.createdAt)}</span>
        </button>
    )
}

// function for showing the user time that the notification was made
function formatTime(date: string){
    const differenceMs = Date.now() - new Date(date).getTime()
    const mins = Math.floor(differenceMs/60000)

    if(mins < 1){
        return "now"
    }
    if(mins < 60){
        return `${mins}m ago`
    }

    const hours = Math.floor(mins/60)

    if(hours < 24){
        return `${hours}h ago`
    }

    const days = Math.floor(hours/24)

    return `${days}d ago`
}