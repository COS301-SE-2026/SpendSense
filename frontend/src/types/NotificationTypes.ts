export type NotifType = "REMINDER"|"SCORE_CHANGE"|"BADGE_EARNED"|"SYSTEM"|"PAYMENT_STATUS"|"REWARD"|"WAGER_INVITE"

export interface Notification{
    id: string
    title: string
    type: NotifType
    readAt: string|null
    createdAt: string
    message: string
    sourceType:string|null
    sourceId:string|null
}
export interface NotificationFilters{
    unreadOnly?:boolean
    type?:NotifType
    page?:number
    perPage?:number
}
export interface NotificationPagination{
    page:number
    perPage:number
    total:number
    totalPages:number
}

export interface NotificationsResult{
    notifications:Notification[]
    pagination:NotificationPagination
}

export interface NotificationsResponse{
    data:NotificationsResult
}

export interface NotificationResponse{
    data:Notification
}