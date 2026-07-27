import * as React from 'react'
import {useNavigate} from 'react-router-dom'
import {IconButton} from '../common/IconButton'
import { useNotifications } from '@/features/notifications/useNotifications'

export function NotificationBell(){
    const navigate=useNavigate()
    const{
        unreadCount,
        unreadLoaded,
        refreshUnreadCount,
    }=useNotifications()
    React.useEffect(()=>{
        void refreshUnreadCount()
    },[refreshUnreadCount])
    return(
        <div className="relative">
            <IconButton
                IconVariant="iconNotif"
                aria-label={unreadLoaded?`Notifications, ${unreadCount} unread`:'Notifications'}
                onClick={()=>navigate('/notifications')}
            />
            {unreadLoaded&&unreadCount>0&&(
                <span
                    data-testid="notification-count"
                    className="pointer-events-none absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-[#FF6B9D] px-1 text-[10px] font-bold leading-5 text-white ring-2 ring-[#F4FBF7]"
                >
                    {unreadCount>99?'99+':unreadCount}
                </span>
            )}
        </div>
    )
}