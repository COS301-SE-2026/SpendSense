export type NotifType = "REMINDER"|"SCORE_CHANGE"|"BADGE_EARNED"|"SYSTEM"|"PAYMENT_STATUS"|"REWARD"

export interface Notification{
    id: string
    title: string
    type: NotifType
    readAt: string|null
    createdAt: string
    message: string
    
}