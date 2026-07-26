import * as React from "react"
import {useNavigate} from "react-router-dom"
import {
    AlertTriangle,
    Award,
    Banknote,
    Calendar,
    Gift,
    Info,
    TrendingUp,
} from "lucide-react"
import {CustomCard} from "@/components/ui/CustomCard"
import {IconButton} from "@/components/common/IconButton"
import {
    getNotifications,
    markAsRead,
} from "@/features/notifications/notificationsApi"
import { useNotifications } from "@/features/notifications/useNotifications"
import {cn} from "@/lib/utils"
import type {
    Notification,
    NotificationPagination,
    NotifType,
} from "@/types/NotificationTypes"

const PER_PAGE=10

const TYPE_OPTIONS:{value:NotifType;label:string}[]=[
    {value:"REMINDER",label:"Reminders"},
    {value:"PAYMENT_STATUS",label:"Payment status"},
    {value:"SCORE_CHANGE",label:"Score changes"},
    {value:"BADGE_EARNED",label:"Badges"},
    {value:"REWARD",label:"Rewards"},
    {value:"SYSTEM",label:"System"},
]

export default function NotificationsPage(){
    const nav=useNavigate()
    const {
        unreadCount,
        unreadLoaded,
        unreadLoading,
        refreshUnreadCount,
        decreaseUnreadCount,
    }=useNotifications()

    const [notifications,setNotifications]=React.useState<Notification[]>([])
    const [pagination,setPagination]=React.useState<NotificationPagination>({
        page:1,
        perPage:PER_PAGE,
        total:0,
        totalPages:0,
    })
    const [unreadOnly,setUnreadOnly]=React.useState(false)
    const [selectedType,setSelectedType]=React.useState<NotifType|"">("")
    const [page,setPage]=React.useState(1)
    const [loading,setLoading]=React.useState(true)
    const [err,setErr]=React.useState<string|null>(null)
    const [markError,setMarkError]=React.useState<string|null>(null)
    const [markingId,setMarkingId]=React.useState<string|null>(null)

    const requestNotifications=React.useCallback((signal?:AbortSignal)=>{
        return getNotifications({
            unreadOnly:unreadOnly||undefined,
            type:selectedType||undefined,
            page,
            perPage:PER_PAGE,
        },signal)
    },[page,selectedType,unreadOnly])

    React.useEffect(()=>{
        void refreshUnreadCount()
    },[refreshUnreadCount])

    React.useEffect(()=>{
        const controller=new AbortController()
        requestNotifications(controller.signal)
            .then((response)=>{
                if(controller.signal.aborted){
                    return
                }
                setNotifications(response.data.notifications)
                setPagination(response.data.pagination)
                setErr(null)
            })
            .catch((error:unknown)=>{
                if(controller.signal.aborted){
                    return
                }
                if(isAuthenticationError(error)){
                    nav("/login",{replace:true})
                    return
                }
                console.error("getNotifications error: ",error)
                setErr("Could not load your notifications.")
            })
            .finally(()=>{
                if(!controller.signal.aborted){
                    setLoading(false)
                }
            })
        return()=>{
            controller.abort()
        }
    },[nav,requestNotifications])
    function beginReload(){
        setLoading(true)
        setErr(null)
    }
    async function retryNotifications(){
        beginReload()
        try{
            const response=await requestNotifications()
            setNotifications(response.data.notifications)
            setPagination(response.data.pagination)
            setErr(null)
        }catch(error){
            if(isAuthenticationError(error)){
                nav("/login",{replace:true})
                return
            }
            console.error("getNotifications error: ",error)
            setErr("Could not load your notifications.")
        }finally{
            setLoading(false)
        }
    }
    function changePage(nextPage:number){
        beginReload()
        setPage(nextPage)
    }

    function handleUnreadFilter(){
        beginReload()
        setPage(1)
        setUnreadOnly((current)=>!current)
    }

    function handleTypeFilter(event:React.ChangeEvent<HTMLSelectElement>){
        beginReload()
        setPage(1)
        setSelectedType(event.target.value as NotifType|"")
    }

    async function handleRowClick(notification:Notification){
        if(notification.readAt||markingId!==null){
            return
        }

        setMarkingId(notification.id)
        setMarkError(null)

        try{
            const response=await markAsRead(notification.id)

            decreaseUnreadCount()

            if(unreadOnly){
                setNotifications((current)=>current.filter(
                    (item)=>item.id!==notification.id,
                ))

                setPagination((current)=>{
                    const total=Math.max(0,current.total-1)

                    return{
                        ...current,
                        total,
                        totalPages:Math.ceil(total/current.perPage),
                    }
                })

                if(notifications.length===1&&page>1){
                    setPage((current)=>current-1)
                }
            }else{
                setNotifications((current)=>current.map((item)=>
                    item.id===notification.id
                        ?{
                            ...item,
                            readAt:response.data.readAt,
                        }
                        :item,
                ))
            }
        }catch(error){
            if(isAuthenticationError(error)){
                nav("/login",{replace:true})
                return
            }

            console.error("markAsRead error: ",error)
            setMarkError(
                "Could not mark the notification as read. Please try again.",
            )
        }finally{
            setMarkingId(null)
        }
    }

    const filtersActive=unreadOnly||selectedType!==""
    const totalPages=Math.max(1,pagination.totalPages)

    return(
        <div className="min-h-screen bg-[#f4fbf7] pb-10">
            <div className="mx-auto w-full max-w-md px-5 pt-6">
                <header className="flex items-center justify-between">
                    <IconButton
                        IconVariant="iconBack"
                        aria-label="Go back"
                        onClick={()=>nav(-1)}
                    />

                    <h1 className="text-lg font-bold text-[#091828]">
                        Notifications
                    </h1>

                    <div className="size-10"/>
                </header>

                <div className="mt-6">
                    {unreadLoading&&!unreadLoaded?(
                        <p className="text-sm font-semibold text-[#6b6375]">Loading unread notifications...</p>
                    ):unreadLoaded&&unreadCount===0?(
                        <div>
                            <p className="font-bold text-[#091828]">You're all caught up</p>
                            <p className="mt-0.5 text-sm text-[#6b6375]">All your notifications have been read.</p>
                        </div>
                    ):unreadLoaded?(
                        <p className="text-sm font-semibold text-[#6b6375]">
                            {unreadCount} unread {unreadCount===1?"notification":"notifications"}
                        </p>
                    ):(
                        <p className="text-sm font-semibold text-[#6b6375]">Unread count unavailable</p>
                    )}
                </div>

                <section
                    aria-label="Notification filters"
                    className="mt-4 flex items-center gap-3"
                >
                    <button
                        type="button"
                        aria-pressed={unreadOnly}
                        onClick={handleUnreadFilter}
                        className={cn(
                            "rounded-full border px-4 py-2 text-sm font-semibold transition",
                            unreadOnly
                                ?"border-[#ac2a5d] bg-[#ffd8e6] text-[#ac2a5d]"
                                :"border-[#d4ded9] bg-white text-[#091828]",
                        )}
                    >
                        Unread only
                    </button>

                    <label className="flex-1">
                        <span className="sr-only">
                            Notification type
                        </span>

                        <select
                            aria-label="Notification type"
                            value={selectedType}
                            onChange={handleTypeFilter}
                            className="w-full rounded-full border border-[#d4ded9] bg-white px-4 py-2 text-sm font-semibold text-[#091828]"
                        >
                            <option value="">All types</option>

                            {TYPE_OPTIONS.map((option)=>(
                                <option
                                    key={option.value}
                                    value={option.value}
                                >
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>
                </section>

                {err&&(
                    <div className="mt-6 flex items-center gap-3 rounded-2xl border-2 border-[#ac2a5d] bg-[#ffd9e1] px-4 py-3">
                        <AlertTriangle className="size-4 shrink-0 text-[#ac2a5d]"/>

                        <div className="flex-1">
                            <p className="text-sm font-semibold text-[#ac2a5d]">
                                {err}
                            </p>

                            <button
                                type="button"
                                onClick={()=>void retryNotifications()}
                                className="mt-1 text-sm font-bold text-[#091828] underline"
                            >
                                Try again
                            </button>
                        </div>
                    </div>
                )}

                {markError&&(
                    <div
                        role="alert"
                        className="mt-4 flex items-center gap-2 rounded-2xl border border-[#ac2a5d] bg-[#ffd9e1] px-4 py-3"
                    >
                        <AlertTriangle className="size-4 shrink-0 text-[#ac2a5d]"/>

                        <p className="text-sm font-semibold text-[#ac2a5d]">
                            {markError}
                        </p>
                    </div>
                )}

                {loading&&(
                    <div
                        aria-label="Loading notifications"
                        className="mt-6 space-y-3"
                    >
                        {[1,2,3,4].map((item)=>(
                            <div
                                key={item}
                                className="h-16 animate-pulse rounded-xl bg-[#d9ede7]"
                            />
                        ))}
                    </div>
                )}

                {!loading&&!err&&notifications.length===0&&(
                    <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
                        <p className="font-bold text-[#091828]">
                            {filtersActive
                                ?"No matching notifications"
                                :"You're caught up"}
                        </p>

                        <p className="max-w-xs text-sm text-[#6b6375]">
                            {filtersActive
                                ?"No notifications matched the selected filters."
                                :"You do not have any notifications yet."}
                        </p>
                    </div>
                )}

                {!loading&&!err&&notifications.length>0&&(
                    <>
                        <CustomCard className="mt-6 rounded-3xl bg-white shadow-sm">
                            {notifications.map((notification)=>(
                                <NotificationRow
                                    key={notification.id}
                                    notification={notification}
                                    pending={markingId===notification.id}
                                    onClick={()=>void handleRowClick(notification)}
                                />
                            ))}
                        </CustomCard>

                        {pagination.totalPages>1&&(
                            <div className="mt-5 flex items-center justify-between">
                                <button
                                    type="button"
                                    disabled={page<=1||loading}
                                    onClick={()=>changePage(page-1)}
                                    className="rounded-full border border-[#d4ded9] bg-white px-4 py-2 text-sm font-semibold text-[#091828] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                <p className="text-sm font-semibold text-[#6b6375]">
                                    Page {page} of {totalPages}
                                </p>
                                <button
                                    type="button"
                                    disabled={page>=pagination.totalPages||loading}
                                    onClick={()=>changePage(page+1)}
                                    className="rounded-full border border-[#d4ded9] bg-white px-4 py-2 text-sm font-semibold text-[#091828] disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

const ICON_TYPE:Record<NotifType,React.ReactNode>={
    REWARD:<Gift className="size-4"/>,
    PAYMENT_STATUS:<Banknote className="size-4"/>,
    SYSTEM:<Info className="size-4"/>,
    SCORE_CHANGE:<TrendingUp className="size-4"/>,
    REMINDER:<Calendar className="size-4"/>,
    BADGE_EARNED:<Award className="size-4"/>,
}

const TONE_TYPE:Record<NotifType,string>={
    REWARD:"bg-[#ffe9b5] text-[#7a5a00]",
    PAYMENT_STATUS:"bg-[#e8e4f4] text-[#5b4d8b]",
    SYSTEM:"bg-[#0a1929] text-white",
    SCORE_CHANGE:"bg-[#dcefe8] text-[#091828]",
    REMINDER:"bg-[#ffe9b5] text-[#7a5a00]",
    BADGE_EARNED:"bg-[#ffd8e6] text-[#ac2a5d]",
}

function NotificationRow({
    notification,
    pending,
    onClick,
}:{
    notification:Notification
    pending:boolean
    onClick:()=>void
}){
    const unread=notification.readAt===null

    return(
        <button
            type="button"
            disabled={pending}
            onClick={onClick}
            aria-label={`${notification.title}${unread?", unread":""}`}
            className={cn(
                "flex w-full items-start gap-3 border-b border-[#e8e4f4] px-3 py-3 text-left transition last:border-b-0 hover:bg-[#f4fbf7]",
                unread?"bg-[#fbfefc]":"bg-white",
                pending&&"cursor-wait opacity-60",
            )}
        >
            <div
                className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    TONE_TYPE[notification.type],
                )}
            >
                {ICON_TYPE[notification.type]}
            </div>

            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    {unread&&(
                        <span className="size-1.5 shrink-0 rounded-full bg-[#ac2a5d]"/>
                    )}

                    <p
                        className={cn(
                            "truncate text-sm text-[#091828]",
                            unread?"font-bold":"font-semibold",
                        )}
                    >
                        {notification.title}
                    </p>
                </div>

                <p className="mt-0.5 text-sm text-[#6b6375]">
                    {notification.message}
                </p>
            </div>

            <span className="shrink-0 text-[11px] font-medium text-[#6b6375]">
                {pending?"Updating...":formatTime(notification.createdAt)}
            </span>
        </button>
    )
}

function formatTime(date:string){
    const notificationDate=new Date(date)

    if(Number.isNaN(notificationDate.getTime())){
        return ""
    }

    const differenceMs=Date.now()-notificationDate.getTime()
    const mins=Math.max(0,Math.floor(differenceMs/60000))

    if(mins<1){
        return "now"
    }

    if(mins<60){
        return `${mins}m ago`
    }

    const hours=Math.floor(mins/60)

    if(hours<24){
        return `${hours}h ago`
    }

    const days=Math.floor(hours/24)

    if(days<7){
        return `${days}d ago`
    }

    const currentYear=new Date().getFullYear()
    const includeYear=notificationDate.getFullYear()!==currentYear
    return new Intl.DateTimeFormat("en-ZA",{
        day:"numeric",
        month:"short",
        year:includeYear?"numeric":undefined,
    }).format(notificationDate)
}

function isAuthenticationError(error:unknown){
    return typeof error==="object"&&error!==null&&"statusCode" in error&&(error as {statusCode?:number}).statusCode===401
}